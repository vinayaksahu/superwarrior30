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

export async function getEnrolledCourseContentAction(
  courseSlug: string,
  targetLessonId?: string
) {
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  // Step 1: Fetch Course with enrollment in a single optimized query
  const course = await prisma.course.findFirst({
    where: {
      slug: courseSlug,
      deletedAt: null,
    },
    include: {
      enrollments: {
        where: { userId: user.id },
        select: { id: true, status: true, progressPercentage: true },
      },
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
  let isEnrolled =
    isAdmin ||
    course.enrollments.some(
      (e) => e.status === "ACTIVE" || e.status === "COMPLETED"
    );

  // Fallback: check if student has a PAID order for this course and auto-heal enrollment
  if (!isEnrolled) {
    try {
      const paidOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: "PAID",
          items: { some: { courseId: course.id } },
        },
      });

      if (paidOrder) {
        await prisma.courseEnrollment.upsert({
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
        isEnrolled = true;
      }
    } catch (autoHealErr) {
      console.error("[Enrollment] Auto-heal failed in getEnrolledCourseContentAction:", {
        userId: user.id,
        courseId: course.id,
        error: autoHealErr instanceof Error ? autoHealErr.message : String(autoHealErr),
      });
    }
  }

  if (!isEnrolled) {
    throw new Error("Access denied. Please purchase the course to view content.");
  }

  // Step 3: Flatten lessons and fetch progress in parallel
  const allLessons: any[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      allLessons.push(lesson);
    }
  }

  const allLessonIds = allLessons.map((l) => l.id);
  const progressRecords = await prisma.lessonProgress.findMany({
    where: {
      userId: user.id,
      lessonId: { in: allLessonIds },
    },
    select: {
      lessonId: true,
      status: true,
      watchTimeSeconds: true,
      lastPositionSeconds: true,
    },
  });

  const progressMap: Record<
    string,
    { status: string; watchTimeSeconds: number; lastPositionSeconds: number }
  > = {};
  for (const record of progressRecords) {
    progressMap[record.lessonId] = {
      status: record.status,
      watchTimeSeconds: record.watchTimeSeconds || 0,
      lastPositionSeconds: record.lastPositionSeconds || 0,
    };
  }

  // Step 4: Calculate Stats
  const totalLessons = allLessonIds.length;
  const completedLessons = progressRecords.filter(
    (p) => p.status === "COMPLETED"
  ).length;
  const progressPercentage =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  // Step 5: Resolve Active Lesson & Generate Media Data on Server
  let activeLesson = null;
  if (targetLessonId) {
    activeLesson = allLessons.find((l) => l.id === targetLessonId) || null;
  }
  if (!activeLesson && allLessons.length > 0) {
    activeLesson =
      allLessons.find((l) => progressMap[l.id]?.status !== "COMPLETED") ||
      allLessons[0];
  }

  let initialMediaData = null;
  if (activeLesson) {
    let signedUrl: string | null = null;
    if (activeLesson.contentType === "VIDEO") {
      signedUrl = await getMediaUrl(activeLesson, "video", SIGNED_URL_EXPIRY.VIDEO);
    } else if (activeLesson.contentType === "PDF") {
      signedUrl = await getMediaUrl(activeLesson, "pdf", SIGNED_URL_EXPIRY.PDF);
    }

    const isBunny =
      activeLesson.mediaProvider === "BUNNY" ||
      Boolean(activeLesson.bunnyVideoId) ||
      Boolean(activeLesson.bunnyCdnUrl);
    const detectedProvider = isBunny ? "BUNNY" : (activeLesson.mediaProvider || "R2");

    const activeProgress = progressMap[activeLesson.id];

    let finalDurationSec = activeLesson.durationSec || 0;
    if (
      activeLesson.contentType === "VIDEO" &&
      (!finalDurationSec || finalDurationSec <= 120) &&
      activeLesson.bunnyVideoId
    ) {
      try {
        const asset = await prisma.mediaAsset.findFirst({
          where: { bunnyVideoId: activeLesson.bunnyVideoId },
          select: { duration: true },
        });
        if (asset?.duration && asset.duration > 0) {
          finalDurationSec = asset.duration;
        }
      } catch {}
    }

    initialMediaData = {
      lessonId: activeLesson.id,
      title: activeLesson.title,
      contentType: activeLesson.contentType,
      textContent: activeLesson.textContent,
      signedUrl,
      durationSec: finalDurationSec,
      provider: detectedProvider,
      bunnyVideoId: activeLesson.bunnyVideoId,
      lastPositionSeconds: activeProgress?.lastPositionSeconds || 0,
      watchTimeSeconds: activeProgress?.watchTimeSeconds || 0,
      status: activeProgress?.status || "NOT_STARTED",
    };
  }

  return {
    course,
    progressMap,
    stats: {
      totalLessons,
      completedLessons,
      progressPercentage,
    },
    activeLessonId: activeLesson ? activeLesson.id : null,
    initialMediaData,
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
    const isEnrolled = await checkUserEnrollment(lesson.module.course.id);
    if (!isEnrolled) {
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
  // Step 4: Fetch user's existing progress for resume
  const userProgress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId: lesson.id,
      },
    },
    select: {
      status: true,
      watchTimeSeconds: true,
      lastPositionSeconds: true,
    },
  });

  let finalDurationSec = lesson.durationSec;
  if (lesson.contentType === "VIDEO" && (!finalDurationSec || finalDurationSec <= 120) && lesson.bunnyVideoId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { bunnyVideoId: lesson.bunnyVideoId },
      select: { duration: true },
    });
    if (asset?.duration && asset.duration > 0) {
      finalDurationSec = asset.duration;
    }
  }

  return {
    lessonId: lesson.id,
    title: lesson.title,
    contentType: lesson.contentType,
    textContent: lesson.textContent,
    signedUrl,
    durationSec: finalDurationSec,
    provider: detectedProvider,
    bunnyVideoId: lesson.bunnyVideoId,
    lastPositionSeconds: userProgress?.lastPositionSeconds || 0,
    watchTimeSeconds: userProgress?.watchTimeSeconds || 0,
    status: userProgress?.status || "NOT_STARTED",
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
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  try {
    // 1. Fast read: Query active or completed enrollments for this user
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
              orderBy: { position: "asc" },
              select: {
                id: true,
                position: true,
                lessons: {
                  where: { isPublished: true },
                  orderBy: { position: "asc" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // 2. Only auto-heal if user has NO enrollments found
    if (!enrollments || enrollments.length === 0) {
      try {
        const paidOrders = await prisma.order.findMany({
          where: {
            userId: user.id,
            status: "PAID",
          },
          include: { items: true },
        });

        if (paidOrders.length > 0) {
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
                    orderBy: { position: "asc" },
                    select: {
                      id: true,
                      position: true,
                      lessons: {
                        where: { isPublished: true },
                        orderBy: { position: "asc" },
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          });
        }
      } catch (autoHealError) {
        console.error("[Enrollment] Auto-heal check failed for user orders:", autoHealError);
      }
    }

    // 3. If Admin/Super Admin has no enrollments, auto-enroll in all published courses
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
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    position: true,
                    lessons: {
                      where: { isPublished: true },
                      orderBy: { position: "asc" },
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

    // 4. Batch fetch user's completed lesson progress to resolve nextLessonId instantly
    const userCompletedProgress = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
      },
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(userCompletedProgress.map((p) => p.lessonId));

    return (enrollments || []).map((enr) => {
      const allLessons: string[] = [];
      for (const m of enr.course?.modules || []) {
        for (const l of m.lessons || []) {
          allLessons.push(l.id);
        }
      }
      const totalLessons = allLessons.length;
      const firstIncomplete = allLessons.find((id) => !completedLessonIds.has(id));
      const nextLessonId = firstIncomplete || allLessons[0] || null;

      return {
        enrollmentId: enr.id,
        courseId: enr.courseId,
        courseTitle: enr.course?.title || "Course",
        courseSlug: enr.course?.slug || "course",
        shortDescription: enr.course?.shortDescription || "",
        difficulty: enr.course?.difficulty || "BEGINNER",
        progressPercentage: Number(enr.progressPercentage || 0),
        totalLessons,
        nextLessonId,
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
