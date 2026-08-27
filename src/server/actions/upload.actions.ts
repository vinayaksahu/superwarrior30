"use server";

import { requireAdmin } from "@/server/dal/auth";
import { isBunnyStreamConfigured, createDirectVideoUploadAuth } from "@/lib/bunny";
import { prisma } from "@/lib/prisma";
import { BUNNY_MAX_VIDEO_SIZE } from "@/lib/constants";

/**
 * Server action to authorize direct browser-to-Bunny Stream TUS video uploads.
 * Validates admin role, validates course/lesson, creates video entry on Bunny Stream,
 * and generates a short-lived SHA-256 upload signature.
 * Secrets never leave the server.
 */
export async function createBunnyDirectVideoUploadAction(input: {
  title?: string;
  filename: string;
  fileSize: number;
  courseId: string;
  lessonId?: string;
}) {
  try {
    const admin = await requireAdmin();
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    if (!isBunnyStreamConfigured()) {
      return { success: false, error: "Bunny Stream is not configured in environment variables." };
    }

    const { title, filename, fileSize, courseId, lessonId } = input;

    if (!courseId) {
      return { success: false, error: "courseId is required." };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return { success: false, error: "Course not found." };
    }

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { select: { courseId: true } } },
      });

      if (!lesson || lesson.module.courseId !== courseId) {
        return { success: false, error: "Lesson not found or does not belong to this course." };
      }
    }

    // Validate video format
    const ext = filename?.split(".").pop()?.toLowerCase();
    const allowedVideoExtensions = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
    if (!ext || !allowedVideoExtensions.includes(ext)) {
      return {
        success: false,
        error: `Invalid video format (.${ext}). Allowed formats: ${allowedVideoExtensions.join(", ")}`,
      };
    }

    // Validate size (up to 2GB)
    if (fileSize <= 0 || fileSize > BUNNY_MAX_VIDEO_SIZE) {
      return {
        success: false,
        error: `Video size must be between 1 byte and 2GB (current: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    const videoTitle = title || `${course.title} - ${filename}`;
    const authData = await createDirectVideoUploadAuth(videoTitle, undefined, 7200);

    return {
      success: true,
      ...authData,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to authorize video upload";
    return { success: false, error: msg };
  }
}
