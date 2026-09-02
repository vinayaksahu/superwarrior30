import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto/encryption";
import { resolveCurrentEnvironment, getSyncEnvironmentContext } from "@/lib/env-context";

export interface ResolvedBunnyConfig {
  source: "DATABASE" | "ENV" | "NONE";
  isProductionReady: boolean;
  isEnabled: boolean;
  environment: string;

  // Account
  accountApiKey: string;
  accountEmail: string;

  // Storage
  storageZoneId: string;
  storageZoneName: string;
  storagePassword: string;
  storageHostname: string;

  // Pull Zone / CDN
  pullZoneId: string;
  pullZoneName: string;
  cdnHostname: string;

  // Stream (Video)
  streamLibraryId: string;
  streamLibraryName: string;
  streamApiKey: string;

  // Token Auth
  tokenSecurityKey: string;
  enableTokenAuth: boolean;

  lastTestedAt: Date | null;
}

// In-memory cache keyed by environment name for concurrency-safe caching
const cachedConfigByEnv = new Map<string, { config: ResolvedBunnyConfig; time: number }>();
const CACHE_TTL_MS = 10000; // 10s TTL

/**
 * Loads the active Bunny.net configuration for the current environment context.
 */
export async function getResolvedBunnyConfig(forceRefresh: boolean = false): Promise<ResolvedBunnyConfig> {
  const currentEnv = await resolveCurrentEnvironment();
  const envKey = currentEnv.toLowerCase();
  const now = Date.now();

  const cached = cachedConfigByEnv.get(envKey);
  if (!forceRefresh && cached && now - cached.time < CACHE_TTL_MS) {
    return cached.config;
  }

  try {
    const dbConfig = await prisma.mediaProviderConfig.findFirst({
      where: {
        provider: "BUNNY",
        isEnabled: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (dbConfig) {
      const decryptedAccountKey = decryptSecret(dbConfig.accountApiKeyEncrypted) || "";
      const decryptedStoragePassword = decryptSecret(dbConfig.storagePasswordEncrypted) || "";
      const decryptedStreamApiKey = decryptSecret(dbConfig.streamApiKeyEncrypted) || "";
      const decryptedTokenKey = decryptSecret(dbConfig.tokenSecurityKeyEncrypted) || "";

      // Check environment-specific env fallbacks
      const envStorageZone =
        (currentEnv === "TEST"
          ? process.env.BUNNY_TEST_STORAGE_ZONE
          : process.env.BUNNY_PRODUCTION_STORAGE_ZONE) ||
        process.env.BUNNY_STORAGE_ZONE ||
        "";

      const envStreamLibraryId =
        (currentEnv === "TEST"
          ? process.env.BUNNY_TEST_STREAM_LIBRARY_ID
          : process.env.BUNNY_PRODUCTION_STREAM_LIBRARY_ID) ||
        process.env.BUNNY_STREAM_LIBRARY_ID ||
        "";

      const config: ResolvedBunnyConfig = {
        source: "DATABASE",
        isProductionReady: dbConfig.isProductionReady,
        isEnabled: dbConfig.isEnabled,
        environment: currentEnv.toLowerCase(),

        accountApiKey: decryptedAccountKey || (process.env.BUNNY_API_KEY || "").trim(),
        accountEmail: dbConfig.accountEmail || "",

        storageZoneId: dbConfig.storageZoneId || "",
        storageZoneName: dbConfig.storageZoneName || envStorageZone.trim(),
        storagePassword: decryptedStoragePassword || (process.env.BUNNY_STORAGE_PASSWORD || "").trim(),
        storageHostname: dbConfig.storageHostname || (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim(),

        pullZoneId: dbConfig.pullZoneId || "",
        pullZoneName: dbConfig.pullZoneName || "",
        cdnHostname: dbConfig.cdnHostname || (process.env.BUNNY_CDN_HOSTNAME || "").trim(),

        streamLibraryId: dbConfig.streamLibraryId || envStreamLibraryId.trim(),
        streamLibraryName: dbConfig.streamLibraryName || "",
        streamApiKey: decryptedStreamApiKey || (process.env.BUNNY_STREAM_API_KEY || "").trim(),

        tokenSecurityKey: decryptedTokenKey || (process.env.BUNNY_TOKEN_SECURITY_KEY || "").trim(),
        enableTokenAuth: dbConfig.enableTokenAuth,

        lastTestedAt: dbConfig.lastTestedAt,
      };

      cachedConfigByEnv.set(envKey, { config, time: now });
      return config;
    }
  } catch (error) {
    console.warn(`Could not query media_provider_configs from DB (${currentEnv}), falling back to ENV:`, error);
  }

  // Fallback to Environment Variables
  const envStorageZone =
    (currentEnv === "TEST"
      ? process.env.BUNNY_TEST_STORAGE_ZONE
      : process.env.BUNNY_PRODUCTION_STORAGE_ZONE) ||
    process.env.BUNNY_STORAGE_ZONE ||
    "";

  const envStreamLibraryId =
    (currentEnv === "TEST"
      ? process.env.BUNNY_TEST_STREAM_LIBRARY_ID
      : process.env.BUNNY_PRODUCTION_STREAM_LIBRARY_ID) ||
    process.env.BUNNY_STREAM_LIBRARY_ID ||
    "";

  const config: ResolvedBunnyConfig = {
    source: "ENV",
    isProductionReady: Boolean(
      envStorageZone &&
      process.env.BUNNY_STORAGE_PASSWORD &&
      envStreamLibraryId &&
      process.env.BUNNY_STREAM_API_KEY
    ),
    isEnabled: true,
    environment: currentEnv.toLowerCase(),

    accountApiKey: (process.env.BUNNY_API_KEY || "").trim(),
    accountEmail: "",

    storageZoneId: "",
    storageZoneName: envStorageZone.trim(),
    storagePassword: (process.env.BUNNY_STORAGE_PASSWORD || "").trim(),
    storageHostname: (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim(),

    pullZoneId: "",
    pullZoneName: "",
    cdnHostname: (process.env.BUNNY_CDN_HOSTNAME || "").trim(),

    streamLibraryId: envStreamLibraryId.trim(),
    streamLibraryName: "",
    streamApiKey: (process.env.BUNNY_STREAM_API_KEY || "").trim(),

    tokenSecurityKey: (process.env.BUNNY_TOKEN_SECURITY_KEY || "").trim(),
    enableTokenAuth: false,

    lastTestedAt: null,
  };

  cachedConfigByEnv.set(envKey, { config, time: now });
  return config;
}

/**
 * Invalidates in-memory config cache
 */
export function invalidateBunnyConfigCache(env?: string) {
  if (env) {
    cachedConfigByEnv.delete(env.toLowerCase());
  } else {
    cachedConfigByEnv.clear();
  }
}

// ==========================================
// Compatibility Accessors (Synchronous)
// ==========================================

function getActiveCachedConfig(): ResolvedBunnyConfig | undefined {
  const syncEnv = getSyncEnvironmentContext() || "LIVE";
  return cachedConfigByEnv.get(syncEnv.toLowerCase())?.config;
}

export const bunnyStreamConfig = {
  get libraryId(): string {
    return (getActiveCachedConfig()?.streamLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  },
  get apiKey(): string {
    return (getActiveCachedConfig()?.streamApiKey || process.env.BUNNY_STREAM_API_KEY || "").trim();
  },
  get baseUrl(): string {
    return `https://video.bunnycdn.com/library/${this.libraryId}`;
  },
  get embedBaseUrl(): string {
    return `https://iframe.mediadelivery.net/embed/${this.libraryId}`;
  },
  get hlsBaseUrl(): string {
    return `https://vz-${this.libraryId}.b-cdn.net`;
  },
};

export const bunnyStorageConfig = {
  get zone(): string {
    return (getActiveCachedConfig()?.storageZoneName || process.env.BUNNY_STORAGE_ZONE || "").trim();
  },
  get password(): string {
    return (getActiveCachedConfig()?.storagePassword || process.env.BUNNY_STORAGE_PASSWORD || "").trim();
  },
  get hostname(): string {
    return (getActiveCachedConfig()?.storageHostname || process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim();
  },
  get baseUrl(): string {
    return `https://${this.hostname}/${this.zone}`;
  },
};

export const bunnyCdnConfig = {
  get hostname(): string {
    return (getActiveCachedConfig()?.cdnHostname || process.env.BUNNY_CDN_HOSTNAME || "").trim();
  },
  get baseUrl(): string {
    const host = this.hostname.replace(/^https?:\/\//, "");
    return `https://${host}`;
  },
};

export function getBunnyApiKey(): string {
  return (getActiveCachedConfig()?.accountApiKey || process.env.BUNNY_API_KEY || "").trim();
}

export function isBunnyStreamConfigured(): boolean {
  return Boolean(bunnyStreamConfig.libraryId && bunnyStreamConfig.apiKey);
}

export function isBunnyStorageConfigured(): boolean {
  return Boolean(
    bunnyStorageConfig.zone &&
    bunnyStorageConfig.password &&
    bunnyCdnConfig.hostname
  );
}

export function isBunnyConfigured(): boolean {
  return isBunnyStreamConfigured() && isBunnyStorageConfigured();
}

export function isBunnyPartiallyConfigured(): boolean {
  return isBunnyStreamConfigured() || isBunnyStorageConfigured();
}
