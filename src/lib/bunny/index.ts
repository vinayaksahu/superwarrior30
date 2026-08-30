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
  getResolvedBunnyConfig,
  invalidateBunnyConfigCache,
} from "./config";
export type { ResolvedBunnyConfig } from "./config";

// Bunny Service Layer (Management API, Provisioning, Diagnostics)
export { BunnyService } from "./service";
export type {
  BunnyStorageZoneSummary,
  BunnyPullZoneSummary,
  BunnyVideoLibrarySummary,
  BunnyAccountResources,
  TestResultItem,
  FullDiagnosticsResult,
} from "./service";

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
