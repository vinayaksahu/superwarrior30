import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { getResolvedBunnyConfig } from "@/lib/bunny";
import { maskSecret } from "@/lib/crypto/encryption";

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

    const config = await getResolvedBunnyConfig();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: config.source,
      isProductionReady: config.isProductionReady,
      environment: config.environment,
      diagnostics: {
        stream: {
          libraryId: config.streamLibraryId || null,
          apiKeyConfigured: Boolean(config.streamApiKey),
          apiKeyMasked: maskSecret(config.streamApiKey),
          isStreamReady: Boolean(config.streamLibraryId && config.streamApiKey),
        },
        storage: {
          storageZone: config.storageZoneName || null,
          passwordConfigured: Boolean(config.storagePassword),
          passwordMasked: maskSecret(config.storagePassword),
          storageHostname: config.storageHostname,
          cdnHostname: config.cdnHostname || null,
          isStorageReady: Boolean(config.storageZoneName && config.storagePassword && config.cdnHostname),
        },
        tokenAuth: {
          enabled: config.enableTokenAuth,
          tokenKeyConfigured: Boolean(config.tokenSecurityKey),
        },
        overall: {
          isReady: Boolean(
            config.storageZoneName &&
            config.storagePassword &&
            config.cdnHostname &&
            config.streamLibraryId &&
            config.streamApiKey
          ),
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Diagnostic error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
