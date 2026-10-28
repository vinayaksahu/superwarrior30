import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Application version and build metadata
const APP_METADATA = {
  version: "1.0.2",
  versionCode: 3,
  minRequiredVersion: "1.0.0",
  title: "Super Warrior 30 / Rahul Trade Warrior Academy",
  apkDownloadUrl: "https://sw30-production-storage-cdn.b-cdn.net/Trade-Warrior.apk",
  releaseNotes: "New in-app update notification alert, synthesized audio chimes, and instant reload.",
};

export async function GET() {
  return NextResponse.json(
    {
      ...APP_METADATA,
      serverTime: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    }
  );
}
