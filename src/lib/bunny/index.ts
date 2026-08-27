// ==========================================
// Bunny Media Infrastructure — Public API
// ==========================================

// Configuration & detection
export {
  isBunnyConfigured,
  isBunnyStreamConfigured,
  isBunnyStorageConfigured,
  isBunnyPartiallyConfigured,
  bunnyStreamConfig,
  bunnyStorageConfig,
  bunnyCdnConfig,
  getBunnyApiKey,
} from "./config";

// Bunny Stream (Video hosting)
export {
  createBunnyVideo,
  createDirectVideoUploadAuth,
  uploadVideoToBunny,
  getVideoStatus,
  getSecurePlaybackUrl,
  deleteBunnyVideo,
  listBunnyVideos,
} from "./stream";

// Bunny Storage (PDFs, images, thumbnails)
export {
  uploadToBunnyStorage,
  deleteFromBunnyStorage,
  getBunnyCdnUrl,
  checkBunnyStorageFile,
} from "./storage";

// Types
export type {
  BunnyVideoStatus,
  BunnyVideo,
  BunnyVideoUploadResult,
  BunnyStorageUploadResult,
  MediaProvider,
  VideoEncodingStatus,
} from "./types";

export { mapBunnyStatusCode } from "./types";
