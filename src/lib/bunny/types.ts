// ==========================================
// Bunny Media Infrastructure — Type Definitions
// ==========================================

/**
 * Bunny Stream video encoding status
 */
export type BunnyVideoStatus =
  | "QUEUED"      // Video created, waiting for upload
  | "PROCESSING"  // Upload received, processing started
  | "ENCODING"    // Transcoding to multiple resolutions
  | "FINISHED"    // Ready for playback
  | "FAILED";     // Encoding failed

/**
 * Bunny Stream video metadata (subset of API response)
 */
export interface BunnyVideo {
  guid: string;
  title: string;
  status: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error, 6=upload_failed
  length: number; // duration in seconds
  width: number;
  height: number;
  storageSize: number;
  encodeProgress: number; // 0-100
  dateUploaded: string;
  thumbnailUrl?: string;
}

/**
 * Result from creating + uploading a video to Bunny Stream
 */
export interface BunnyVideoUploadResult {
  guid: string;
  title: string;
  status: number;
}

/**
 * Result from uploading a file to Bunny Storage
 */
export interface BunnyStorageUploadResult {
  path: string;
  cdnUrl: string;
}

/**
 * Direct video upload authorization credentials returned to client for direct-to-Bunny TUS upload.
 * Does NOT contain the API key or any permanent secrets.
 */
export interface DirectVideoUploadAuth {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
  endpoint: string;
  uploadUrl: string;
}

/**
 * Media provider discriminator for dual-provider support.
 * null or undefined = R2 (backward compat)
 */
export type MediaProvider = "R2" | "BUNNY";

/**
 * Map Bunny API status codes to human-readable status
 */
export function mapBunnyStatusCode(statusCode: number): BunnyVideoStatus {
  switch (statusCode) {
    case 0: return "QUEUED";
    case 1: return "QUEUED";      // uploaded but not yet processing
    case 2: return "PROCESSING";
    case 3: return "ENCODING";
    case 4: return "FINISHED";
    case 5:
    case 6: return "FAILED";
    default: return "QUEUED";
  }
}

/**
 * Normalized video status returned to UI
 */
export interface VideoEncodingStatus {
  guid: string;
  status: BunnyVideoStatus;
  encodeProgress: number;
  isReady: boolean;
  durationSec: number;
  width: number;
  height: number;
}
