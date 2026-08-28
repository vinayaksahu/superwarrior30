import "server-only";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, isR2Configured } from "./r2";

// ==========================================
// R2 Storage Functions (unchanged — backward compat)
// ==========================================

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket && process.env.NODE_ENV === "production" && isR2Configured()) {
    throw new Error("Missing R2_BUCKET_NAME environment variable");
  }
  return bucket || "superwarrior30-placeholder";
}

export async function createPresignedUploadUrl({
  key,
  contentType,
  contentLength,
  expiresIn = 300, // 5 minutes
}: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
}) {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 storage credentials are not configured yet. Please configure R2 environment variables to enable uploads.");
  }

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });
  return { uploadUrl, key };
}

export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 3600 // 1 hour
) {
  if (!key) return null;

  // Support direct base64 data URIs and external URLs
  if (key.startsWith("data:") || key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  // Graceful fallback for demo/preview when R2 is unconfigured
  if (!isR2Configured()) {
    if (key.endsWith(".mp4") || key.endsWith(".webm") || key.includes("video")) {
      return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
    return "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

export async function deleteR2Object(key: string) {
  if (!isR2Configured()) {
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return r2.send(command);
}

// ==========================================
// Unified Media URL Resolution (R2 + Bunny)
// ==========================================

import { getSecurePlaybackUrl } from "./bunny/stream";
import { isBunnyStreamConfigured, isBunnyStorageConfigured } from "./bunny/config";
import { SIGNED_URL_EXPIRY } from "./constants";

/**
 * Resolve the playback/delivery URL for a lesson's media.
 * Checks `mediaProvider` to decide between R2 presigned URLs and Bunny URLs.
 *
 * @param lesson - Lesson data with provider and key fields
 * @param type - "video" or "pdf"
 * @param expiresIn - URL expiry in seconds (used for R2 and Bunny token auth)
 */
export async function getMediaUrl(
  lesson: {
    mediaProvider?: string | null;
    videoKey?: string | null;
    pdfKey?: string | null;
    bunnyVideoId?: string | null;
    bunnyCdnUrl?: string | null;
  },
  type: "video" | "pdf",
  expiresIn?: number
): Promise<string | null> {
  // Bunny provider path (handles both explicit BUNNY provider and existing bunny fields)
  if (
    lesson.mediaProvider === "BUNNY" ||
    Boolean(lesson.bunnyVideoId) ||
    Boolean(lesson.bunnyCdnUrl)
  ) {
    if (type === "video" && lesson.bunnyVideoId) {
      if (!isBunnyStreamConfigured()) {
        console.error("Lesson has Bunny video but Bunny Stream is not configured");
        return null;
      }
      return getSecurePlaybackUrl(
        lesson.bunnyVideoId,
        expiresIn || SIGNED_URL_EXPIRY.VIDEO,
        "embed"
      );
    }
    if (type === "pdf" && lesson.bunnyCdnUrl) {
      return lesson.bunnyCdnUrl;
    }
  }

  // R2 fallback (only for legacy content where Bunny fields are absent)
  const key = type === "video" ? lesson.videoKey : lesson.pdfKey;
  if (!key) return null;

  const expiry = expiresIn || (type === "video" ? SIGNED_URL_EXPIRY.VIDEO : SIGNED_URL_EXPIRY.PDF);
  return createPresignedDownloadUrl(key, expiry);
}

/**
 * Resolve the thumbnail URL for a course.
 * Checks for Bunny CDN URL first, then falls back to R2 presigned URL.
 */
export async function getThumbnailUrl(
  course: {
    thumbnailKey?: string | null;
    thumbnailCdnUrl?: string | null;
  },
  expiresIn?: number
): Promise<string | null> {
  // Bunny CDN URL takes priority
  if (course.thumbnailCdnUrl) {
    return course.thumbnailCdnUrl;
  }

  // R2 fallback
  if (course.thumbnailKey) {
    return createPresignedDownloadUrl(
      course.thumbnailKey,
      expiresIn || SIGNED_URL_EXPIRY.THUMBNAIL
    );
  }

  return null;
}

/**
 * Delete a specific media asset (video or PDF) for a lesson.
 * Only deletes old assets if they differ from the new asset being saved.
 */
export async function deleteLessonMediaAsset(
  lesson: {
    videoKey?: string | null;
    pdfKey?: string | null;
    bunnyVideoId?: string | null;
    bunnyCdnUrl?: string | null;
  },
  type: "video" | "pdf",
  newKeyOrUrl?: string | null
): Promise<void> {
  const deleteOps: Promise<unknown>[] = [];

  if (type === "video") {
    if (lesson.videoKey && lesson.videoKey !== newKeyOrUrl) {
      deleteOps.push(deleteR2Object(lesson.videoKey).catch(() => {}));
    }
    if (lesson.bunnyVideoId && lesson.bunnyVideoId !== newKeyOrUrl) {
      const { deleteBunnyVideo } = await import("./bunny/stream");
      deleteOps.push(deleteBunnyVideo(lesson.bunnyVideoId).catch(() => {}));
    }
  } else if (type === "pdf") {
    if (lesson.pdfKey && lesson.pdfKey !== newKeyOrUrl) {
      deleteOps.push(deleteR2Object(lesson.pdfKey).catch(() => {}));
    }
    if (lesson.bunnyCdnUrl && lesson.bunnyCdnUrl !== newKeyOrUrl) {
      try {
        const { deleteFromBunnyStorage, bunnyCdnConfig } = await import("./bunny");
        if (lesson.bunnyCdnUrl.startsWith(bunnyCdnConfig.baseUrl)) {
          const path = lesson.bunnyCdnUrl.replace(bunnyCdnConfig.baseUrl + "/", "");
          deleteOps.push(deleteFromBunnyStorage(path).catch(() => {}));
        }
      } catch {
        // Bunny not configured, skip
      }
    }
  }

  await Promise.allSettled(deleteOps);
}

/**
 * Delete all media assets for a lesson (handles both R2 and Bunny).
 */
export async function deleteMediaAssets(lesson: {
  mediaProvider?: string | null;
  videoKey?: string | null;
  pdfKey?: string | null;
  bunnyVideoId?: string | null;
  bunnyCdnUrl?: string | null;
}): Promise<void> {
  await Promise.allSettled([
    deleteLessonMediaAsset(lesson, "video"),
    deleteLessonMediaAsset(lesson, "pdf"),
  ]);
}

/**
 * Delete thumbnail assets for a course (handles both R2 and Bunny).
 * Only deletes old assets if they differ from the new thumbnail being saved.
 */
export async function deleteThumbnailAssets(
  course: {
    thumbnailKey?: string | null;
    thumbnailCdnUrl?: string | null;
  },
  newKeyOrUrl?: string | null
): Promise<void> {
  const deleteOps: Promise<unknown>[] = [];

  if (course.thumbnailKey && course.thumbnailKey !== newKeyOrUrl) {
    deleteOps.push(deleteR2Object(course.thumbnailKey).catch(() => {}));
  }

  if (course.thumbnailCdnUrl && course.thumbnailCdnUrl !== newKeyOrUrl) {
    try {
      const { deleteFromBunnyStorage, bunnyCdnConfig } = await import("./bunny");
      if (course.thumbnailCdnUrl.startsWith(bunnyCdnConfig.baseUrl)) {
        const path = course.thumbnailCdnUrl.replace(bunnyCdnConfig.baseUrl + "/", "");
        deleteOps.push(deleteFromBunnyStorage(path).catch(() => {}));
      }
    } catch {
      // Bunny not configured, skip
    }
  }

  await Promise.allSettled(deleteOps);
}
