-- AlterTable: Add Bunny Media Infrastructure fields
-- Migration: add_bunny_media_fields

-- Course: Add Bunny CDN thumbnail URL
ALTER TABLE "courses" ADD COLUMN "thumbnailCdnUrl" TEXT;

-- Lesson: Add Bunny Stream video ID, CDN URL, and media provider
ALTER TABLE "lessons" ADD COLUMN "bunnyVideoId" TEXT;
ALTER TABLE "lessons" ADD COLUMN "bunnyCdnUrl" TEXT;
ALTER TABLE "lessons" ADD COLUMN "mediaProvider" TEXT;
