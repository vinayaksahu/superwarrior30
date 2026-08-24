export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Super Warrior 30";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const SESSION_COOKIE_NAME = "sw30_session";
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const MAX_FILE_SIZES = {
  VIDEO: 500 * 1024 * 1024,    // 500MB
  PDF: 50 * 1024 * 1024,       // 50MB
  IMAGE: 10 * 1024 * 1024,     // 10MB
  THUMBNAIL: 5 * 1024 * 1024,  // 5MB
} as const;

export const ALLOWED_MIME_TYPES = {
  VIDEO: ["video/mp4", "video/webm"],
  PDF: ["application/pdf"],
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

export const SIGNED_URL_EXPIRY = {
  VIDEO: 3600,    // 1 hour
  PDF: 1800,      // 30 minutes
  UPLOAD: 300,    // 5 minutes
  THUMBNAIL: 86400, // 24 hours
} as const;
