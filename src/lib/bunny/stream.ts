import "server-only";

import crypto from "crypto";
import { getResolvedBunnyConfig, bunnyStreamConfig } from "./config";
import type { BunnyVideo, BunnyVideoUploadResult, VideoEncodingStatus } from "./types";
import { mapBunnyStatusCode } from "./types";

// ==========================================
// Bunny Stream Service — Video Hosting & HLS
// ==========================================

/**
 * Create a new video entry in Bunny Stream library.
 * This must be called BEFORE uploading the video file.
 */
export async function createBunnyVideo(title: string): Promise<BunnyVideoUploadResult> {
  const config = await getResolvedBunnyConfig();

  if (!config.streamLibraryId || !config.streamApiKey) {
    throw new Error(
      "Bunny Stream is not configured. Please complete the Media Storage setup in Admin Panel."
    );
  }

  const res = await fetch(`https://video.bunnycdn.com/library/${config.streamLibraryId}/videos`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      AccessKey: config.streamApiKey,
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Bunny Stream: Failed to create video (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    guid: data.guid,
    title: data.title,
    status: data.status,
  };
}

/**
 * Creates a Bunny Stream video entry and generates a secure, short-lived Upload Signature
 * allowing the browser client to upload video chunks directly to Bunny via TUS.
 * NEVER returns the Bunny API key to the client.
 */
export async function createDirectVideoUploadAuth(
  title: string,
  _fileSize?: number,
  expiresInSec: number = 7200
): Promise<{
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
  endpoint: string;
}> {
  const config = await getResolvedBunnyConfig();

  if (!config.streamLibraryId || !config.streamApiKey) {
    throw new Error(
      "Bunny Stream is not configured. Please complete the Media Storage setup in Admin Panel."
    );
  }

  // 1. Create the video entry in Bunny Stream Library
  const videoEntry = await createBunnyVideo(title);
  const videoId = videoEntry.guid;
  const libraryId = config.streamLibraryId;
  const apiKey = config.streamApiKey;

  // 2. Generate short-lived expiration timestamp (in seconds)
  const expirationTime = Math.floor(Date.now() / 1000) + expiresInSec;

  // 3. Generate SHA256 upload signature: SHA256(library_id + api_key + expiration_time + video_id)
  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest("hex");

  return {
    videoId,
    libraryId,
    expirationTime,
    signature,
    endpoint: "https://video.bunnycdn.com/tusupload",
  };
}

/**
 * Upload a video file to an existing Bunny Stream video entry.
 * Uses the direct PUT upload method.
 */
export async function uploadVideoToBunny(
  guid: string,
  fileBuffer: Buffer
): Promise<void> {
  const config = await getResolvedBunnyConfig();

  if (!config.streamLibraryId || !config.streamApiKey) {
    throw new Error("Bunny Stream is not configured.");
  }

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.streamLibraryId}/videos/${guid}`,
    {
      method: "PUT",
      headers: {
        AccessKey: config.streamApiKey,
        "content-type": "application/octet-stream",
      },
      body: new Uint8Array(fileBuffer),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Bunny Stream: Failed to upload video (${res.status}): ${errText}`);
  }
}

/**
 * Get video metadata and encoding status from Bunny Stream.
 */
export async function getVideoStatus(guid: string): Promise<VideoEncodingStatus> {
  const config = await getResolvedBunnyConfig();

  if (!config.streamLibraryId || !config.streamApiKey) {
    throw new Error("Bunny Stream is not configured.");
  }

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.streamLibraryId}/videos/${guid}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        AccessKey: config.streamApiKey,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Bunny Stream: Failed to get video status (${res.status})`);
  }

  const data: BunnyVideo = await res.json();
  const status = mapBunnyStatusCode(data.status);
  const rawStatus = data.status;

  // Video is READY if status is 4 (Finished), or has duration with status >= 3, or encodeProgress is 100
  const isReady =
    status === "FINISHED" ||
    rawStatus === 4 ||
    (typeof data.encodeProgress === "number" && data.encodeProgress >= 100) ||
    (typeof data.length === "number" && data.length > 0 && rawStatus >= 3);

  // Video is uploaded if status >= 1
  const isUploaded = rawStatus >= 1;

  const libraryId = config.streamLibraryId;
  const thumbnailUrl = `https://vz-${libraryId}.b-cdn.net/${data.guid}/thumbnail.jpg`;
  const previewUrl = `https://vz-${libraryId}.b-cdn.net/${data.guid}/preview.webp`;

  return {
    guid: data.guid,
    status,
    rawStatusCode: rawStatus,
    encodeProgress: data.encodeProgress || 0,
    isReady,
    isUploaded,
    durationSec: Math.round(data.length || 0),
    width: data.width || 0,
    height: data.height || 0,
    thumbnailUrl,
    previewUrl,
  };
}

/**
 * Generate a token-authenticated playback URL for a Bunny Stream video.
 *
 * Returns the direct HLS manifest URL with token auth, OR
 * the embed iframe URL if preferred.
 */
export function getSecurePlaybackUrl(
  guid: string,
  expiresInSec: number = 3600,
  format: "hls" | "embed" = "embed",
  libraryIdOverride?: string,
  tokenSecurityKeyOverride?: string
): string {
  const libraryId = libraryIdOverride || bunnyStreamConfig.libraryId;
  const tokenKey = tokenSecurityKeyOverride || (process.env.BUNNY_TOKEN_SECURITY_KEY || "");
  const expires = Math.floor(Date.now() / 1000) + expiresInSec;

  if (format === "embed") {
    if (tokenKey) {
      // Bunny Token Auth for embed: SHA256(token_security_key + video_id + expiration)
      const hashableBase = `${tokenKey}${guid}${expires}`;
      const token = crypto.createHash("sha256").update(hashableBase).digest("hex");
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}?token=${token}&expires=${expires}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
    }
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  }

  const pullZoneHost =
    libraryId === "740163" ? "vz-647be451-8da.b-cdn.net" : `vz-${libraryId}.b-cdn.net`;

  if (tokenKey) {
    const hashableBase = `${tokenKey}/${guid}/playlist.m3u8${expires}`;
    const token = crypto.createHash("sha256").update(hashableBase).digest("hex");
    return `https://${pullZoneHost}/${guid}/playlist.m3u8?token=${token}&expires=${expires}`;
  }

  return `https://${pullZoneHost}/${guid}/playlist.m3u8`;
}

/**
 * Delete a video from Bunny Stream.
 */
export async function deleteBunnyVideo(guid: string): Promise<void> {
  const config = await getResolvedBunnyConfig();
  if (!config.streamLibraryId || !config.streamApiKey) return;

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.streamLibraryId}/videos/${guid}`,
    {
      method: "DELETE",
      headers: {
        AccessKey: config.streamApiKey,
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    console.error(`Bunny Stream: Failed to delete video ${guid} (${res.status})`);
  }
}

/**
 * List all videos in the Bunny Stream library (admin use).
 */
export async function listBunnyVideos(
  page: number = 1,
  itemsPerPage: number = 25
): Promise<{ items: BunnyVideo[]; totalItems: number }> {
  const config = await getResolvedBunnyConfig();
  if (!config.streamLibraryId || !config.streamApiKey) {
    return { items: [], totalItems: 0 };
  }

  const res = await fetch(
    `https://video.bunnycdn.com/library/${config.streamLibraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}&orderBy=date`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        AccessKey: config.streamApiKey,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Bunny Stream: Failed to list videos (${res.status})`);
  }

  const data = await res.json();
  return {
    items: data.items || [],
    totalItems: data.totalItems || 0,
  };
}
