"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/server/dal/auth";
import { courseSchema, moduleSchema, lessonSchema } from "@/lib/validations/course.schema";
import { slugify } from "@/lib/utils";
import { deleteR2Object, createPresignedDownloadUrl } from "@/lib/storage";
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

  const where: Record<string, unknown> = {};
  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

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
}

export async function getCourseByIdAction(id: string) {
  await requireAdmin();

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
  thumbnailKey: string
): Promise<ActionState> {
  await requireAdmin();

  // Delete old thumbnail if exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { thumbnailKey: true },
  });

  if (course?.thumbnailKey) {
    try {
      await deleteR2Object(course.thumbnailKey);
    } catch {
      // Old file may already be deleted
    }
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { thumbnailKey },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true, message: "Thumbnail updated." };
}

export async function deleteCourseAction(courseId: string): Promise<ActionState> {
  const admin = await requireAdmin();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      _count: { select: { enrollments: true } },
      modules: {
        include: { lessons: { select: { videoKey: true, pdfKey: true } } },
      },
    },
  });

  if (!course) return { success: false, message: "Course not found." };
  if (course._count.enrollments > 0) {
    return { success: false, message: "Cannot delete a course with active enrollments." };
  }

  // Delete R2 objects
  const keysToDelete: string[] = [];
  if (course.thumbnailKey) keysToDelete.push(course.thumbnailKey);
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (lesson.videoKey) keysToDelete.push(lesson.videoKey);
      if (lesson.pdfKey) keysToDelete.push(lesson.pdfKey);
    }
  }

  // Delete files in parallel (best effort)
  await Promise.allSettled(keysToDelete.map((key) => deleteR2Object(key)));

  await prisma.course.delete({ where: { id: courseId } });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COURSE_DELETED",
      entityType: "Course",
      entityId: courseId,
      oldValues: { title: course.title, slug: course.slug },
    },
  });

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
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
      lessons: { select: { videoKey: true, pdfKey: true } },
    },
  });

  if (!mod) return { success: false, message: "Module not found." };

  // Delete lesson files from R2
  const keysToDelete: string[] = [];
  for (const lesson of mod.lessons) {
    if (lesson.videoKey) keysToDelete.push(lesson.videoKey);
    if (lesson.pdfKey) keysToDelete.push(lesson.pdfKey);
  }
  await Promise.allSettled(keysToDelete.map((key) => deleteR2Object(key)));

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
  fileKey: string
): Promise<ActionState> {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return { success: false, message: "Lesson not found." };

  // Delete old file if exists
  const oldKey = fileType === "video" ? lesson.videoKey : lesson.pdfKey;
  if (oldKey) {
    try {
      await deleteR2Object(oldKey);
    } catch {
      // Old file may already be deleted
    }
  }

  const updateData = fileType === "video"
    ? { videoKey: fileKey }
    : { pdfKey: fileKey };

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

  // Delete files from R2
  const keysToDelete: string[] = [];
  if (lesson.videoKey) keysToDelete.push(lesson.videoKey);
  if (lesson.pdfKey) keysToDelete.push(lesson.pdfKey);
  await Promise.allSettled(keysToDelete.map((key) => deleteR2Object(key)));

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
    const course = await prisma.course.findUnique({
      where: { slug },
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
  if (lesson.contentType === "VIDEO" && lesson.videoKey) {
    signedUrl = await createPresignedDownloadUrl(lesson.videoKey, SIGNED_URL_EXPIRY.VIDEO);
  } else if (lesson.contentType === "PDF" && lesson.pdfKey) {
    signedUrl = await createPresignedDownloadUrl(lesson.pdfKey, SIGNED_URL_EXPIRY.PDF);
  }

  return {
    lesson,
    signedUrl,
  };
}

export async function getThumbnailSignedUrlAction(thumbnailKey: string) {
  if (!thumbnailKey) return null;
  return createPresignedDownloadUrl(thumbnailKey, SIGNED_URL_EXPIRY.THUMBNAIL);
}

