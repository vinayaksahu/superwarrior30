import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { isBunnyStreamConfigured, createDirectVideoUploadAuth } from "@/lib/bunny";
import { BUNNY_MAX_VIDEO_SIZE } from "@/lib/constants";

/**
 * POST /api/bunny/create-upload
 *
 * Authenticated ADMIN endpoint to authorize direct-to-Bunny TUS video uploads.
 * Creates a video entry in Bunny Stream Library and returns temporary upload signature.
 * The video binary is uploaded directly from the browser to Bunny (never touches Next.js).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    if (!isBunnyStreamConfigured()) {
      return NextResponse.json(
        { success: false, error: "Bunny Stream is not configured in environment variables." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { title, filename, fileSize, courseId, lessonId } = body;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "courseId is required." },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found." },
        { status: 404 }
      );
    }

    // If lessonId is provided, verify lesson belongs to course
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { select: { courseId: true } } },
      });

      if (!lesson || lesson.module.courseId !== courseId) {
        return NextResponse.json(
          { success: false, error: "Lesson not found or does not belong to this course." },
          { status: 404 }
        );
      }
    }

    // Validate filename & extension
    if (filename) {
      const ext = filename.split(".").pop()?.toLowerCase();
      const allowedVideoExtensions = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
      if (!ext || !allowedVideoExtensions.includes(ext)) {
        return NextResponse.json(
          { success: false, error: `Invalid video format (.${ext}). Allowed: ${allowedVideoExtensions.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate file size
    if (fileSize && typeof fileSize === "number") {
      if (fileSize <= 0) {
        return NextResponse.json(
          { success: false, error: "File size must be greater than zero." },
          { status: 400 }
        );
      }
      if (fileSize > BUNNY_MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size exceeds the 2GB limit (current: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).` },
          { status: 400 }
        );
      }
    }

    const videoTitle = title || `${course.title} - ${filename || "Lesson Video"}`;

    // Create Bunny Stream video entry and generate temporary upload signature
    const authData = await createDirectVideoUploadAuth(videoTitle, undefined, 7200); // 2 hours validity

    return NextResponse.json({
      success: true,
      ...authData,
    });
  } catch (error: unknown) {
    console.error("Direct Bunny Video Upload Authorization Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to initialize video upload";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
