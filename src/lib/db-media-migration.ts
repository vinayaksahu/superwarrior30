import "server-only";
import { getProductionPrismaClient, getTestPrismaClient } from "@/lib/prisma";
import type { AppEnvironment } from "@/lib/env-context";

let isMigratedProduction = false;
let isMigratedTest = false;

const MIGRATION_SQL = `
DO $$ BEGIN
  CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'PDF', 'IMAGE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaUploadStatus" AS ENUM ('QUEUED', 'UPLOADING', 'UPLOADED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaStatus" AS ENUM ('QUEUED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mediaType" "MediaType" NOT NULL DEFAULT 'VIDEO',
  "mimeType" TEXT NOT NULL,
  "fileSize" BIGINT NOT NULL DEFAULT 0,
  "storageProvider" TEXT NOT NULL DEFAULT 'BUNNY',
  "storageKey" TEXT,
  "storageUrl" TEXT,
  "bunnyVideoId" TEXT,
  "thumbnailUrl" TEXT,
  "duration" INTEGER DEFAULT 0,
  "pageCount" INTEGER DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "checksum" TEXT,
  "uploadStatus" "MediaUploadStatus" NOT NULL DEFAULT 'QUEUED',
  "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "status" "MediaStatus" NOT NULL DEFAULT 'QUEUED',
  "errorMessage" TEXT,
  "uploadedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "isTestData" BOOLEAN NOT NULL DEFAULT true,
  "environment" TEXT NOT NULL DEFAULT 'LIVE',
  "deletedAt" TIMESTAMP(3),
  "deletedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "lesson_media" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "mediaId" TEXT NOT NULL REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  "mediaRole" TEXT NOT NULL DEFAULT 'PRIMARY',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isTestData" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("lessonId", "mediaId", "mediaRole")
);

CREATE INDEX IF NOT EXISTS "media_assets_mediaType_status_idx" ON "media_assets"("mediaType", "status");
CREATE INDEX IF NOT EXISTS "media_assets_status_createdAt_idx" ON "media_assets"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "media_assets_checksum_idx" ON "media_assets"("checksum");
CREATE INDEX IF NOT EXISTS "media_assets_isTestData_deletedAt_status_idx" ON "media_assets"("isTestData", "deletedAt", "status");
CREATE INDEX IF NOT EXISTS "media_assets_uploadedById_idx" ON "media_assets"("uploadedById");
CREATE INDEX IF NOT EXISTS "media_assets_environment_isTestData_idx" ON "media_assets"("environment", "isTestData");

CREATE INDEX IF NOT EXISTS "lesson_media_lessonId_idx" ON "lesson_media"("lessonId");
CREATE INDEX IF NOT EXISTS "lesson_media_mediaId_idx" ON "lesson_media"("mediaId");
CREATE INDEX IF NOT EXISTS "lesson_media_isTestData_lessonId_idx" ON "lesson_media"("isTestData", "lessonId");
`;

/**
 * Ensures media tables and indexes exist in the target database
 */
export async function ensureMediaTablesExist(env: AppEnvironment = "LIVE"): Promise<void> {
  if (env === "LIVE" && isMigratedProduction) return;
  if (env === "TEST" && isMigratedTest) return;

  try {
    const client = env === "TEST" ? getTestPrismaClient() : getProductionPrismaClient();
    await client.$executeRawUnsafe(MIGRATION_SQL);
    if (env === "LIVE") isMigratedProduction = true;
    if (env === "TEST") isMigratedTest = true;
  } catch (error) {
    console.warn(`[DB Self-Healing Migration] Could not verify media tables for ${env}:`, error);
  }
}
