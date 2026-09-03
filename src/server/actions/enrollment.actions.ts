"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { createPresignedDownloadUrl, getMediaUrl } from "@/lib/storage";
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
  } catch (err) {
    console.error("[Enrollment] Error checking enrollment for user:", {
      userId: user.id,
      courseId,
      error: err instanceof Error ? err.message : String(err),
    });
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
  const course = await prisma.course.findFirst({
    where: {
      slug: courseSlug,
      deletedAt: null,
    },
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
              bunnyVideoId: true,
              bunnyCdnUrl: true,
              mediaProvider: true,
              textContent: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("Course not found or currently unavailable.");
  }

  // Step 2: Verify Active Enrollment
  let enrollment = null;
  try {
    enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
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
          items: { some: { courseId: course.id } },
        },
      });

      if (paidOrder) {
        enrollment = await prisma.courseEnrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
          update: {
            status: "ACTIVE",
            orderId: paidOrder.id,
            isTestData: false,
          },
          create: {
            userId: user.id,
            courseId: course.id,
            orderId: paidOrder.id,
            status: "ACTIVE",
            progressPercentage: 0.0,
            isTestData: false,
          },
        });
      }
    } catch (autoHealErr) {
      console.error("[Enrollment] Auto-heal failed in getEnrolledCourseContentAction:", {
        userId: user.id,
        courseId: course.id,
        error: autoHealErr instanceof Error ? autoHealErr.message : String(autoHealErr),
      });
    }
  }

  if (!isAdmin && (!enrollment || enrollment.status !== "ACTIVE")) {
    throw new Error("Access denied. Please purchase the course to view content.");
  }

  // Step 3: Fetch Progress
  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRecords = await prisma.lessonProgress.findMany({
    where: {
      userId: user.id,
      lessonId: { in: allLessonIds },
    },
    select: {
      lessonId: true,
      status: true,
      watchTimeSeconds: true,
    },
  });

  const progressMap: Record<string, { status: string; watchTimeSeconds: number }> = {};
  for (const record of progressRecords) {
    progressMap[record.lessonId] = {
      status: record.status,
      watchTimeSeconds: record.watchTimeSeconds,
    };
  }

  // Step 4: Calculate Stats
  const totalLessons = allLessonIds.length;
  const completedLessons = progressRecords.filter((p) => p.status === "COMPLETED").length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    course,
    progressMap,
    stats: {
      totalLessons,
      completedLessons,
      progressPercentage,
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
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  // Step 1: Fetch lesson and verify parent course hierarchy (IDOR check)
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

  if (!lesson || lesson.module.course.slug !== courseSlug || lesson.module.course.deletedAt !== null) {
    throw new Error("Invalid lesson or course not available.");
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

  // Step 3: Generate temporary signed/CDN URLs (R2 or Bunny)
  let signedUrl: string | null = null;
  if (lesson.contentType === "VIDEO") {
    signedUrl = await getMediaUrl(lesson, "video", SIGNED_URL_EXPIRY.VIDEO);
  } else if (lesson.contentType === "PDF") {
    signedUrl = await getMediaUrl(lesson, "pdf", SIGNED_URL_EXPIRY.PDF);
  }

  const isBunny =
    lesson.mediaProvider === "BUNNY" ||
    Boolean(lesson.bunnyVideoId) ||
    Boolean(lesson.bunnyCdnUrl);

  const detectedProvider = isBunny ? "BUNNY" : (lesson.mediaProvider || "R2");

  // Safe server-side diagnostic logging (no secret tokens)
  console.log(`[Playback Diagnostics] lessonId=${lesson.id} contentType=${lesson.contentType} mediaProvider=${lesson.mediaProvider} bunnyVideoId=${lesson.bunnyVideoId ? "[PRESENT]" : "[NULL]"} detectedProvider=${detectedProvider} signedUrlHostname=${signedUrl ? new URL(signedUrl).hostname : "null"}`);

  return {
    lessonId: lesson.id,
    title: lesson.title,
    contentType: lesson.contentType,
    textContent: lesson.textContent,
    signedUrl,
    durationSec: lesson.durationSec,
    provider: detectedProvider,
    bunnyVideoId: lesson.bunnyVideoId,
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
    include: {
      module: {
        include: {
          course: { select: { id: true, slug: true } },
        },
      },
    },
  });

  if (!lesson) {
    return { success: false, message: "Lesson not found" };
  }

  const courseId = lesson.module.course.id;
  const courseSlug = lesson.module.course.slug;
  const completedAt = status === "COMPLETED" ? new Date() : null;

  // 1. Update or create lesson progress
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
  } catch {
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
    } catch {
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
    }
  }

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

  revalidatePath(`/learn/${courseSlug}`);
  revalidatePath(`/learn/${courseSlug}/${lessonId}`);
  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/dashboard/courses`);

  return { success: true, message: "Progress saved." };
}

// ==========================================
// 5. STUDENT DASHBOARD ENROLLED COURSES
// ==========================================

export async function getUserEnrolledCoursesAction() {
  await ensureDatabaseSchemaSync();
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  try {
    // 1. Auto-heal: Ensure any PAID orders for this user have active enrollments
    try {
      const paidOrders = await prisma.order.findMany({
        where: {
          userId: user.id,
          status: "PAID",
        },
        include: { items: true },
      });

      const upsertPromises: Promise<any>[] = [];
      for (const po of (paidOrders as any[])) {
        for (const item of (po.items || [])) {
          if (item.courseId) {
            upsertPromises.push(
              prisma.courseEnrollment.upsert({
                where: {
                  userId_courseId: {
                    userId: user.id,
                    courseId: item.courseId,
                  },
                },
                update: {
                  status: "ACTIVE",
                  orderId: po.id,
                  isTestData: false,
                },
                create: {
                  userId: user.id,
                  courseId: item.courseId,
                  orderId: po.id,
                  status: "ACTIVE",
                  progressPercentage: 0.0,
                  isTestData: false,
                },
              })
            );
          }
        }
      }
      await Promise.all(upsertPromises);
    } catch (autoHealError) {
      console.error("[Enrollment] Auto-heal check failed for user orders:", {
        userId: user.id,
        error: autoHealError instanceof Error ? autoHealError.message : String(autoHealError),
      });
    }

    // 2. Query all active or completed enrollments for this user
    let enrollments = await prisma.courseEnrollment.findMany({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "COMPLETED"] },
        course: { deletedAt: null },
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

    // 3. If Admin/Super Admin has no enrollments, automatically enroll them in all published courses
    if ((!enrollments || enrollments.length === 0) && isAdmin) {
      try {
        const publishedCourses = await prisma.course.findMany({
          where: { deletedAt: null, status: "PUBLISHED" },
          select: { id: true },
        });

        const adminUpsertPromises: Promise<any>[] = [];
        for (const c of publishedCourses) {
          adminUpsertPromises.push(
            prisma.courseEnrollment.upsert({
              where: {
                userId_courseId: {
                  userId: user.id,
                  courseId: c.id,
                },
              },
              update: {
                status: "ACTIVE",
                isTestData: false,
              },
              create: {
                userId: user.id,
                courseId: c.id,
                status: "ACTIVE",
                progressPercentage: 0.0,
                isTestData: false,
              },
            })
          );
        }
        await Promise.all(adminUpsertPromises);

        // Re-fetch after admin auto-enrollment
        enrollments = await prisma.courseEnrollment.findMany({
          where: {
            userId: user.id,
            status: { in: ["ACTIVE", "COMPLETED"] },
            course: { deletedAt: null },
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
      } catch (adminEnrollErr) {
        console.error("[Enrollment] Admin auto-enroll failed:", adminEnrollErr);
      }
    }

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
    console.error("[Enrollment] Failed to fetch enrolled courses for user:", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
