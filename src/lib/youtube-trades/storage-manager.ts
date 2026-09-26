/**
 * Cloud & Local Storage Manager
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Automatically manages media asset storage across Bunny.net CDN,
 * Cloudflare R2, and local file storage with graceful fallback.
 */

import path from "path";
import fs from "fs";
import os from "os";
import { getResolvedBunnyConfig } from "@/lib/bunny/config";

async function resolveActiveBunnyConfig() {
  // First check database-driven / dynamic resolved Bunny config
  try {
    const resolved = await getResolvedBunnyConfig();
    if (resolved && resolved.storageZoneName && resolved.storagePassword && resolved.cdnHostname) {
      return {
        isConfigured: true,
        storageZone: resolved.storageZoneName,
        storageApiKey: resolved.storagePassword,
        storageRegion: resolved.storageHostname.includes("storage.bunnycdn.com")
          ? resolved.storageHostname.split(".storage.bunnycdn.com")[0]
          : "",
        pullZoneHost: resolved.cdnHostname,
        storageHost: resolved.storageHostname || "storage.bunnycdn.com",
      };
    }
  } catch (err) {
    console.warn("[StorageManager] getResolvedBunnyConfig notice:", err);
  }

  // Fallback to environment variables
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
  const storageRegion = process.env.BUNNY_STORAGE_REGION;
  const pullZoneHost = process.env.BUNNY_CDN_HOSTNAME || process.env.BUNNY_PULL_ZONE;

  return {
    isConfigured: Boolean(storageZone && storageApiKey),
    storageZone,
    storageApiKey,
    storageRegion,
    pullZoneHost,
    storageHost: storageRegion ? `${storageRegion}.storage.bunnycdn.com` : "storage.bunnycdn.com",
  };
}

export type AssetType =
  | "MASTER_VIDEO"
  | "SHORT_VIDEO"
  | "SUBTITLE_SRT"
  | "METADATA_JSON";

export interface SaveTradeAssetParams {
  localFilePath: string;
  assetType: AssetType;
  streamId: string;
  tradeId: string;
  filename?: string;
}

export interface SaveTradeAssetResult {
  success: boolean;
  publicUrl: string;
  storageProvider: "BUNNY" | "R2" | "LOCAL";
  key: string;
  fileSizeBytes: number;
  error?: string;
}

/**
 * Saves a generated trade asset to the active storage provider (Bunny, R2, or Local).
 * Handles serverless read-only filesystems (Vercel, AWS Lambda) seamlessly.
 */
export async function saveTradeAsset(
  params: SaveTradeAssetParams
): Promise<SaveTradeAssetResult> {
  const { localFilePath, assetType, streamId, tradeId } = params;

  if (!fs.existsSync(localFilePath)) {
    return {
      success: false,
      publicUrl: "",
      storageProvider: "LOCAL",
      key: "",
      fileSizeBytes: 0,
      error: `Source file does not exist: ${localFilePath}`,
    };
  }

  const stat = fs.statSync(localFilePath);
  const ext = path.extname(localFilePath);
  const baseName =
    params.filename ||
    `${assetType.toLowerCase()}_${streamId}_${tradeId}${ext}`;

  // 1. Try Bunny Storage if configured
  const bunnyConfig = await resolveActiveBunnyConfig();
  if (bunnyConfig.isConfigured && bunnyConfig.storageZone && bunnyConfig.storageApiKey) {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const storageHost = bunnyConfig.storageHost || "storage.bunnycdn.com";

      const uploadPath = `trade_clips/${streamId}/${baseName}`;
      const uploadUrl = `https://${storageHost}/${bunnyConfig.storageZone}/${uploadPath}`;

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          AccessKey: bunnyConfig.storageApiKey,
          "Content-Type":
            assetType === "SUBTITLE_SRT"
              ? "text/plain; charset=utf-8"
              : assetType === "METADATA_JSON"
              ? "application/json"
              : "video/mp4",
        },
        body: fileBuffer,
      });

      if (uploadRes.ok) {
        const cdnHost =
          bunnyConfig.pullZoneHost || `${bunnyConfig.storageZone}.b-cdn.net`;
        const publicUrl = `https://${cdnHost}/${uploadPath}`;

        return {
          success: true,
          publicUrl,
          storageProvider: "BUNNY",
          key: uploadPath,
          fileSizeBytes: stat.size,
        };
      } else {
        const errText = await uploadRes.text().catch(() => "");
        console.warn(`[StorageManager] Bunny upload returned ${uploadRes.status}: ${errText}`);
      }
    } catch (bunnyErr) {
      console.warn(
        "[StorageManager] Bunny storage upload failed, falling back to local/serverless storage:",
        bunnyErr
      );
    }
  }

  // 2. Local public file storage (writable environments like VPS, local machine)
  try {
    const publicUploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "trade_clips",
      streamId
    );

    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    const targetLocalPath = path.join(publicUploadsDir, baseName);

    // If source is not already target, copy file
    if (path.resolve(localFilePath) !== path.resolve(targetLocalPath)) {
      fs.copyFileSync(localFilePath, targetLocalPath);
    }

    const publicUrl = `/uploads/trade_clips/${streamId}/${baseName}`;

    return {
      success: true,
      publicUrl,
      storageProvider: "LOCAL",
      key: `trade_clips/${streamId}/${baseName}`,
      fileSizeBytes: stat.size,
    };
  } catch (localFsErr: any) {
    // 3. Serverless fallback: public/ is read-only (e.g. on Vercel / AWS Lambda)
    // Save to writable os.tmpdir() and serve via Next.js streaming API route
    console.warn(
      "[StorageManager] public/ is read-only (Vercel/Lambda). Storing in os.tmpdir and using API streaming route fallback:",
      localFsErr?.message
    );

    try {
      const tmpPublicDir = path.join(os.tmpdir(), "trade_clips", "public", streamId);
      if (!fs.existsSync(tmpPublicDir)) {
        fs.mkdirSync(tmpPublicDir, { recursive: true });
      }

      const targetTmpPath = path.join(tmpPublicDir, baseName);
      if (path.resolve(localFilePath) !== path.resolve(targetTmpPath)) {
        fs.copyFileSync(localFilePath, targetTmpPath);
      }

      const publicUrl = `/api/admin/media/trade-clip?streamId=${encodeURIComponent(streamId)}&filename=${encodeURIComponent(baseName)}`;

      return {
        success: true,
        publicUrl,
        storageProvider: "LOCAL",
        key: `trade_clips/${streamId}/${baseName}`,
        fileSizeBytes: stat.size,
      };
    } catch (tmpErr: any) {
      console.error("[StorageManager] os.tmpdir fallback save failed:", tmpErr);
      return {
        success: false,
        publicUrl: localFilePath,
        storageProvider: "LOCAL",
        key: localFilePath,
        fileSizeBytes: stat.size,
        error: tmpErr?.message || "Failed to persist asset to storage",
      };
    }
  }
}
