import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getResolvedBunnyConfig, uploadToBunnyStorage } from "@/lib/bunny";

/**
 * POST /api/upload
 *
 * Handles PDF documents, course thumbnails, and image uploads directly to Bunny Storage + Bunny CDN.
 * NOTE: Videos use Direct-to-Bunny TUS upload (/api/bunny/create-upload) and do NOT pass through this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to upload files." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = ((formData.get("category") as string) || "pdf").toLowerCase();
    const courseId = formData.get("courseId") as string;
    const lessonId = formData.get("lessonId") as string | null;

    const isStudentUpload =
      category === "homework" ||
      category === "submission" ||
      category === "student";

    if (!isStudentUpload && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload." },
        { status: 400 }
      );
    }

    // 1. File Size Verification (15MB student, 30MB admin)
    const maxFileSize = isStudentUpload ? 15 * 1024 * 1024 : 30 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, error: `File size exceeds the limit (${isStudentUpload ? "15MB" : "30MB"}).` },
        { status: 400 }
      );
    }

    // 2. Strict Extension & Dangerous File Type Protection
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const dangerousExtensions = ["html", "htm", "svg", "exe", "js", "mjs", "sh", "bat", "cmd", "php", "py", "vbs", "jar", "bin"];
    if (dangerousExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `File type .${ext} is prohibited for security reasons.` },
        { status: 400 }
      );
    }

    const allowedStudentExtensions = ["pdf", "png", "jpg", "jpeg", "webp"];
    if (isStudentUpload && !allowedStudentExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Disallowed student file format (.${ext}). Allowed formats: PDF, PNG, JPG, JPEG, WEBP.` },
        { status: 400 }
      );
    }

    if (category === "pdf" && ext !== "pdf") {
      return NextResponse.json(
        { success: false, error: "Document category requires a .pdf file." },
        { status: 400 }
      );
    }

    // Videos MUST use direct TUS upload to Bunny Stream to bypass server body limits
    if (category === "video") {
      return NextResponse.json(
        {
          success: false,
          error: "Video files must be uploaded directly to Bunny Stream via Direct TUS Upload (/api/bunny/create-upload).",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Magic Bytes Content Signature Validation
    const isValidSignature = (() => {
      if (ext === "pdf") {
        return buffer.subarray(0, 4).toString("ascii") === "%PDF";
      }
      if (ext === "png") {
        return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      }
      if (ext === "jpg" || ext === "jpeg") {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      }
      if (ext === "webp") {
        return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
      }
      return !isStudentUpload;
    })();

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: "File content does not match its claimed file extension." },
        { status: 400 }
      );
    }

    const bunnyConfig = await getResolvedBunnyConfig();
    const isBunnyActive = Boolean(bunnyConfig.storageZoneName && bunnyConfig.storagePassword && bunnyConfig.cdnHostname);

    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = crypto.randomUUID();

    let storagePath: string;
    if (isStudentUpload) {
      storagePath = `homework/${user.id}/${uniqueId}.${ext}`;
    } else if (category === "thumbnail") {
      storagePath = `courses/${courseId || "general"}/thumbnail-${uniqueId}.${ext}`;
    } else if (category === "pdf" && lessonId) {
      storagePath = `courses/${courseId || "general"}/lessons/${lessonId}/doc-${uniqueId}.${ext}`;
    } else {
      storagePath = `courses/${courseId || "general"}/files/${uniqueId}.${ext}`;
    }

    const contentType = file.type || (category === "pdf" ? "application/pdf" : "image/jpeg");

    if (isBunnyActive) {
      const result = await uploadToBunnyStorage(storagePath, buffer, contentType);
      return NextResponse.json({
        success: true,
        key: storagePath,
        url: result.cdnUrl,
        cdnUrl: result.cdnUrl,
        bunnyVideoId: null,
        provider: "BUNNY",
        filename,
        category,
        message: `${filename} uploaded to CDN!`,
      });
    }

    // Fallback to Cloudflare R2 if configured
    const { isR2Configured, r2 } = await import("@/lib/r2");
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    if (isR2Configured()) {
      const bucket = process.env.R2_BUCKET_NAME || "superwarrior30";
      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storagePath,
          Body: new Uint8Array(buffer),
          ContentType: contentType,
        })
      );

      return NextResponse.json({
        success: true,
        key: storagePath,
        url: `https://${process.env.R2_PUBLIC_DOMAIN || "r2.superwarrior30.com"}/${storagePath}`,
        bunnyVideoId: null,
        cdnUrl: null,
        provider: "R2",
        filename,
        category,
        message: `${filename} uploaded to R2 Storage!`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Media Storage is not configured. Please complete the Bunny CDN setup in Admin Settings → Media Storage.",
      },
      { status: 503 }
    );
  } catch (error: unknown) {
    console.error("Bunny Storage Upload API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal upload server error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
