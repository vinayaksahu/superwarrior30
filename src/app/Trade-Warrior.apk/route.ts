import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Always serve the latest verified and signed APK directly from Bunny CDN
  const cdnUrl = "https://sw30-production-storage-cdn.b-cdn.net/Trade-Warrior.apk";
  return NextResponse.redirect(cdnUrl, 302);
}
