"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin, requireSuperAdminAction, getCurrentUser } from "@/server/dal/auth";
import { courseSchema, moduleSchema, lessonSchema } from "@/lib/validations/course.schema";
import { slugify } from "@/lib/utils";
import { deleteR2Object, createPresignedDownloadUrl, getMediaUrl, getThumbnailUrl, deleteMediaAssets, deleteThumbnailAssets, deleteLessonMediaAsset } from "@/lib/storage";
import { PAGINATION, SIGNED_URL_EXPIRY } from "@/lib/constants";
import type { ActionState } from "@/types";

// ==========================================
// COURSE ACTIONS
// ==========================================

export async function getCoursesAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
} = {}) {
  await requireAdmin();

  const where: Record<string, unknown> = {
    deletedAt: null,
  };
  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (err: unknown) {
    // If database columns are missing in Neon PostgreSQL, auto-migrate them on the fly
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes("column") || errMsg.includes("does not exist")) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnailCdnUrl" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyVideoId" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyCdnUrl" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "mediaProvider" TEXT DEFAULT 'BUNNY';
        `);

        // Retry query after self-healing migration
        const [courses, total] = await Promise.all([
          prisma.course.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              _count: {
                select: {
                  modules: true,
                  enrollments: true,
                },
              },
            },
          }),
          prisma.course.count({ where }),
        ]);

        return {
          data: courses,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      } catch (retryErr) {
        console.error("Self-healing DB migration error in getCoursesAction:", retryErr);
      }
    }
    throw err;
  }
}

export async function getCourseByIdAction(id: string) {
  await requireAdmin();

  try {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { position: "asc" },
          include: {
            lessons: {
              orderBy: { position: "asc" },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) throw new Error("Course not found");
    return course;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes("column") || errMsg.includes("does not exist")) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnailCdnUrl" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyVideoId" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyCdnUrl" TEXT;
          ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "mediaProvider" TEXT DEFAULT 'BUNNY';
        `);

        const course = await prisma.course.findUnique({
          where: { id },
          include: {
            modules: {
              orderBy: { position: "asc" },
              include: {
                lessons: {
                  orderBy: { position: "asc" },
                },
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        });

        if (!course) throw new Error("Course not found");
        return course;
      } catch (retryErr) {
        console.error("Self-healing migration error in getCourseByIdAction:", retryErr);
      }
    }
    throw err;
  }
}

export async function createCourseAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = courseSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { title, slug, shortDescription, fullDescription, price, compareAtPrice, status, difficulty, isFeatured, isReferralEligible } = validated.data;

  // Check slug uniqueness
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) {
    return {
      success: false,
      message: "A course with this slug already exists.",
      errors: { slug: ["This slug is already taken."] },
    };
  }

  const course = await prisma.course.create({
    data: {
      title,
      slug,
      shortDescription: shortDescription || null,
      fullDescription: fullDescription || null,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice && compareAtPrice !== "" ? parseFloat(compareAtPrice) : null,
      status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
      isFeatured,
      isReferralEligible,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COURSE_CREATED",
      entityType: "Course",
      entityId: course.id,
      newValues: { title, slug, price, status },
    },
  });

  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourseAction(
  courseId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = courseSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { title, slug, shortDescription, fullDescription, price, compareAtPrice, status, difficulty, isFeatured, isReferralEligible } = validated.data;

  // Check slug uniqueness (excluding current course)
  const existingSlug = await prisma.course.findFirst({
    where: { slug, id: { not: courseId } },
  });
  if (existingSlug) {
    return {
      success: false,
      message: "A course with this slug already exists.",
      errors: { slug: ["This slug is already taken."] },
    };
  }

  const oldCourse = await prisma.course.findUnique({ where: { id: courseId } });

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      slug,
      shortDescription: shortDescription || null,
      fullDescription: fullDescription || null,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice && compareAtPrice !== "" ? parseFloat(compareAtPrice) : null,
      status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
      isFeatured,
      isReferralEligible,
    },
  });

  // Audit log for price or status changes
  if (
    oldCourse &&
    (oldCourse.price.toString() !== price || oldCourse.status !== status)
  ) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COURSE_UPDATED",
        entityType: "Course",
        entityId: courseId,
        oldValues: {
          price: oldCourse.price.toString(),
          status: oldCourse.status,
        },
        newValues: { price, status },
      },
    });
  }

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");

  return { success: true, message: "Course updated successfully." };
}

export async function updateCourseThumbnailAction(
  courseId: string,
  thumbnailKey: string,
  cdnUrl?: string | null,
  provider?: string | null
): Promise<ActionState> {
  await requireAdmin();

  // Delete old thumbnail if exists (both R2 and Bunny)
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { thumbnailKey: true, thumbnailCdnUrl: true },
  });

  const newThumbnail = provider === "BUNNY" && cdnUrl ? cdnUrl : thumbnailKey;
  if (course) {
    await deleteThumbnailAssets(course, newThumbnail);
  }

  const updateData: Record<string, unknown> = {};
  if (provider === "BUNNY" && cdnUrl) {
    updateData.thumbnailCdnUrl = cdnUrl;
    updateData.thumbnailKey = null; // clear R2 key
  } else {
    updateData.thumbnailKey = thumbnailKey;
    updateData.thumbnailCdnUrl = null; // clear Bunny URL
  }

  await prisma.course.update({
    where: { id: courseId },
    data: updateData,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true, message: "Thumbnail updated." };
}

// ==========================================
// RECYCLE BIN & SOFT DELETE ACTIONS (SUPER_ADMIN ONLY)
// ==========================================

export async function getRecycleBinCoursesAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  await requireSuperAdmin();

  const where: Record<string, unknown> = {
    deletedAt: { not: null },
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        deletedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data: courses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function softDeleteCourseAction(courseId: string): Promise<ActionState> {
  const admin = await requireSuperAdminAction();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, status: true, deletedAt: true },
  });

  if (!course) {
    return { success: false, message: "Course not found." };
  }

  if (course.deletedAt) {
    return { success: false, message: "Course is already in the Recycle Bin." };
  }

  const now = new Date();

  await prisma.course.update({
    where: { id: courseId },
    data: {
      deletedAt: now,
      deletedById: admin.id,
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COURSE_SOFT_DELETED",
      entityType: "Course",
      entityId: courseId,
      oldValues: { title: course.title, slug: course.slug, status: course.status },
      newValues: { deletedAt: now.toISOString(), deletedById: admin.id },
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/recycle-bin");
  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/dashboard/courses");

  return { success: true, message: `"${course.title}" moved to Recycle Bin.` };
}

export async function restoreCourseAction(courseId: string): Promise<ActionState> {
  const admin = await requireSuperAdminAction();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, status: true, deletedAt: true },
  });

  if (!course) {
    return { success: false, message: "Course not found." };
  }

  if (!course.deletedAt) {
    return { success: false, message: "Course is not in the Recycle Bin." };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COURSE_RESTORED",
      entityType: "Course",
      entityId: courseId,
      oldValues: { deletedAt: course.deletedAt.toISOString() },
      newValues: { title: course.title, slug: course.slug, status: course.status },
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/recycle-bin");
  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/dashboard/courses");

  return { success: true, message: `"${course.title}" restored successfully.` };
}

export async function permanentDeleteCourseAction(
  courseId: string,
  confirmationTitle: string
): Promise<ActionState> {
  const admin = await requireSuperAdminAction();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      _count: { select: { enrollments: true } },
      modules: {
        include: {
          lessons: {
            select: {
              videoKey: true,
              pdfKey: true,
              bunnyVideoId: true,
              bunnyCdnUrl: true,
              mediaProvider: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return { success: false, message: "Course not found." };
  }

  if (!course.deletedAt) {
    return {
      success: false,
      message: "Course must be in the Recycle Bin before permanent deletion.",
    };
  }

  const expectedMatch = course.title.trim().toLowerCase();
  const provided = confirmationTitle.trim().toLowerCase();
  if (provided !== expectedMatch && confirmationTitle.trim() !== "DELETE") {
    return {
      success: false,
      message: "Confirmation title does not match. Permanent deletion cancelled.",
    };
  }

  // 1. Clean up external media assets (Bunny Stream + Bunny Storage + R2) safely
  await deleteThumbnailAssets(course);
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      await deleteMediaAssets(lesson);
    }
  }

  // 2. Atomic Database Deletion:
  // - CourseEnrollments deleted explicitly
  // - Course deleted (cascades to modules, lessons, lesson_progress, coupon_courses)
  // - OrderItems automatically set courseId = null via foreign key SetNull
  await prisma.$transaction(async (tx) => {
    await tx.courseEnrollment.deleteMany({
      where: { courseId },
    });
    await tx.course.delete({
      where: { id: courseId },
    });
  });

  // 3. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COURSE_PERMANENTLY_DELETED",
      entityType: "Course",
      entityId: courseId,
      oldValues: {
        title: course.title,
        slug: course.slug,
        enrollmentsCount: course._count.enrollments,
      },
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/recycle-bin");
  revalidatePath("/courses");
  revalidatePath("/dashboard/courses");

  return { success: true, message: `"${course.title}" permanently deleted.` };
}

// Backward-compatible alias for existing callers
export async function deleteCourseAction(courseId: string): Promise<ActionState> {
  return softDeleteCourseAction(courseId);
}

// ==========================================
// MODULE ACTIONS
// ==========================================

export async function addModuleAction(
  courseId: string,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = moduleSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid module data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  // Get next position
  const lastModule = await prisma.module.findFirst({
    where: { courseId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const nextPosition = (lastModule?.position ?? 0) + 1;

  await prisma.module.create({
    data: {
      courseId,
      title: validated.data.title,
      position: nextPosition,
      isPublished: validated.data.isPublished,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true, message: "Module added." };
}

export async function updateModuleAction(
  moduleId: string,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = moduleSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid module data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const mod = await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: validated.data.title,
      isPublished: validated.data.isPublished,
    },
  });

  revalidatePath(`/admin/courses/${mod.courseId}`);
  return { success: true, message: "Module updated." };
}

export async function deleteModuleAction(moduleId: string): Promise<ActionState> {
  await requireAdmin();

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: { select: { videoKey: true, pdfKey: true, bunnyVideoId: true, bunnyCdnUrl: true, mediaProvider: true } },
    },
  });

  if (!mod) return { success: false, message: "Module not found." };

  // Delete lesson files from R2 and Bunny
  for (const lesson of mod.lessons) {
    await deleteMediaAssets(lesson);
  }

  await prisma.module.delete({ where: { id: moduleId } });

  // Re-order remaining modules
  const remaining = await prisma.module.findMany({
    where: { courseId: mod.courseId },
    orderBy: { position: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i + 1) {
      await prisma.module.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }
  }

  revalidatePath(`/admin/courses/${mod.courseId}`);
  return { success: true, message: "Module deleted." };
}

export async function reorderModuleAction(
  moduleId: string,
  direction: "up" | "down"
): Promise<ActionState> {
  await requireAdmin();

  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) return { success: false, message: "Module not found." };

  const targetPosition = direction === "up" ? mod.position - 1 : mod.position + 1;
  if (targetPosition < 1) return { success: false, message: "Already at top." };

  const swapTarget = await prisma.module.findFirst({
    where: { courseId: mod.courseId, position: targetPosition },
  });

  if (!swapTarget) return { success: false, message: "Cannot move further." };

  // Swap positions using a transaction
  await prisma.$transaction([
    prisma.module.update({
      where: { id: mod.id },
      data: { position: -1 }, // temporary
    }),
    prisma.module.update({
      where: { id: swapTarget.id },
      data: { position: mod.position },
    }),
    prisma.module.update({
      where: { id: mod.id },
      data: { position: targetPosition },
    }),
  ]);

  revalidatePath(`/admin/courses/${mod.courseId}`);
  return { success: true, message: "Module reordered." };
}

// ==========================================
// LESSON ACTIONS
// ==========================================

export async function addLessonAction(
  moduleId: string,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = lessonSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid lesson data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });
  if (!mod) return { success: false, message: "Module not found." };

  // Get next position
  const lastLesson = await prisma.lesson.findFirst({
    where: { moduleId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const nextPosition = (lastLesson?.position ?? 0) + 1;

  // Generate slug from title
  const baseSlug = validated.data.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // Ensure slug uniqueness within module
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existingSlug = await prisma.lesson.findUnique({
      where: { moduleId_slug: { moduleId, slug } },
    });
    if (!existingSlug) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  await prisma.lesson.create({
    data: {
      moduleId,
      title: validated.data.title,
      slug,
      position: nextPosition,
      contentType: validated.data.contentType as "VIDEO" | "PDF" | "TEXT",
      textContent: validated.data.textContent || null,
      durationSec: validated.data.durationSec,
      isFreePreview: validated.data.isFreePreview,
      isPublished: validated.data.isPublished,
    },
  });

  revalidatePath(`/admin/courses/${mod.courseId}`);
  return { success: true, message: "Lesson added." };
}

export async function updateLessonAction(
  lessonId: string,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const validated = lessonSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid lesson data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, message: "Lesson not found." };

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: validated.data.title,
      contentType: validated.data.contentType as "VIDEO" | "PDF" | "TEXT",
      textContent: validated.data.textContent || null,
      durationSec: validated.data.durationSec,
      isFreePreview: validated.data.isFreePreview,
      isPublished: validated.data.isPublished,
    },
  });

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  return { success: true, message: "Lesson updated." };
}

export async function updateLessonFileAction(
  lessonId: string,
  fileType: "video" | "pdf",
  fileKey: string,
  bunnyVideoId?: string | null,
  bunnyCdnUrl?: string | null,
  provider?: string | null
): Promise<ActionState> {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, message: "Lesson not found." };

  const newAsset =
    fileType === "video"
      ? (provider === "BUNNY" || bunnyVideoId ? bunnyVideoId : fileKey)
      : (provider === "BUNNY" || bunnyCdnUrl ? bunnyCdnUrl : fileKey);

  // Delete only the specific old asset being replaced (both R2 and Bunny), skipping the new one
  await deleteLessonMediaAsset(lesson, fileType, newAsset);

  const updateData: Record<string, unknown> = {
    mediaProvider: provider || "BUNNY",
  };

  if (provider === "BUNNY" || bunnyVideoId || bunnyCdnUrl) {
    updateData.mediaProvider = "BUNNY";
    if (fileType === "video" && bunnyVideoId) {
      updateData.bunnyVideoId = bunnyVideoId;
      updateData.videoKey = null; // clear R2 key
    }
    if (fileType === "pdf" && bunnyCdnUrl) {
      updateData.bunnyCdnUrl = bunnyCdnUrl;
      updateData.pdfKey = null; // clear R2 key
    }
  } else {
    if (fileType === "video") {
      updateData.videoKey = fileKey;
      updateData.bunnyVideoId = null;
    } else {
      updateData.pdfKey = fileKey;
      updateData.bunnyCdnUrl = null;
    }
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: updateData,
  });

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  return { success: true, message: `${fileType === "video" ? "Video" : "PDF"} updated.` };
}

export async function deleteLessonAction(lessonId: string): Promise<ActionState> {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, message: "Lesson not found." };

  // Delete files from R2 and Bunny
  await deleteMediaAssets(lesson);

  const moduleId = lesson.moduleId;
  await prisma.lesson.delete({ where: { id: lessonId } });

  // Re-order remaining lessons
  const remaining = await prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { position: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i + 1) {
      await prisma.lesson.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }
  }

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  return { success: true, message: "Lesson deleted." };
}

export async function reorderLessonAction(
  lessonId: string,
  direction: "up" | "down"
): Promise<ActionState> {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return { success: false, message: "Lesson not found." };

  const targetPosition = direction === "up" ? lesson.position - 1 : lesson.position + 1;
  if (targetPosition < 1) return { success: false, message: "Already at top." };

  const swapTarget = await prisma.lesson.findFirst({
    where: { moduleId: lesson.moduleId, position: targetPosition },
  });

  if (!swapTarget) return { success: false, message: "Cannot move further." };

  const mod = await prisma.module.findUnique({
    where: { id: lesson.moduleId },
    select: { courseId: true },
  });

  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: lesson.id },
      data: { position: -1 },
    }),
    prisma.lesson.update({
      where: { id: swapTarget.id },
      data: { position: lesson.position },
    }),
    prisma.lesson.update({
      where: { id: lesson.id },
      data: { position: targetPosition },
    }),
  ]);

  if (mod) revalidatePath(`/admin/courses/${mod.courseId}`);
  return { success: true, message: "Lesson reordered." };
}

// ==========================================
// COURSE DURATION CALCULATION
// ==========================================

export async function recalculateCourseDurationAction(
  courseId: string
): Promise<void> {
  await requireAdmin();

  const result = await prisma.lesson.aggregate({
    where: { module: { courseId } },
    _sum: { durationSec: true },
  });

  await prisma.course.update({
    where: { id: courseId },
    data: { totalDuration: result._sum.durationSec ?? 0 },
  });

  revalidatePath(`/admin/courses/${courseId}`);
}

// ==========================================
// PUBLIC COURSE QUERIES & PREVIEWS
// ==========================================

export async function getPublicCoursesAction({
  search,
  difficulty,
}: {
  search?: string;
  difficulty?: string;
} = {}) {
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (difficulty && difficulty !== "all") {
    where.difficulty = difficulty;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { fullDescription: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const courses = await prisma.course.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        modules: {
          where: { isPublished: true },
          select: {
            id: true,
            _count: {
              select: {
                lessons: {
                  where: { isPublished: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    return courses;
  } catch (err) {
    console.warn("Could not load public courses:", err);
    return [];
  }
}

export async function getPublicCourseBySlugAction(slug: string) {
  try {
    const course = await prisma.course.findFirst({
      where: {
        slug,
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
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course || course.status !== "PUBLISHED") {
      return null;
    }

    return course;
  } catch (err) {
    console.warn(`Could not load public course by slug ${slug}:`, err);
    return null;
  }
}

export async function getLessonPreviewMediaUrlAction(lessonId: string) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      contentType: true,
      videoKey: true,
      pdfKey: true,
      bunnyVideoId: true,
      bunnyCdnUrl: true,
      mediaProvider: true,
      textContent: true,
      isFreePreview: true,
    },
  });

  if (!lesson) throw new Error("Lesson not found");

  // Authorization check: User must be admin OR lesson must be marked as free preview
  if (!isAdmin && !lesson.isFreePreview) {
    throw new Error("This lesson is locked. Purchase the course to gain access.");
  }

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

  return {
    lesson,
    signedUrl,
    provider: isBunny ? "BUNNY" : (lesson.mediaProvider || "R2"),
    bunnyVideoId: lesson.bunnyVideoId,
  };
}

export async function getThumbnailSignedUrlAction(thumbnailKey: string, thumbnailCdnUrl?: string | null) {
  // Bunny CDN URL takes priority
  if (thumbnailCdnUrl) return thumbnailCdnUrl;
  if (!thumbnailKey) return null;
  return createPresignedDownloadUrl(thumbnailKey, SIGNED_URL_EXPIRY.THUMBNAIL);
}

