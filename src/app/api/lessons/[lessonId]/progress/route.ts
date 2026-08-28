import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

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
      include: {
        module: {
          include: {
            course: { select: { id: true, slug: true, deletedAt: true } },
          },
        },
      },
    });

    if (!lesson || lesson.module.course.deletedAt !== null) {
      return NextResponse.json(
        { success: false, error: "Lesson or course not found." },
        { status: 404 }
      );
    }

    const courseId = lesson.module.course.id;
    const courseSlug = lesson.module.course.slug;
    const completedAt = status === "COMPLETED" ? new Date() : null;

    // 1. Persist lesson progress (idempotent upsert)
    let writeSucceeded = false;
    try {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: user.id,
            lessonId,
          },
        },
        update: {
          status: status as any,
          watchTimeSeconds,
          lastPositionSeconds,
          completedAt,
        },
        create: {
          userId: user.id,
          lessonId,
          status: status as any,
          watchTimeSeconds,
          lastPositionSeconds,
          completedAt,
        },
      });
      writeSucceeded = true;
    } catch (primaryUpsertErr: any) {
      console.warn(
        "Prisma primary upsert failed, executing SQL fallback:",
        primaryUpsertErr?.message
      );
      // Attempt 1: ProgressStatus
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "lesson_progress" ("id", "userId", "lessonId", "status", "watchTimeSeconds", "lastPositionSeconds", "completedAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3::"ProgressStatus", $4, $5, $6::timestamp, NOW())
           ON CONFLICT ("userId", "lessonId")
           DO UPDATE SET
             "status" = EXCLUDED."status",
             "watchTimeSeconds" = EXCLUDED."watchTimeSeconds",
             "lastPositionSeconds" = EXCLUDED."lastPositionSeconds",
             "completedAt" = EXCLUDED."completedAt",
             "updatedAt" = NOW();`,
          user.id,
          lessonId,
          status,
          watchTimeSeconds,
          lastPositionSeconds,
          completedAt ? completedAt.toISOString() : null
        );
        writeSucceeded = true;
      } catch (sqlErr1: any) {
        console.warn("SQL fallback with ProgressStatus failed, trying LessonProgressStatus:", sqlErr1?.message);
        // Attempt 2: LessonProgressStatus (legacy enum)
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "lesson_progress" ("id", "userId", "lessonId", "status", "watchTimeSeconds", "lastPositionSeconds", "completedAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3::"LessonProgressStatus", $4, $5, $6::timestamp, NOW())
             ON CONFLICT ("userId", "lessonId")
             DO UPDATE SET
               "status" = EXCLUDED."status",
               "watchTimeSeconds" = EXCLUDED."watchTimeSeconds",
               "lastPositionSeconds" = EXCLUDED."lastPositionSeconds",
               "completedAt" = EXCLUDED."completedAt",
               "updatedAt" = NOW();`,
            user.id,
            lessonId,
            status,
            watchTimeSeconds,
            lastPositionSeconds,
            completedAt ? completedAt.toISOString() : null
          );
          writeSucceeded = true;
        } catch (sqlErr2: any) {
          console.error("Critical: Progress persistence failed completely:", sqlErr2);
          throw new Error(`Database persistence failed: ${sqlErr2?.message || "Unknown error"}`);
        }
      }
    }

    if (!writeSucceeded) {
      throw new Error("Unable to save lesson progress to database.");
    }

    // 2. Recalculate Course Enrollment progress percentage scoped strictly to this course
    let progressPercentage = 0;
    let totalLessons = 0;
    let completedLessons = 0;
    try {
      const [totalCount, completedCount] = await Promise.all([
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
            lesson: {
              module: { courseId },
              isPublished: true,
            },
          },
        }),
      ]);

      totalLessons = totalCount;
      completedLessons = completedCount;
      progressPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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

    // 3. Invalidate/revalidate relevant Next.js cache paths
    try {
      revalidatePath(`/learn/${courseSlug}`);
      revalidatePath(`/learn/${courseSlug}/${lessonId}`);
      revalidatePath(`/courses/${courseSlug}`);
      revalidatePath(`/dashboard`);
      revalidatePath(`/dashboard/courses`);
    } catch (revErr) {
      console.warn("Revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      status,
      lessonId,
      completedLessons,
      totalLessons,
      progressPercentage,
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
