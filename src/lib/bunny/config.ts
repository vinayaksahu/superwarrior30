import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto/encryption";

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

// In-memory cache for fast synchronous property access
let cachedConfig: ResolvedBunnyConfig | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 10000; // 10s TTL

/**
 * Loads the active Bunny.net configuration from database, falling back to environment variables.
 */
export async function getResolvedBunnyConfig(forceRefresh: boolean = false): Promise<ResolvedBunnyConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedConfig && now - cacheTime < CACHE_TTL_MS) {
    return cachedConfig;
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

      cachedConfig = {
        source: "DATABASE",
        isProductionReady: dbConfig.isProductionReady,
        isEnabled: dbConfig.isEnabled,
        environment: dbConfig.environment || "production",

        accountApiKey: decryptedAccountKey || (process.env.BUNNY_API_KEY || "").trim(),
        accountEmail: dbConfig.accountEmail || "",

        storageZoneId: dbConfig.storageZoneId || "",
        storageZoneName: dbConfig.storageZoneName || (process.env.BUNNY_STORAGE_ZONE || "").trim(),
        storagePassword: decryptedStoragePassword || (process.env.BUNNY_STORAGE_PASSWORD || "").trim(),
        storageHostname: dbConfig.storageHostname || (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim(),

        pullZoneId: dbConfig.pullZoneId || "",
        pullZoneName: dbConfig.pullZoneName || "",
        cdnHostname: dbConfig.cdnHostname || (process.env.BUNNY_CDN_HOSTNAME || "").trim(),

        streamLibraryId: dbConfig.streamLibraryId || (process.env.BUNNY_STREAM_LIBRARY_ID || "").trim(),
        streamLibraryName: dbConfig.streamLibraryName || "",
        streamApiKey: decryptedStreamApiKey || (process.env.BUNNY_STREAM_API_KEY || "").trim(),

        tokenSecurityKey: decryptedTokenKey || (process.env.BUNNY_TOKEN_SECURITY_KEY || "").trim(),
        enableTokenAuth: dbConfig.enableTokenAuth,

        lastTestedAt: dbConfig.lastTestedAt,
      };

      cacheTime = now;
      return cachedConfig;
    }
  } catch (error) {
    // Database might be uninitialized during early migrations
    console.warn("Could not query media_provider_configs from DB, falling back to ENV:", error);
  }

  // Fallback to Environment Variables (development / bootstrap)
  cachedConfig = {
    source: "ENV",
    isProductionReady: Boolean(
      process.env.BUNNY_STORAGE_ZONE &&
      process.env.BUNNY_STORAGE_PASSWORD &&
      process.env.BUNNY_STREAM_LIBRARY_ID &&
      process.env.BUNNY_STREAM_API_KEY
    ),
    isEnabled: true,
    environment: process.env.NODE_ENV || "development",

    accountApiKey: (process.env.BUNNY_API_KEY || "").trim(),
    accountEmail: "",

    storageZoneId: "",
    storageZoneName: (process.env.BUNNY_STORAGE_ZONE || "").trim(),
    storagePassword: (process.env.BUNNY_STORAGE_PASSWORD || "").trim(),
    storageHostname: (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim(),

    pullZoneId: "",
    pullZoneName: "",
    cdnHostname: (process.env.BUNNY_CDN_HOSTNAME || "").trim(),

    streamLibraryId: (process.env.BUNNY_STREAM_LIBRARY_ID || "").trim(),
    streamLibraryName: "",
    streamApiKey: (process.env.BUNNY_STREAM_API_KEY || "").trim(),

    tokenSecurityKey: (process.env.BUNNY_TOKEN_SECURITY_KEY || "").trim(),
    enableTokenAuth: false,

    lastTestedAt: null,
  };

  cacheTime = now;
  return cachedConfig;
}

/**
 * Invalidates in-memory config cache
 */
export function invalidateBunnyConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}

// ==========================================
// Compatibility Accessors (Synchronous)
// ==========================================

export const bunnyStreamConfig = {
  get libraryId(): string {
    return (cachedConfig?.streamLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  },
  get apiKey(): string {
    return (cachedConfig?.streamApiKey || process.env.BUNNY_STREAM_API_KEY || "").trim();
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
    return (cachedConfig?.storageZoneName || process.env.BUNNY_STORAGE_ZONE || "").trim();
  },
  get password(): string {
    return (cachedConfig?.storagePassword || process.env.BUNNY_STORAGE_PASSWORD || "").trim();
  },
  get hostname(): string {
    return (cachedConfig?.storageHostname || process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim();
  },
  get baseUrl(): string {
    return `https://${this.hostname}/${this.zone}`;
  },
};

export const bunnyCdnConfig = {
  get hostname(): string {
    return (cachedConfig?.cdnHostname || process.env.BUNNY_CDN_HOSTNAME || "").trim();
  },
  get baseUrl(): string {
    const host = this.hostname.replace(/^https?:\/\//, "");
    return `https://${host}`;
  },
};

export function getBunnyApiKey(): string {
  return (cachedConfig?.accountApiKey || process.env.BUNNY_API_KEY || "").trim();
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
