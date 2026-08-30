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
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "pdf";
    const courseId = formData.get("courseId") as string;
    const lessonId = formData.get("lessonId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload." },
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

    const bunnyConfig = await getResolvedBunnyConfig();
    const isBunnyActive = Boolean(bunnyConfig.storageZoneName && bunnyConfig.storagePassword && bunnyConfig.cdnHostname);

    const filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const uniqueId = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let storagePath: string;
    if (category === "thumbnail") {
      storagePath = `courses/${courseId}/thumbnail-${uniqueId}.${ext}`;
    } else if (category === "pdf" && lessonId) {
      storagePath = `courses/${courseId}/lessons/${lessonId}/doc-${uniqueId}.${ext}`;
    } else {
      storagePath = `courses/${courseId}/files/${uniqueId}.${ext}`;
    }

    const contentType = file.type || (category === "pdf" ? "application/pdf" : "image/jpeg");

    if (isBunnyActive) {
      const result = await uploadToBunnyStorage(storagePath, buffer, contentType);
      return NextResponse.json({
        success: true,
        key: storagePath,
        bunnyVideoId: null,
        cdnUrl: result.cdnUrl,
        provider: "BUNNY",
        filename,
        category,
        message: `${filename} uploaded to Bunny CDN!`,
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
