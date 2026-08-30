import "server-only";

import { getResolvedBunnyConfig } from "./config";
import { BunnyService } from "./service";
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
  const config = await getResolvedBunnyConfig();

  if (!config.storageZoneName || !config.storagePassword || !config.cdnHostname) {
    throw new Error(
      "Bunny Storage is not configured. Please complete the Media Storage setup in Admin Panel."
    );
  }

  // Normalize path: remove leading slash
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const uploadUrl = `https://${config.storageHostname}/${config.storageZoneName}/${normalizedPath}`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: config.storagePassword,
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

  const cdnUrl = await getBunnyCdnUrl(normalizedPath);

  return {
    path: normalizedPath,
    cdnUrl,
  };
}

/**
 * Delete a file from Bunny Storage.
 */
export async function deleteFromBunnyStorage(path: string): Promise<void> {
  const config = await getResolvedBunnyConfig();
  if (!config.storageZoneName || !config.storagePassword) return;

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const deleteUrl = `https://${config.storageHostname}/${config.storageZoneName}/${normalizedPath}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      AccessKey: config.storagePassword,
    },
  });

  if (!res.ok && res.status !== 404) {
    console.error(
      `Bunny Storage: Failed to delete ${normalizedPath} (${res.status})`
    );
  }
}

/**
 * Get the CDN delivery URL for a Bunny Storage file.
 * Automatically generates signed token URLs if Token Authentication is active.
 */
export async function getBunnyCdnUrl(
  path: string,
  expiresInSec: number = 3600
): Promise<string> {
  const config = await getResolvedBunnyConfig();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const cleanHost = (config.cdnHostname || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  if (config.enableTokenAuth && config.tokenSecurityKey) {
    return BunnyService.generateSignedUrl(
      cleanHost,
      normalizedPath,
      config.tokenSecurityKey,
      expiresInSec
    );
  }

  return `https://${cleanHost}/${normalizedPath}`;
}

/**
 * Check if a file exists in Bunny Storage.
 */
export async function checkBunnyStorageFile(path: string): Promise<boolean> {
  const config = await getResolvedBunnyConfig();
  if (!config.storageZoneName || !config.storagePassword) return false;

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `https://${config.storageHostname}/${config.storageZoneName}/${normalizedPath}`;

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        AccessKey: config.storagePassword,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
