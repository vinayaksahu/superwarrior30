import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { getVideoStatus } from "@/lib/bunny/stream";
import { isBunnyStreamConfigured } from "@/lib/bunny/config";

/**
 * GET /api/bunny/video-status/[guid]
 * Admin-only API to poll Bunny video encoding status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { getResolvedBunnyConfig } = await import("@/lib/bunny/config");
    const bunnyConfig = await getResolvedBunnyConfig();
    if (!bunnyConfig.streamLibraryId || !bunnyConfig.streamApiKey) {
      return NextResponse.json(
        { success: false, error: "Bunny Stream is not configured" },
        { status: 503 }
      );
    }

    const { guid } = await params;
    if (!guid) {
      return NextResponse.json(
        { success: false, error: "Video GUID is required" },
        { status: 400 }
      );
    }

    const status = await getVideoStatus(guid);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: unknown) {
    console.error("Bunny video status error:", error);
    const msg = error instanceof Error ? error.message : "Failed to get video status";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
