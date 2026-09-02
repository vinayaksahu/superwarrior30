import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { pollMediaProcessingStatusAction } from "@/server/actions/media.actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/status/[id]
 *
 * Polls transcoding & processing status for a media asset.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Media ID is required." },
        { status: 400 }
      );
    }

    const statusResult = await pollMediaProcessingStatusAction(id);
    return NextResponse.json(statusResult);
  } catch (error: any) {
    console.error("Media Status API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch media status." },
      { status: 500 }
    );
  }
}
