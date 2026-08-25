import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    await ensureDatabaseSchemaSync();
    const { lessonId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const status = body.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";
    const watchTimeSeconds = Number(body.watchTimeSeconds || 0);
    const lastPositionSeconds = Number(body.lastPositionSeconds || 0);

    // Find lesson and parent course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: "Lesson not found." },
        { status: 404 }
      );
    }

    const courseId = lesson.module.courseId;

    // 1. Update or create lesson progress with self-healing ID
    try {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: user.id,
            lessonId,
          },
        },
        update: {
          status,
          watchTimeSeconds,
          lastPositionSeconds,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
        create: {
          id: crypto.randomUUID(),
          userId: user.id,
          lessonId,
          status,
          watchTimeSeconds,
          lastPositionSeconds,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
    } catch (upsertErr) {
      console.warn("LessonProgress upsert warning:", upsertErr);
    }

    // 2. Recalculate Course Enrollment progress percentage
    try {
      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({
          where: {
            module: { courseId },
            isPublished: true,
          },
        }),
        prisma.lessonProgress.count({
          where: {
            userId: user.id,
            status: "COMPLETED",
            lesson: { module: { courseId }, isPublished: true },
          },
        }),
      ]);

      const progressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      await prisma.courseEnrollment.updateMany({
        where: {
          userId: user.id,
          courseId,
        },
        data: {
          progressPercentage,
          completedAt: progressPercentage >= 100 ? new Date() : null,
        },
      });
    } catch (calcErr) {
      console.warn("Progress calculation warning:", calcErr);
    }

    return NextResponse.json({
      success: true,
      status,
      message: status === "COMPLETED" ? "Lesson marked complete!" : "Progress updated",
    });
  } catch (error: unknown) {
    console.error("Progress API Error:", error);
    const msg = error instanceof Error ? error.message : "Error saving progress";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
