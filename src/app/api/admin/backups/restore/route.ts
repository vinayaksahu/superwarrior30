import { NextResponse } from "next/server";
import { restoreFullDatabaseBackupAction } from "@/server/actions/database-backup.actions";
import { requireSuperAdminAction } from "@/server/dal/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireSuperAdminAction();

    const body = await req.json();
    const { backupData, options } = body || {};

    if (!backupData) {
      return NextResponse.json(
        { success: false, error: "Missing backup data payload." },
        { status: 400 }
      );
    }

    const result = await restoreFullDatabaseBackupAction({
      backupData,
      options,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("API Backup restore route error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during restore." },
      { status: 500 }
    );
  }
}
