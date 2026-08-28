import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isBunnyStorageConfigured, uploadToBunnyStorage } from "@/lib/bunny";

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

    if (!isBunnyStorageConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bunny Storage is not configured. Please set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, and BUNNY_CDN_HOSTNAME in environment variables.",
        },
        { status: 503 }
      );
    }

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
  } catch (error: unknown) {
    console.error("Bunny Storage Upload API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal upload server error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
