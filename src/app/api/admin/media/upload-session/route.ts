import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import {
  createMediaUploadSessionAction,
  checkDuplicateMediaAction,
  completeMediaUploadAction,
} from "@/server/actions/media.actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/upload-session
 *
 * Authenticated ADMIN endpoint to initiate a media upload session.
 * Generates direct Bunny Stream TUS signatures for videos or initializes storage paths for PDFs/images.
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

    const body = await req.json();
    const { action, mediaId, bunnyVideoId, storageKey, storageUrl, duration, fileName, originalFileName, mediaType, mimeType, fileSize, checksum, pageCount, checkDuplicates } = body;

    // Handle upload completion notification from client
    if (action === "complete" && mediaId) {
      const compResult = await completeMediaUploadAction({
        mediaId,
        bunnyVideoId,
        storageKey,
        storageUrl,
        duration,
      });
      return NextResponse.json(compResult);
    }

    // Check duplicates first if requested
    if (checkDuplicates && (checksum || (fileName && fileSize))) {
      const dupResult = await checkDuplicateMediaAction({ checksum, fileName: originalFileName || fileName, fileSize });
      if (dupResult.exists && dupResult.media) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          existingMedia: dupResult.media,
        });
      }
    }

    const result = await createMediaUploadSessionAction({
      fileName: fileName || originalFileName,
      originalFileName: originalFileName || fileName,
      mediaType: mediaType || "VIDEO",
      mimeType: mimeType || "video/mp4",
      fileSize: fileSize || 0,
      checksum,
      duration,
      pageCount,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Media Upload Session API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to initialize upload session." },
      { status: 500 }
    );
  }
}
