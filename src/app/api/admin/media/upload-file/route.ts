import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { uploadToBunnyStorage, getResolvedBunnyConfig } from "@/lib/bunny";
import { completeMediaUploadAction } from "@/server/actions/media.actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/upload-file
 *
 * Direct storage upload endpoint for PDFs and Images to Bunny Storage & Bunny CDN.
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
    const mediaId = formData.get("mediaId") as string;
    const storageKey = formData.get("storageKey") as string;

    if (!file || !mediaId) {
      return NextResponse.json(
        { success: false, error: "File and mediaId are required." },
        { status: 400 }
      );
    }

    const bunnyConfig = await getResolvedBunnyConfig();
    const isBunnyActive = Boolean(bunnyConfig.storageZoneName && bunnyConfig.storagePassword && bunnyConfig.cdnHostname);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "application/octet-stream";

    const path = storageKey || `media/files/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    if (isBunnyActive) {
      const result = await uploadToBunnyStorage(path, buffer, contentType);
      const completeRes = await completeMediaUploadAction({
        mediaId,
        storageKey: path,
        storageUrl: result.cdnUrl,
      });

      return NextResponse.json({
        success: true,
        cdnUrl: result.cdnUrl,
        storageKey: path,
        media: completeRes.success ? completeRes.media : null,
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
          Key: path,
          Body: new Uint8Array(buffer),
          ContentType: contentType,
        })
      );

      const completeRes = await completeMediaUploadAction({
        mediaId,
        storageKey: path,
      });

      return NextResponse.json({
        success: true,
        storageKey: path,
        media: completeRes.success ? completeRes.media : null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Bunny Media Storage is not configured. Please complete setup in Admin Settings." },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("Media File Upload Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
