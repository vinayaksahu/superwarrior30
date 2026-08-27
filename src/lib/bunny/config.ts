import "server-only";

// ==========================================
// Bunny Media Infrastructure — Configuration
// ==========================================

/**
 * Bunny Stream config (video hosting + HLS delivery)
 */
export const bunnyStreamConfig = {
  get libraryId(): string {
    return (process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  },
  get apiKey(): string {
    return (process.env.BUNNY_STREAM_API_KEY || "").trim();
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

/**
 * Bunny Storage config (PDFs, images, thumbnails)
 */
export const bunnyStorageConfig = {
  get zone(): string {
    return (process.env.BUNNY_STORAGE_ZONE || "").trim();
  },
  get password(): string {
    return (process.env.BUNNY_STORAGE_PASSWORD || "").trim();
  },
  get hostname(): string {
    return (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim();
  },
  get baseUrl(): string {
    return `https://${this.hostname}/${this.zone}`;
  },
};

/**
 * Bunny CDN config (public delivery for storage-hosted files)
 */
export const bunnyCdnConfig = {
  get hostname(): string {
    return (process.env.BUNNY_CDN_HOSTNAME || "").trim();
  },
  get baseUrl(): string {
    return `https://${this.hostname}`;
  },
};

/**
 * Global Bunny API key (account-level, used for some management APIs)
 */
export function getBunnyApiKey(): string {
  return (process.env.BUNNY_API_KEY || "").trim();
}

/**
 * Check if Bunny Stream is configured (video hosting)
 */
export function isBunnyStreamConfigured(): boolean {
  return Boolean(
    bunnyStreamConfig.libraryId &&
    bunnyStreamConfig.apiKey
  );
}

/**
 * Check if Bunny Storage is configured (PDFs, images)
 */
export function isBunnyStorageConfigured(): boolean {
  return Boolean(
    bunnyStorageConfig.zone &&
    bunnyStorageConfig.password &&
    bunnyCdnConfig.hostname
  );
}

/**
 * Check if full Bunny infrastructure is configured (stream + storage + CDN)
 */
export function isBunnyConfigured(): boolean {
  return isBunnyStreamConfigured() && isBunnyStorageConfigured();
}

/**
 * Check if at least one Bunny service is configured
 */
export function isBunnyPartiallyConfigured(): boolean {
  return isBunnyStreamConfigured() || isBunnyStorageConfigured();
}
