import "server-only";

import { bunnyStorageConfig, bunnyCdnConfig, isBunnyStorageConfigured } from "./config";
import type { BunnyStorageUploadResult } from "./types";

// ==========================================
// Bunny Storage Service — PDFs, Images, Thumbnails
// ==========================================

/**
 * Upload a file to Bunny Storage zone.
 *
 * @param path - Storage path (e.g. "courses/abc123/thumbnail.jpg")
 * @param buffer - File content as Buffer
 * @param contentType - MIME type
 * @returns Upload result with CDN URL
 */
export async function uploadToBunnyStorage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<BunnyStorageUploadResult> {
  if (!isBunnyStorageConfigured()) {
    throw new Error(
      "Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, and BUNNY_CDN_HOSTNAME."
    );
  }

  // Normalize path: remove leading slash
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const uploadUrl = `${bunnyStorageConfig.baseUrl}/${normalizedPath}`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: bunnyStorageConfig.password,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(
      `Bunny Storage: Upload failed (${res.status}): ${errText}`
    );
  }

  const cdnUrl = getBunnyCdnUrl(normalizedPath);

  return {
    path: normalizedPath,
    cdnUrl,
  };
}

/**
 * Delete a file from Bunny Storage.
 */
export async function deleteFromBunnyStorage(path: string): Promise<void> {
  if (!isBunnyStorageConfigured()) return;

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const deleteUrl = `${bunnyStorageConfig.baseUrl}/${normalizedPath}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      AccessKey: bunnyStorageConfig.password,
    },
  });

  if (!res.ok && res.status !== 404) {
    console.error(
      `Bunny Storage: Failed to delete ${normalizedPath} (${res.status})`
    );
  }
}

/**
 * Get the public CDN URL for a Bunny Storage file.
 */
export function getBunnyCdnUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${bunnyCdnConfig.baseUrl}/${normalizedPath}`;
}

/**
 * Check if a file exists in Bunny Storage.
 */
export async function checkBunnyStorageFile(path: string): Promise<boolean> {
  if (!isBunnyStorageConfigured()) return false;

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${bunnyStorageConfig.baseUrl}/${normalizedPath}`;

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        AccessKey: bunnyStorageConfig.password,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
