import { NextResponse } from "next/server";
import { exportFullDatabaseBackupAction } from "@/server/actions/database-backup.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await exportFullDatabaseBackupAction();

    if (!result.success || !result.backup) {
      return NextResponse.json(
        { error: result.error || "Failed to generate backup export" },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `superwarrior30_full_backup_${timestamp}.json`;

    return new Response(JSON.stringify(result.backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("API Backup export route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error exporting backup" },
      { status: 500 }
    );
  }
}
