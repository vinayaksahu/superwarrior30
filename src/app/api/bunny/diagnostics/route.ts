import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import {
  bunnyStorageConfig,
  bunnyCdnConfig,
  isBunnyStreamConfigured,
  isBunnyStorageConfigured,
  isBunnyConfigured,
} from "@/lib/bunny";

export const dynamic = "force-dynamic";

/**
 * GET /api/bunny/diagnostics
 *
 * Safe runtime diagnostic endpoint reporting configuration presence without revealing secrets.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    const streamLibraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
    const streamApiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    const storageZone = process.env.BUNNY_STORAGE_ZONE?.trim();
    const storagePassword = process.env.BUNNY_STORAGE_PASSWORD?.trim();
    const storageHostname = process.env.BUNNY_STORAGE_HOSTNAME?.trim();
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME?.trim();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      diagnostics: {
        stream: {
          BUNNY_STREAM_LIBRARY_ID: {
            configured: Boolean(streamLibraryId),
            value: streamLibraryId || null,
          },
          BUNNY_STREAM_API_KEY: {
            configured: Boolean(streamApiKey),
            length: streamApiKey ? streamApiKey.length : 0,
          },
          isStreamReady: isBunnyStreamConfigured(),
        },
        storage: {
          BUNNY_STORAGE_ZONE: {
            configured: Boolean(storageZone),
            value: storageZone || null,
          },
          BUNNY_STORAGE_PASSWORD: {
            configured: Boolean(storagePassword),
            length: storagePassword ? storagePassword.length : 0,
          },
          BUNNY_STORAGE_HOSTNAME: {
            configured: Boolean(storageHostname),
            value: bunnyStorageConfig.hostname,
          },
          BUNNY_CDN_HOSTNAME: {
            configured: Boolean(cdnHostname),
            value: bunnyCdnConfig.hostname || null,
          },
          isStorageReady: isBunnyStorageConfigured(),
        },
        overall: {
          allConfigured: isBunnyConfigured(),
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Diagnostic error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
