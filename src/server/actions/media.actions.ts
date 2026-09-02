"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/server/dal/auth";
import { hasPermission } from "@/lib/permissions";
import { resolveCurrentEnvironment, type AppEnvironment } from "@/lib/env-context";
import { ensureMediaTablesExist } from "@/lib/db-media-migration";
import {
  getResolvedBunnyConfig,
  createDirectVideoUploadAuth,
  getVideoStatus,
  getSecurePlaybackUrl,
  uploadToBunnyStorage,
  getBunnyCdnUrl,
} from "@/lib/bunny";
import { BUNNY_MAX_VIDEO_SIZE } from "@/lib/constants";

// Helper to serialize BigInt fields to numbers/strings for Next.js Server Action boundary
function serializeMediaAsset(asset: any) {
  if (!asset) return null;
  return {
    ...asset,
    fileSize: typeof asset.fileSize === "bigint" ? Number(asset.fileSize) : asset.fileSize,
  };
}

/**
 * Audit log helper for Media operations
 */
async function logMediaAudit(
  actor: { id: string; email: string; role?: string },
  action: string,
  mediaId: string,
  details?: Record<string, any>,
  env: AppEnvironment = "LIVE"
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role || "ADMIN",
        action,
        entityType: "MediaAsset",
        entityId: mediaId,
        newValues: details ? JSON.parse(JSON.stringify(details)) : undefined,
        isTestData: env === "TEST",
      },
    });
  } catch (error) {
    console.warn("Could not write media audit log:", error);
  }
}

/**
 * 1. Get paginated, filtered & searchable Media Assets
 */
export async function getMediaAssetsAction({
  page = 1,
  pageSize = 20,
  mediaType = "ALL",
  status = "ALL",
  usage = "ALL",
  search = "",
  sort = "newest",
}: {
  page?: number;
  pageSize?: number;
  mediaType?: "ALL" | "VIDEO" | "PDF" | "IMAGE";
  status?: "ALL" | "READY" | "PROCESSING" | "UPLOADING" | "FAILED";
  usage?: "ALL" | "USED" | "UNUSED";
  search?: string;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc";
} = {}) {
  const user = await requireAdmin();
  if (!hasPermission(user, "media.view")) {
    return {
      success: false,
      error: "Access Denied: You do not have permission to view the media library.",
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      currentEnvironment: env,
    };
  }

  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  const where: any = {
    deletedAt: null,
  };

  if (mediaType && mediaType !== "ALL") {
    where.mediaType = mediaType;
  }

  if (status && status !== "ALL") {
    if (status === "READY") {
      where.status = "READY";
    } else if (status === "PROCESSING") {
      where.status = { in: ["PROCESSING", "UPLOADED"] };
    } else if (status === "UPLOADING") {
      where.status = { in: ["QUEUED", "UPLOADING"] };
    } else if (status === "FAILED") {
      where.status = "FAILED";
    }
  }

  if (usage === "USED") {
    where.lessonMedia = { some: {} };
  } else if (usage === "UNUSED") {
    where.lessonMedia = { none: {} };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { fileName: { contains: q, mode: "insensitive" } },
      { originalFileName: { contains: q, mode: "insensitive" } },
      { id: { contains: q } },
      { bunnyVideoId: { contains: q } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "name_asc") {
    orderBy = { fileName: "asc" };
  } else if (sort === "name_desc") {
    orderBy = { fileName: "desc" };
  } else if (sort === "size_desc") {
    orderBy = { fileSize: "desc" };
  } else if (sort === "size_asc") {
    orderBy = { fileSize: "asc" };
  }

  try {
    const [rawAssets, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { lessonMedia: true },
          },
        },
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    // Auto-sync status of any pending/uploading Bunny videos on fetch
    const pendingVideos = rawAssets.filter(
      (a: any) => a.mediaType === "VIDEO" && a.bunnyVideoId && (a.status !== "READY" || a.duration === 0)
    );

    if (pendingVideos.length > 0) {
      await Promise.allSettled(
        pendingVideos.map(async (asset: any) => {
          try {
            const vidStatus = await getVideoStatus(asset.bunnyVideoId);
            if (vidStatus.isReady) {
              const updated = await prisma.mediaAsset.update({
                where: { id: asset.id },
                data: {
                  uploadStatus: "UPLOADED",
                  processingStatus: "READY",
                  status: "READY",
                  duration: vidStatus.durationSec > 0 ? vidStatus.durationSec : asset.duration,
                  width: vidStatus.width || asset.width,
                  height: vidStatus.height || asset.height,
                  thumbnailUrl: vidStatus.thumbnailUrl || asset.thumbnailUrl,
                },
              });
              asset.status = "READY";
              asset.uploadStatus = "UPLOADED";
              asset.processingStatus = "READY";
              asset.duration = updated.duration;
              asset.width = updated.width;
              asset.height = updated.height;
              asset.thumbnailUrl = updated.thumbnailUrl;
            } else if (vidStatus.isUploaded && asset.status === "UPLOADING") {
              await prisma.mediaAsset.update({
                where: { id: asset.id },
                data: {
                  uploadStatus: "UPLOADED",
                  processingStatus: "PROCESSING",
                  status: "PROCESSING",
                },
              });
              asset.status = "PROCESSING";
              asset.uploadStatus = "UPLOADED";
              asset.processingStatus = "PROCESSING";
            } else if (vidStatus.status === "FAILED") {
              await prisma.mediaAsset.update({
                where: { id: asset.id },
                data: {
                  processingStatus: "FAILED",
                  status: "FAILED",
                  errorMessage: "Transcoding failed on Bunny Stream.",
                },
              });
              asset.status = "FAILED";
              asset.processingStatus = "FAILED";
            }
          } catch (e) {
            console.warn(`Could not sync status for video ${asset.bunnyVideoId}:`, e);
          }
        })
      );
    }

    const serializedAssets = rawAssets.map((asset: any) => ({
      ...serializeMediaAsset(asset),
      usageCount: asset._count?.lessonMedia || 0,
    }));

    return {
      success: true,
      data: serializedAssets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      currentEnvironment: env,
    };
  } catch (error: any) {
    console.error("Error in getMediaAssetsAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to load media assets",
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      currentEnvironment: env,
    };
  }
}

/**
 * 2. Get Media Asset Details by ID (including usages and playback URLs)
 */
export async function getMediaAssetDetailsAction(mediaId: string) {
  await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        lessonMedia: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                slug: true,
                contentType: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    course: {
                      select: {
                        id: true,
                        title: true,
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset || asset.deletedAt) {
      return { success: false, error: "Media asset not found or has been deleted." };
    }

    let playbackUrl: string | null = null;
    if (asset.mediaType === "VIDEO" && asset.bunnyVideoId) {
      try {
        const config = await getResolvedBunnyConfig();
        const vidStatus = await getVideoStatus(asset.bunnyVideoId);

        if (vidStatus.isReady && asset.status !== "READY") {
          const updated = await prisma.mediaAsset.update({
            where: { id: mediaId },
            data: {
              uploadStatus: "UPLOADED",
              processingStatus: "READY",
              status: "READY",
              duration: vidStatus.durationSec > 0 ? vidStatus.durationSec : asset.duration,
              width: vidStatus.width || asset.width,
              height: vidStatus.height || asset.height,
              thumbnailUrl: vidStatus.thumbnailUrl || asset.thumbnailUrl,
            },
          });
          asset.status = "READY";
          asset.uploadStatus = "UPLOADED";
          asset.processingStatus = "READY";
          asset.duration = updated.duration;
          asset.thumbnailUrl = updated.thumbnailUrl;
        } else if (vidStatus.isUploaded && asset.status === "UPLOADING") {
          await prisma.mediaAsset.update({
            where: { id: mediaId },
            data: {
              uploadStatus: "UPLOADED",
              processingStatus: "PROCESSING",
              status: "PROCESSING",
            },
          });
          asset.status = "PROCESSING";
        }

        if (config.streamLibraryId) {
          playbackUrl = getSecurePlaybackUrl(asset.bunnyVideoId, 7200, "embed", config.streamLibraryId);
        }
      } catch {}
    } else if (asset.storageUrl) {
      playbackUrl = asset.storageUrl;
    } else if (asset.storageKey) {
      try {
        playbackUrl = await getBunnyCdnUrl(asset.storageKey);
      } catch {}
    }

    const usages = asset.lessonMedia.map((lm: any) => ({
      lessonId: lm.lesson.id,
      lessonTitle: lm.lesson.title,
      contentType: lm.lesson.contentType,
      moduleId: lm.lesson.module.id,
      moduleTitle: lm.lesson.module.title,
      courseId: lm.lesson.module.course.id,
      courseTitle: lm.lesson.module.course.title,
      courseSlug: lm.lesson.module.course.slug,
      mediaRole: lm.mediaRole,
      attachedAt: lm.createdAt,
    }));

    return {
      success: true,
      data: {
        ...serializeMediaAsset(asset),
        playbackUrl,
        usages,
        usageCount: usages.length,
      },
    };
  } catch (error: any) {
    console.error("Error in getMediaAssetDetailsAction:", error);
    return { success: false, error: error?.message || "Failed to fetch media details." };
  }
}

/**
 * 3. Check for Duplicate Media by Checksum or Filename + Size
 */
export async function checkDuplicateMediaAction({
  checksum,
  fileName,
  fileSize,
}: {
  checksum?: string;
  fileName?: string;
  fileSize?: number;
}) {
  await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    let existingAsset: any = null;

    if (checksum && checksum.trim()) {
      existingAsset = await prisma.mediaAsset.findFirst({
        where: {
          checksum: checksum.trim(),
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!existingAsset && fileName && fileSize) {
      existingAsset = await prisma.mediaAsset.findFirst({
        where: {
          originalFileName: fileName,
          fileSize: BigInt(fileSize),
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (existingAsset) {
      return {
        exists: true,
        media: serializeMediaAsset(existingAsset),
      };
    }

    return { exists: false, media: null };
  } catch (error) {
    console.warn("Duplicate media check skipped:", error);
    return { exists: false, media: null };
  }
}

/**
 * 4. Create Media Upload Session
 * - Authorizes direct TUS upload for videos with Bunny Stream signature
 * - Pre-creates DB record in QUEUED / UPLOADING state
 */
export async function createMediaUploadSessionAction({
  fileName,
  originalFileName,
  mediaType,
  mimeType,
  fileSize,
  checksum,
  duration,
  pageCount,
}: {
  fileName: string;
  originalFileName: string;
  mediaType: "VIDEO" | "PDF" | "IMAGE" | "OTHER";
  mimeType: string;
  fileSize: number;
  checksum?: string;
  duration?: number;
  pageCount?: number;
}) {
  const user = await requireAdmin();
  if (!hasPermission(user, "media.upload")) {
    return {
      success: false,
      error: "Access Denied: You do not have permission to upload media assets.",
    };
  }

  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  if (!fileName || !originalFileName) {
    return { success: false, error: "File name is required." };
  }

  if (fileSize <= 0) {
    return { success: false, error: "File size must be greater than zero." };
  }

  if (mediaType === "VIDEO" && fileSize > BUNNY_MAX_VIDEO_SIZE) {
    return {
      success: false,
      error: `Video exceeds the 2GB limit (current: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  try {
    const config = await getResolvedBunnyConfig();

    if (mediaType === "VIDEO") {
      if (!config.streamLibraryId || !config.streamApiKey) {
        return {
          success: false,
          error: "Bunny Stream is not configured. Please configure Bunny Stream in Admin Settings → Media Storage.",
        };
      }

      // 1. Authorize video upload directly to Bunny Stream with TUS
      const cleanTitle = fileName.replace(/\.[^/.]+$/, "");
      const authData = await createDirectVideoUploadAuth(cleanTitle, fileSize, 7200);

      // 2. Create MediaAsset in Neon database
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          fileName,
          originalFileName,
          mediaType: "VIDEO",
          mimeType: mimeType || "video/mp4",
          fileSize: BigInt(fileSize),
          storageProvider: "BUNNY",
          bunnyVideoId: authData.videoId,
          thumbnailUrl: `https://vz-${config.streamLibraryId}.b-cdn.net/${authData.videoId}/thumbnail.jpg`,
          duration: duration || 0,
          checksum: checksum || null,
          uploadStatus: "UPLOADING",
          processingStatus: "PENDING",
          status: "UPLOADING",
          uploadedById: user.id,
          environment: env,
          isTestData: env === "TEST",
        },
      });

      await logMediaAudit(user, "MEDIA_UPLOAD_STARTED", mediaAsset.id, {
        fileName,
        mediaType: "VIDEO",
        bunnyVideoId: authData.videoId,
      }, env);

      return {
        success: true,
        mediaId: mediaAsset.id,
        uploadAuth: authData,
        media: serializeMediaAsset(mediaAsset),
      };
    }

    // PDF, Image, or Other files
    const cleanExt = (fileName.split(".").pop() || "bin").toLowerCase();
    const uniqueId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = `media/${mediaType.toLowerCase()}/${uniqueId}.${cleanExt}`;

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        fileName,
        originalFileName,
        mediaType,
        mimeType: mimeType || (mediaType === "PDF" ? "application/pdf" : "image/jpeg"),
        fileSize: BigInt(fileSize),
        storageProvider: "BUNNY",
        storageKey: storagePath,
        pageCount: pageCount || 0,
        checksum: checksum || null,
        uploadStatus: "QUEUED",
        processingStatus: "PENDING",
        status: "QUEUED",
        uploadedById: user.id,
        environment: env,
        isTestData: env === "TEST",
      },
    });

    await logMediaAudit(user, "MEDIA_UPLOAD_STARTED", mediaAsset.id, {
      fileName,
      mediaType,
      storageKey: storagePath,
    }, env);

    return {
      success: true,
      mediaId: mediaAsset.id,
      storageKey: storagePath,
      media: serializeMediaAsset(mediaAsset),
    };
  } catch (error: any) {
    console.error("Error in createMediaUploadSessionAction:", error);
    return { success: false, error: error?.message || "Failed to initialize media upload session." };
  }
}

/**
 * 5. Complete Media Upload (Called when client finished uploading binary)
 */
export async function completeMediaUploadAction({
  mediaId,
  bunnyVideoId,
  storageKey,
  storageUrl,
  duration,
  pageCount,
  width,
  height,
}: {
  mediaId: string;
  bunnyVideoId?: string;
  storageKey?: string;
  storageUrl?: string;
  duration?: number;
  pageCount?: number;
  width?: number;
  height?: number;
}) {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const existing = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!existing) {
      return { success: false, error: "Media asset not found." };
    }

    if (existing.mediaType === "VIDEO") {
      const vidId = bunnyVideoId || existing.bunnyVideoId;
      let isReady = false;
      let videoDuration = duration || existing.duration || 0;

      if (vidId) {
        try {
          const vidStatus = await getVideoStatus(vidId);
          if (vidStatus.isReady || vidStatus.status === "FINISHED" || (vidStatus.encodeProgress && vidStatus.encodeProgress >= 100)) {
            isReady = true;
          }
          if (vidStatus.durationSec > 0) {
            videoDuration = vidStatus.durationSec;
          }
        } catch {}
      }

      const updated = await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          bunnyVideoId: vidId,
          uploadStatus: "UPLOADED",
          processingStatus: isReady ? "READY" : "PROCESSING",
          status: isReady ? "READY" : "PROCESSING",
          duration: videoDuration,
        },
      });

      await logMediaAudit(user, isReady ? "MEDIA_READY" : "MEDIA_UPLOADED", mediaId, {
        bunnyVideoId: vidId,
        status: updated.status,
      }, env);

      revalidatePath("/admin/media");
      return { success: true, media: serializeMediaAsset(updated), isReady };
    }

    // PDFs and Images are immediately READY once uploaded to CDN
    const cdnUrl = storageUrl || (storageKey ? await getBunnyCdnUrl(storageKey) : existing.storageUrl);

    const updated = await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        storageKey: storageKey || existing.storageKey,
        storageUrl: cdnUrl,
        thumbnailUrl: existing.mediaType === "IMAGE" ? cdnUrl : existing.thumbnailUrl,
        pageCount: pageCount !== undefined ? pageCount : existing.pageCount,
        width: width || existing.width,
        height: height || existing.height,
        uploadStatus: "UPLOADED",
        processingStatus: "READY",
        status: "READY",
      },
    });

    await logMediaAudit(user, "MEDIA_READY", mediaId, {
      storageUrl: cdnUrl,
      mediaType: existing.mediaType,
    }, env);

    revalidatePath("/admin/media");
    return { success: true, media: serializeMediaAsset(updated), isReady: true };
  } catch (error: any) {
    console.error("Error in completeMediaUploadAction:", error);
    return { success: false, error: error?.message || "Failed to complete media upload." };
  }
}

/**
 * 6. Poll Media Processing Status (Bunny Stream transcoding progress)
 */
export async function pollMediaProcessingStatusAction(mediaId: string) {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset || asset.deletedAt) {
      return { success: false, error: "Media asset not found." };
    }

    if (asset.mediaType !== "VIDEO" || !asset.bunnyVideoId) {
      return {
        success: true,
        status: asset.status,
        processingStatus: asset.processingStatus,
        isReady: asset.status === "READY",
        encodeProgress: 100,
      };
    }

    // Query Bunny Stream video status
    const vidStatus = await getVideoStatus(asset.bunnyVideoId);
    const isFinished = vidStatus.isReady;
    const isFailed = vidStatus.status === "FAILED";

    if (isFinished && asset.status !== "READY") {
      const updated = await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          uploadStatus: "UPLOADED",
          processingStatus: "READY",
          status: "READY",
          duration: vidStatus.durationSec > 0 ? vidStatus.durationSec : asset.duration,
          width: vidStatus.width || asset.width,
          height: vidStatus.height || asset.height,
          thumbnailUrl: vidStatus.thumbnailUrl || asset.thumbnailUrl,
        },
      });

      await logMediaAudit(user, "MEDIA_READY", mediaId, {
        bunnyVideoId: asset.bunnyVideoId,
        duration: updated.duration,
      }, env);

      revalidatePath("/admin/media");
      return {
        success: true,
        status: "READY",
        processingStatus: "READY",
        isReady: true,
        encodeProgress: 100,
        durationSec: updated.duration,
        thumbnailUrl: updated.thumbnailUrl,
      };
    }

    if (vidStatus.isUploaded && asset.status === "UPLOADING") {
      await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          uploadStatus: "UPLOADED",
          processingStatus: "PROCESSING",
          status: "PROCESSING",
        },
      });
    }

    if (isFailed && asset.status !== "FAILED") {
      await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          processingStatus: "FAILED",
          status: "FAILED",
          errorMessage: "Transcoding failed on Bunny Stream.",
        },
      });

      await logMediaAudit(user, "MEDIA_FAILED", mediaId, {
        bunnyVideoId: asset.bunnyVideoId,
        reason: "Bunny Stream transcoding failure",
      }, env);

      revalidatePath("/admin/media");
      return {
        success: true,
        status: "FAILED",
        processingStatus: "FAILED",
        isReady: false,
        encodeProgress: 0,
        errorMessage: "Transcoding failed on Bunny Stream.",
      };
    }

    return {
      success: true,
      status: asset.status === "UPLOADING" && vidStatus.isUploaded ? "PROCESSING" : asset.status,
      processingStatus: asset.processingStatus,
      isReady: asset.status === "READY" || isFinished,
      encodeProgress: vidStatus.encodeProgress || 0,
      durationSec: vidStatus.durationSec || asset.duration,
      thumbnailUrl: vidStatus.thumbnailUrl || asset.thumbnailUrl,
    };
  } catch (error: any) {
    console.error("Error in pollMediaProcessingStatusAction:", error);
    return { success: false, error: error?.message || "Failed to check media status." };
  }
}

/**
 * Sync all pending or non-ready video assets with Bunny Stream
 */
export async function syncAllPendingMediaAction() {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const pending = await prisma.mediaAsset.findMany({
      where: {
        mediaType: "VIDEO",
        bunnyVideoId: { not: null },
        deletedAt: null,
        status: { in: ["UPLOADING", "PROCESSING", "QUEUED"] },
      },
    });

    let updatedCount = 0;

    await Promise.allSettled(
      pending.map(async (asset: any) => {
        try {
          if (!asset.bunnyVideoId) return;
          const vidStatus = await getVideoStatus(asset.bunnyVideoId);

          if (vidStatus.isReady) {
            await prisma.mediaAsset.update({
              where: { id: asset.id },
              data: {
                uploadStatus: "UPLOADED",
                processingStatus: "READY",
                status: "READY",
                duration: vidStatus.durationSec > 0 ? vidStatus.durationSec : asset.duration,
                width: vidStatus.width || asset.width,
                height: vidStatus.height || asset.height,
                thumbnailUrl: vidStatus.thumbnailUrl || asset.thumbnailUrl,
              },
            });
            updatedCount++;
          } else if (vidStatus.isUploaded && asset.status === "UPLOADING") {
            await prisma.mediaAsset.update({
              where: { id: asset.id },
              data: {
                uploadStatus: "UPLOADED",
                processingStatus: "PROCESSING",
                status: "PROCESSING",
              },
            });
            updatedCount++;
          } else if (vidStatus.status === "FAILED") {
            await prisma.mediaAsset.update({
              where: { id: asset.id },
              data: {
                processingStatus: "FAILED",
                status: "FAILED",
                errorMessage: "Transcoding failed on Bunny Stream.",
              },
            });
            updatedCount++;
          }
        } catch (e) {
          console.warn(`Could not sync video ${asset.bunnyVideoId}:`, e);
        }
      })
    );

    revalidatePath("/admin/media");
    return { success: true, updatedCount };
  } catch (error: any) {
    console.error("Error in syncAllPendingMediaAction:", error);
    return { success: false, error: error?.message || "Failed to sync pending media assets." };
  }
}

/**
 * 7. Attach READY Media Asset to Course Lesson
 */
export async function attachMediaToLessonAction({
  lessonId,
  mediaId,
  mediaRole = "PRIMARY",
}: {
  lessonId: string;
  mediaId: string;
  mediaRole?: "PRIMARY" | "ATTACHMENT" | "SUPPLEMENTARY";
}) {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    // 1. Validate Lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true, id: true } } },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }

    // 2. Validate Media Asset
    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media || media.deletedAt) {
      return { success: false, error: "Media asset not found or has been deleted." };
    }

    // 3. Strict Verification: Must be READY
    if (media.status !== "READY" && media.processingStatus !== "READY") {
      return {
        success: false,
        error: `Cannot attach media in '${media.status}' state. Media must be READY before attaching.`,
      };
    }

    // 4. Strict Verification: Type Compatibility
    if (lesson.contentType === "VIDEO" && media.mediaType !== "VIDEO") {
      return {
        success: false,
        error: `Incompatible media type. Video lessons require a VIDEO media asset (selected: ${media.mediaType}).`,
      };
    }

    if (lesson.contentType === "PDF" && media.mediaType !== "PDF") {
      return {
        success: false,
        error: `Incompatible media type. PDF documents require a PDF media asset (selected: ${media.mediaType}).`,
      };
    }

    // 5. Upsert LessonMedia relationship
    await prisma.lessonMedia.upsert({
      where: {
        lessonId_mediaId_mediaRole: {
          lessonId,
          mediaId,
          mediaRole,
        },
      },
      create: {
        lessonId,
        mediaId,
        mediaRole,
        isTestData: env === "TEST",
      },
      update: {
        mediaRole,
      },
    });

    // 6. Synchronize legacy lesson columns for 100% backward compatibility
    if (media.mediaType === "VIDEO") {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          bunnyVideoId: media.bunnyVideoId,
          videoKey: media.storageKey,
          mediaProvider: "BUNNY",
          durationSec: media.duration && media.duration > 0 ? media.duration : lesson.durationSec,
        },
      });
    } else if (media.mediaType === "PDF") {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          bunnyCdnUrl: media.storageUrl,
          pdfKey: media.storageKey,
          mediaProvider: "BUNNY",
        },
      });
    }

    await logMediaAudit(user, "MEDIA_ATTACHED", mediaId, {
      lessonId,
      lessonTitle: lesson.title,
      courseId: lesson.module.courseId,
    }, env);

    revalidatePath(`/admin/courses/${lesson.module.courseId}`);
    revalidatePath("/admin/media");

    return {
      success: true,
      message: `Media "${media.fileName}" attached to lesson successfully!`,
      media: serializeMediaAsset(media),
    };
  } catch (error: any) {
    console.error("Error in attachMediaToLessonAction:", error);
    return { success: false, error: error?.message || "Failed to attach media to lesson." };
  }
}

/**
 * 8. Detach Media Asset from Course Lesson
 */
export async function detachMediaFromLessonAction({
  lessonId,
  mediaId,
}: {
  lessonId: string;
  mediaId: string;
}) {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }

    await prisma.lessonMedia.deleteMany({
      where: { lessonId, mediaId },
    });

    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (media) {
      if (media.mediaType === "VIDEO" && lesson.bunnyVideoId === media.bunnyVideoId) {
        await prisma.lesson.update({
          where: { id: lessonId },
          data: { bunnyVideoId: null, videoKey: null },
        });
      } else if (media.mediaType === "PDF" && lesson.bunnyCdnUrl === media.storageUrl) {
        await prisma.lesson.update({
          where: { id: lessonId },
          data: { bunnyCdnUrl: null, pdfKey: null },
        });
      }
    }

    await logMediaAudit(user, "MEDIA_DETACHED", mediaId, {
      lessonId,
      courseId: lesson.module.courseId,
    }, env);

    revalidatePath(`/admin/courses/${lesson.module.courseId}`);
    revalidatePath("/admin/media");

    return { success: true, message: "Media detached from lesson." };
  } catch (error: any) {
    console.error("Error in detachMediaFromLessonAction:", error);
    return { success: false, error: error?.message || "Failed to detach media from lesson." };
  }
}

/**
 * 9. Delete Media Asset (Enforces Delete Protection & Soft Deletion)
 */
export async function deleteMediaAssetAction(mediaId: string) {
  const user = await requireAdmin();
  if (!hasPermission(user, "media.delete")) {
    return {
      success: false,
      error: "Access Denied: You do not have permission to delete media assets.",
    };
  }

  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: {
        lessonMedia: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                module: {
                  select: {
                    title: true,
                    course: {
                      select: { id: true, title: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset || asset.deletedAt) {
      return { success: false, error: "Media asset not found or already deleted." };
    }

    // Delete Protection: Block if used in any lesson
    if (asset.lessonMedia && asset.lessonMedia.length > 0) {
      const blockingUsages = asset.lessonMedia.map((lm: any) => ({
        courseTitle: lm.lesson.module.course.title,
        moduleTitle: lm.lesson.module.title,
        lessonTitle: lm.lesson.title,
      }));

      return {
        success: false,
        error: "Cannot Delete Media: This media is currently attached to one or more lessons.",
        isProtected: true,
        usedIn: blockingUsages,
      };
    }

    // Soft deletion
    await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
      },
    });

    await logMediaAudit(user, "MEDIA_DELETED", mediaId, {
      fileName: asset.fileName,
      mediaType: asset.mediaType,
    }, env);

    revalidatePath("/admin/media");
    return { success: true, message: `Media "${asset.fileName}" removed from library.` };
  } catch (error: any) {
    console.error("Error in deleteMediaAssetAction:", error);
    return { success: false, error: error?.message || "Failed to delete media asset." };
  }
}

/**
 * 10. Retry Failed Media Upload
 */
export async function retryMediaUploadAction(mediaId: string) {
  const user = await requireAdmin();
  const env = await resolveCurrentEnvironment();
  await ensureMediaTablesExist(env);

  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset || asset.deletedAt) {
      return { success: false, error: "Media asset not found." };
    }

    const config = await getResolvedBunnyConfig();

    if (asset.mediaType === "VIDEO") {
      if (!config.streamLibraryId || !config.streamApiKey) {
        return { success: false, error: "Bunny Stream is not configured." };
      }

      // Authorize new direct TUS upload signature reusing the video GUID if available or creating new
      let vidId = asset.bunnyVideoId;
      if (!vidId) {
        const cleanTitle = asset.fileName.replace(/\.[^/.]+$/, "");
        const authData = await createDirectVideoUploadAuth(cleanTitle, Number(asset.fileSize), 7200);
        vidId = authData.videoId;
      }

      const expirationTime = Math.floor(Date.now() / 1000) + 7200;
      const crypto = await import("crypto");
      const signature = crypto
        .createHash("sha256")
        .update(`${config.streamLibraryId}${config.streamApiKey}${expirationTime}${vidId}`)
        .digest("hex");

      await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          bunnyVideoId: vidId,
          uploadStatus: "UPLOADING",
          processingStatus: "PENDING",
          status: "UPLOADING",
          errorMessage: null,
        },
      });

      await logMediaAudit(user, "MEDIA_RETRY", mediaId, {
        bunnyVideoId: vidId,
      }, env);

      revalidatePath("/admin/media");

      return {
        success: true,
        mediaId: asset.id,
        uploadAuth: {
          videoId: vidId,
          libraryId: config.streamLibraryId,
          expirationTime,
          signature,
          endpoint: "https://video.bunnycdn.com/tusupload",
        },
      };
    }

    // Reset status for PDF/Image
    const updated = await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        uploadStatus: "QUEUED",
        processingStatus: "PENDING",
        status: "QUEUED",
        errorMessage: null,
      },
    });

    await logMediaAudit(user, "MEDIA_RETRY", mediaId, {
      storageKey: asset.storageKey,
    }, env);

    revalidatePath("/admin/media");

    return {
      success: true,
      mediaId: asset.id,
      storageKey: asset.storageKey,
      media: serializeMediaAsset(updated),
    };
  } catch (error: any) {
    console.error("Error in retryMediaUploadAction:", error);
    return { success: false, error: error?.message || "Failed to retry upload." };
  }
}
