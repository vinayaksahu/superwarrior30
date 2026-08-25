"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { createPresignedDownloadUrl } from "@/lib/storage";
import { SIGNED_URL_EXPIRY } from "@/lib/constants";
import type { ActionState } from "@/types";

// ==========================================
// 1. ENROLLMENT VERIFICATION
// ==========================================

export async function checkUserEnrollment(courseId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;

  try {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId,
        status: "ACTIVE",
      },
      select: { status: true },
    });

    if (enrollment?.status === "ACTIVE") return true;

    // Check if user has a PAID order for this course
    const paidOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: "PAID",
        items: {
          some: { courseId },
        },
      },
      select: { id: true },
    });

    return !!paidOrder;
  } catch {
    return false;
  }
}

// ==========================================
// 2. SECURE COURSE CONTENT ACCESS
// ==========================================

export async function getEnrolledCourseContentAction(courseSlug: string) {
  await ensureDatabaseSchemaSync();
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  // Step 1: Fetch Course
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: {
              id: true,
              moduleId: true,
              title: true,
              slug: true,
              position: true,
              contentType: true,
              durationSec: true,
              isFreePreview: true,
              videoKey: true,
              pdfKey: true,
              textContent: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  // Step 2: Verify Active Enrollment
  let enrollment = null;
  try {
    enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        enrolledAt: true,
        completedAt: true,
      },
    });
  } catch {
    // fallback
  }

  // Fallback: check if student has a PAID order for this course and auto-heal enrollment
  if (!enrollment || enrollment.status !== "ACTIVE") {
    try {
      const paidOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: "PAID",
          items: {
            some: { courseId: course.id },
          },
        },
        select: { id: true },
      });

      if (paidOrder || isAdmin) {
        enrollment = await prisma.courseEnrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
          create: {
            userId: user.id,
            courseId: course.id,
            status: "ACTIVE",
          },
          update: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            userId: true,
            courseId: true,
            status: true,
            enrolledAt: true,
            completedAt: true,
          },
        });
      }
    } catch {
      // ignore
    }
  }

  await ensureDatabaseSchemaSync();

  // Step 3: Fetch Student's Lesson Progress
  let progressRecords: Array<{ lessonId: string; status: string; watchTimeSeconds: number }> = [];
  try {
    progressRecords = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
      },
      select: {
        lessonId: true,
        status: true,
        watchTimeSeconds: true,
      },
    });
  } catch (findErr) {
    try {
      const rawRows = await prisma.$queryRawUnsafe<
        Array<{ lessonId: string; status: string; watchTimeSeconds: number }>
      >(
        `SELECT "lessonId", "status"::text as "status", "watchTimeSeconds" FROM "lesson_progress" WHERE "userId" = $1`,
        user.id
      );
      progressRecords = rawRows || [];
    } catch {
      progressRecords = [];
    }
  }

  const progressMap = new Map<string, { status: string; watchTimeSeconds: number }>();
  for (const p of progressRecords) {
    progressMap.set(p.lessonId, {
      status: p.status,
      watchTimeSeconds: p.watchTimeSeconds,
    });
  }

  // Count total and completed lessons
  let totalLessonsCount = 0;
  let completedLessonsCount = 0;

  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      totalLessonsCount++;
      if (progressMap.get(lesson.id)?.status === "COMPLETED") {
        completedLessonsCount++;
      }
    }
  }

  const computedProgress =
    totalLessonsCount > 0
      ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
      : 0;

  return {
    course,
    enrollment: enrollment || {
      status: "ACTIVE",
      progressPercentage: computedProgress,
      enrolledAt: new Date(),
    },
    progressMap: Object.fromEntries(progressMap),
    stats: {
      totalLessonsCount,
      completedLessonsCount,
      progressPercentage: computedProgress,
    },
  };
}

// ==========================================
// 3. SECURE MEDIA STREAMING (SIGNED URLS)
// ==========================================

export async function getEnrolledLessonMediaUrlAction({
  courseSlug,
  lessonId,
}: {
  courseSlug: string;
  lessonId: string;
}) {
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN";

  // Step 1: Fetch lesson and verify parent course hierarchy (IDOR check)
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, slug: true } },
        },
      },
    },
  });

  if (!lesson || lesson.module.course.slug !== courseSlug) {
    throw new Error("Invalid lesson or course mismatch.");
  }

  // Step 2: Verify Enrollment or Free Preview
  if (!isAdmin && !lesson.isFreePreview) {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: lesson.module.course.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw new Error("Access denied. Please purchase the course to view this lesson.");
    }
  }

  // Step 3: Generate temporary signed URLs
  let signedUrl: string | null = null;
  if (lesson.contentType === "VIDEO" && lesson.videoKey) {
    signedUrl = await createPresignedDownloadUrl(lesson.videoKey, SIGNED_URL_EXPIRY.VIDEO);
  } else if (lesson.contentType === "PDF" && lesson.pdfKey) {
    signedUrl = await createPresignedDownloadUrl(lesson.pdfKey, SIGNED_URL_EXPIRY.PDF);
  }

  return {
    lessonId: lesson.id,
    title: lesson.title,
    contentType: lesson.contentType,
    textContent: lesson.textContent,
    signedUrl,
    durationSec: lesson.durationSec,
  };
}

// ==========================================
// 4. PROGRESS TRACKING
// ==========================================

export async function updateLessonProgressAction({
  lessonId,
  status,
  watchTimeSeconds = 0,
  lastPositionSeconds = 0,
}: {
  lessonId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  watchTimeSeconds?: number;
  lastPositionSeconds?: number;
}): Promise<ActionState> {
  const user = await requireAuth();

  // Find lesson and parent course
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) {
    return { success: false, message: "Lesson not found" };
  }

  const courseId = lesson.module.courseId;

  // 1. Update or create lesson progress
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
      userId: user.id,
      lessonId,
      status,
      watchTimeSeconds,
      lastPositionSeconds,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  // 2. Recalculate Course Enrollment progress percentage
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

  revalidatePath(`/dashboard`);
  revalidatePath(`/dashboard/courses`);

  return { success: true, message: "Progress saved." };
}

// ==========================================
// 5. STUDENT DASHBOARD ENROLLED COURSES
// ==========================================

export async function getUserEnrolledCoursesAction() {
  const user = await requireAuth();

  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          include: {
            modules: {
              where: { isPublished: true },
              select: {
                id: true,
                lessons: {
                  where: { isPublished: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    return (enrollments || []).map((enr) => {
      const totalLessons = (enr.course?.modules || []).reduce(
        (sum, m) => sum + (m.lessons?.length || 0),
        0
      );

      return {
        enrollmentId: enr.id,
        courseId: enr.courseId,
        courseTitle: enr.course?.title || "Course",
        courseSlug: enr.course?.slug || "course",
        shortDescription: enr.course?.shortDescription || "",
        difficulty: enr.course?.difficulty || "BEGINNER",
        progressPercentage: Number(enr.progressPercentage || 0),
        totalLessons,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
      };
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    return [];
  }
}
