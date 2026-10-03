"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/server/dal/auth";
import { revalidatePath } from "next/cache";

export interface HomeworkAttachment {
  id?: string;
  mediaId?: string;
  title: string;
  url: string;
  type: string;
  size?: number;
}

export interface SaveHomeworkPayload {
  title: string;
  description?: string;
  instructions: string;
  totalMarks: number;
  passingMarks?: number | null;
  deadline?: string | null;
  allowLateSubmission: boolean;
  maxAttempts: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  attachedMedia?: HomeworkAttachment[];
}

export interface SubmittedFileInput {
  fileUrl: string;
  storageKey?: string;
  originalFilename: string;
  fileSize: number;
  mimeType?: string;
}

/**
 * Get Homework for a Lesson (Student and Admin)
 */
export async function getLessonHomeworkAction(lessonId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const homework = await prisma.homework.findUnique({
    where: { lessonId },
    include: {
      lesson: {
        include: {
          module: {
            include: { course: true },
          },
        },
      },
    },
  });

  if (!homework) return null;

  // Retrieve student submissions
  const submissions = await prisma.homeworkSubmission.findMany({
    where: {
      homeworkId: homework.id,
      userId: user.id,
    },
    orderBy: { attemptNumber: "desc" },
    include: {
      files: true,
      history: {
        orderBy: { attemptNumber: "asc" },
      },
    },
  });

  const latestSubmission = submissions[0] || null;

  // Check deadline
  const now = new Date();
  const deadlineDate = homework.deadline ? new Date(homework.deadline) : null;
  const isPastDeadline = deadlineDate ? now > deadlineDate : false;
  const isSubmissionAllowed =
    homework.status === "PUBLISHED" &&
    (!latestSubmission ||
      latestSubmission.status === "RETURNED_FOR_RESUBMISSION" ||
      latestSubmission.status === "DRAFT") &&
    (!isPastDeadline || homework.allowLateSubmission) &&
    submissions.length < homework.maxAttempts;

  return {
    homework: {
      id: homework.id,
      lessonId: homework.lessonId,
      title: homework.title,
      description: homework.description,
      instructions: homework.instructions,
      totalMarks: Number(homework.totalMarks),
      passingMarks: homework.passingMarks ? Number(homework.passingMarks) : null,
      deadline: homework.deadline ? homework.deadline.toISOString() : null,
      allowLateSubmission: homework.allowLateSubmission,
      maxAttempts: homework.maxAttempts,
      status: homework.status,
      attachedMedia: (homework.attachedMediaIds as unknown as HomeworkAttachment[]) || [],
      courseSlug: homework.lesson.module.course.slug,
      courseTitle: homework.lesson.module.course.title,
    },
    submissions: submissions.map((sub) => ({
      id: sub.id,
      attemptNumber: sub.attemptNumber,
      textAnswer: sub.textAnswer,
      status: sub.status,
      marksObtained: sub.marksObtained ? Number(sub.marksObtained) : null,
      percentage: sub.percentage ? Number(sub.percentage) : null,
      isPassed: sub.isPassed,
      feedback: sub.feedback,
      adminNote: isAdmin ? sub.adminNote : null,
      submittedAt: sub.submittedAt.toISOString(),
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      isLate: sub.isLate,
      files: sub.files.map((f) => ({
        id: f.id,
        fileUrl: f.fileUrl,
        storageKey: f.storageKey,
        originalFilename: f.originalFilename,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      })),
      history: sub.history.map((h) => ({
        id: h.id,
        attemptNumber: h.attemptNumber,
        status: h.status,
        marksObtained: h.marksObtained ? Number(h.marksObtained) : null,
        feedback: h.feedback,
        submittedAt: h.submittedAt.toISOString(),
        isLate: h.isLate,
      })),
    })),
    latestSubmission: latestSubmission
      ? {
          id: latestSubmission.id,
          attemptNumber: latestSubmission.attemptNumber,
          textAnswer: latestSubmission.textAnswer,
          status: latestSubmission.status,
          marksObtained: latestSubmission.marksObtained ? Number(latestSubmission.marksObtained) : null,
          percentage: latestSubmission.percentage ? Number(latestSubmission.percentage) : null,
          isPassed: latestSubmission.isPassed,
          feedback: latestSubmission.feedback,
          adminNote: isAdmin ? latestSubmission.adminNote : null,
          submittedAt: latestSubmission.submittedAt.toISOString(),
          reviewedAt: latestSubmission.reviewedAt ? latestSubmission.reviewedAt.toISOString() : null,
          isLate: latestSubmission.isLate,
          files: latestSubmission.files,
        }
      : null,
    isPastDeadline,
    isSubmissionAllowed,
    attemptsUsed: submissions.length,
    maxAttempts: homework.maxAttempts,
  };
}

/**
 * Save / Update Homework (Admin Only)
 */
export async function saveHomeworkAction(lessonId: string, payload: SaveHomeworkPayload) {
  const admin = await requireAdmin();

  // Verify lesson exists
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  // Ensure contentType is ASSIGNMENT
  if (lesson.contentType !== "ASSIGNMENT") {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { contentType: "ASSIGNMENT" },
    });
  }

  const deadlineDate = payload.deadline ? new Date(payload.deadline) : null;

  const existing = await prisma.homework.findUnique({
    where: { lessonId },
  });

  let homeworkId: string;

  if (existing) {
    const updated = await prisma.homework.update({
      where: { id: existing.id },
      data: {
        title: payload.title,
        description: payload.description,
        instructions: payload.instructions,
        totalMarks: payload.totalMarks,
        passingMarks: payload.passingMarks,
        deadline: deadlineDate,
        allowLateSubmission: payload.allowLateSubmission,
        maxAttempts: payload.maxAttempts,
        status: payload.status,
        attachedMediaIds: payload.attachedMedia ? JSON.parse(JSON.stringify(payload.attachedMedia)) : null,
      },
    });
    homeworkId = updated.id;
  } else {
    const created = await prisma.homework.create({
      data: {
        lessonId,
        title: payload.title,
        description: payload.description,
        instructions: payload.instructions,
        totalMarks: payload.totalMarks,
        passingMarks: payload.passingMarks,
        deadline: deadlineDate,
        allowLateSubmission: payload.allowLateSubmission,
        maxAttempts: payload.maxAttempts,
        status: payload.status,
        attachedMediaIds: payload.attachedMedia ? JSON.parse(JSON.stringify(payload.attachedMedia)) : null,
        isTestData: admin.isTestData || false,
      },
    });
    homeworkId = created.id;
  }

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  revalidatePath(`/learn/${lesson.module.course.slug}/${lesson.id}`);

  return { success: true, homeworkId };
}

/**
 * Submit Homework (Student)
 */
export async function submitHomeworkAction(
  homeworkId: string,
  payload: {
    textAnswer?: string;
    files: SubmittedFileInput[];
  }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: {
      lesson: {
        include: { module: { include: { course: true } } },
      },
    },
  });

  if (!homework) throw new Error("Homework not found");
  if (homework.status !== "PUBLISHED") {
    throw new Error("This homework is not accepting submissions.");
  }

  // Check deadline
  const now = new Date();
  const isLate = homework.deadline ? now > new Date(homework.deadline) : false;
  if (isLate && !homework.allowLateSubmission) {
    throw new Error("The submission deadline for this homework has passed.");
  }

  // Check enrollment
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: homework.lesson.module.courseId,
      },
    },
  });

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!enrollment && !isAdmin) {
    throw new Error("You must be enrolled in this course to submit homework.");
  }

  // Count past submissions
  const pastSubmissions = await prisma.homeworkSubmission.findMany({
    where: { homeworkId, userId: user.id },
    orderBy: { attemptNumber: "desc" },
  });

  const latestSub = pastSubmissions[0];
  if (latestSub && latestSub.status === "SUBMITTED") {
    throw new Error("Your previous submission is currently awaiting teacher review.");
  }

  const nextAttemptNumber = pastSubmissions.length + 1;
  if (nextAttemptNumber > homework.maxAttempts) {
    throw new Error(`Maximum attempts (${homework.maxAttempts}) reached.`);
  }

  // Create or Update Submission
  const submission = await prisma.homeworkSubmission.create({
    data: {
      homeworkId,
      userId: user.id,
      attemptNumber: nextAttemptNumber,
      textAnswer: payload.textAnswer || null,
      status: "SUBMITTED",
      submittedAt: now,
      isLate,
      isTestData: user.isTestData || false,
      files: {
        create: payload.files.map((f) => ({
          fileUrl: f.fileUrl,
          storageKey: f.storageKey || null,
          originalFilename: f.originalFilename,
          fileSize: f.fileSize || 0,
          mimeType: f.mimeType || null,
        })),
      },
    },
  });

  // Automatically update lesson progress to COMPLETED or IN_PROGRESS upon valid submission
  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId: homework.lessonId,
      },
    },
    update: {
      status: "COMPLETED",
      completedAt: now,
    },
    create: {
      userId: user.id,
      lessonId: homework.lessonId,
      status: "COMPLETED",
      completedAt: now,
      isTestData: user.isTestData || false,
    },
  });

  revalidatePath(`/learn/${homework.lesson.module.course.slug}/${homework.lessonId}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/dashboard/courses`);

  return { success: true, submissionId: submission.id, attemptNumber: nextAttemptNumber };
}

/**
 * Review Homework Submission (Admin Only)
 */
export async function reviewHomeworkAction(
  submissionId: string,
  payload: {
    marksObtained: number;
    feedback?: string;
    adminNote?: string;
  }
) {
  const admin = await requireAdmin();

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: {
      homework: {
        include: {
          lesson: {
            include: { module: { include: { course: true } } },
          },
        },
      },
    },
  });

  if (!submission) throw new Error("Submission not found");

  const totalMarks = Number(submission.homework.totalMarks) || 100;
  const marksObtained = payload.marksObtained;
  const percentage = Math.round((marksObtained / totalMarks) * 100 * 100) / 100;

  const passingMarks = submission.homework.passingMarks
    ? Number(submission.homework.passingMarks)
    : null;
  const isPassed = passingMarks !== null ? marksObtained >= passingMarks : true;

  const updated = await prisma.homeworkSubmission.update({
    where: { id: submissionId },
    data: {
      status: "REVIEWED",
      marksObtained,
      percentage,
      isPassed,
      feedback: payload.feedback || null,
      adminNote: payload.adminNote || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/admin/homework`);
  revalidatePath(`/learn/${submission.homework.lesson.module.course.slug}/${submission.homework.lessonId}`);

  return { success: true, submission: updated };
}

/**
 * Return Homework for Resubmission (Admin Only)
 */
export async function returnHomeworkForResubmissionAction(
  submissionId: string,
  payload: {
    feedback: string;
    adminNote?: string;
  }
) {
  const admin = await requireAdmin();

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: {
      files: true,
      homework: {
        include: {
          lesson: {
            include: { module: { include: { course: true } } },
          },
        },
      },
    },
  });

  if (!submission) throw new Error("Submission not found");
  if (!payload.feedback.trim()) throw new Error("Feedback/reason is required when returning homework.");

  // 1. Save history snapshot of current attempt
  await prisma.homeworkSubmissionHistory.create({
    data: {
      submissionId: submission.id,
      attemptNumber: submission.attemptNumber,
      textAnswer: submission.textAnswer,
      filesSnapshot: JSON.parse(JSON.stringify(submission.files)),
      status: "RETURNED_FOR_RESUBMISSION",
      marksObtained: submission.marksObtained,
      feedback: payload.feedback,
      adminNote: payload.adminNote || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      submittedAt: submission.submittedAt,
      isLate: submission.isLate,
    },
  });

  // 2. Update current submission status
  const updated = await prisma.homeworkSubmission.update({
    where: { id: submissionId },
    data: {
      status: "RETURNED_FOR_RESUBMISSION",
      feedback: payload.feedback,
      adminNote: payload.adminNote || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/admin/homework`);
  revalidatePath(`/learn/${submission.homework.lesson.module.course.slug}/${submission.homework.lessonId}`);
  revalidatePath(`/dashboard`);

  return { success: true, submission: updated };
}

/**
 * Admin: Get Homework Submissions List with Filters
 */
export async function getAdminHomeworkSubmissionsAction(filters?: {
  status?: string;
  courseId?: string;
  isLate?: boolean;
}) {
  await requireAdmin();

  const whereClause: any = {};
  if (filters?.status && filters.status !== "ALL") {
    whereClause.status = filters.status;
  }
  if (filters?.isLate !== undefined) {
    whereClause.isLate = filters.isLate;
  }
  if (filters?.courseId && filters.courseId !== "ALL") {
    whereClause.homework = {
      lesson: {
        module: {
          courseId: filters.courseId,
        },
      },
    };
  }

  const submissions = await prisma.homeworkSubmission.findMany({
    where: whereClause,
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      homework: {
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: { id: true, title: true, slug: true },
                  },
                },
              },
            },
          },
        },
      },
      files: true,
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return submissions.map((s) => ({
    id: s.id,
    homeworkId: s.homeworkId,
    homeworkTitle: s.homework.title,
    courseTitle: s.homework.lesson.module.course.title,
    courseSlug: s.homework.lesson.module.course.slug,
    moduleTitle: s.homework.lesson.module.title,
    lessonId: s.homework.lessonId,
    studentId: s.user.id,
    studentName: s.user.name || "Unnamed Student",
    studentEmail: s.user.email,
    studentPhone: s.user.phone,
    attemptNumber: s.attemptNumber,
    status: s.status,
    totalMarks: Number(s.homework.totalMarks),
    marksObtained: s.marksObtained ? Number(s.marksObtained) : null,
    percentage: s.percentage ? Number(s.percentage) : null,
    isPassed: s.isPassed,
    feedback: s.feedback,
    adminNote: s.adminNote,
    isLate: s.isLate,
    submittedAt: s.submittedAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    reviewedByName: s.reviewedBy?.name || s.reviewedBy?.email || null,
    filesCount: s.files.length,
    files: s.files.map((f) => ({
      id: f.id,
      fileUrl: f.fileUrl,
      originalFilename: f.originalFilename,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
    })),
    textAnswer: s.textAnswer,
    deadline: s.homework.deadline ? s.homework.deadline.toISOString() : null,
  }));
}

/**
 * Admin: Get Single Submission Details with Files
 */
export async function getAdminHomeworkSubmissionDetailAction(submissionId: string) {
  await requireAdmin();

  const sub = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
      },
      homework: {
        include: {
          lesson: {
            include: {
              module: {
                include: { course: true },
              },
            },
          },
        },
      },
      files: true,
      history: {
        orderBy: { attemptNumber: "asc" },
      },
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!sub) throw new Error("Submission not found");

  return {
    id: sub.id,
    homeworkId: sub.homeworkId,
    homeworkTitle: sub.homework.title,
    homeworkInstructions: sub.homework.instructions,
    totalMarks: Number(sub.homework.totalMarks),
    passingMarks: sub.homework.passingMarks ? Number(sub.homework.passingMarks) : null,
    deadline: sub.homework.deadline ? sub.homework.deadline.toISOString() : null,
    allowLateSubmission: sub.homework.allowLateSubmission,
    courseTitle: sub.homework.lesson.module.course.title,
    courseSlug: sub.homework.lesson.module.course.slug,
    moduleTitle: sub.homework.lesson.module.title,
    lessonId: sub.homework.lessonId,
    student: sub.user,
    attemptNumber: sub.attemptNumber,
    textAnswer: sub.textAnswer,
    status: sub.status,
    marksObtained: sub.marksObtained ? Number(sub.marksObtained) : null,
    percentage: sub.percentage ? Number(sub.percentage) : null,
    isPassed: sub.isPassed,
    feedback: sub.feedback,
    adminNote: sub.adminNote,
    isLate: sub.isLate,
    submittedAt: sub.submittedAt.toISOString(),
    reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
    reviewedBy: sub.reviewedBy,
    files: sub.files.map((f) => ({
      id: f.id,
      fileUrl: f.fileUrl,
      storageKey: f.storageKey,
      originalFilename: f.originalFilename,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
    })),
    history: sub.history.map((h) => ({
      id: h.id,
      attemptNumber: h.attemptNumber,
      textAnswer: h.textAnswer,
      filesSnapshot: h.filesSnapshot,
      status: h.status,
      marksObtained: h.marksObtained ? Number(h.marksObtained) : null,
      feedback: h.feedback,
      adminNote: h.adminNote,
      submittedAt: h.submittedAt.toISOString(),
      reviewedAt: h.reviewedAt ? h.reviewedAt.toISOString() : null,
      isLate: h.isLate,
    })),
  };
}

/**
 * Student Dashboard: Get Assigned Homework & Submission Statuses
 */
export async function getStudentHomeworkDashboardListAction() {
  const user = await getCurrentUser();
  if (!user) return [];

  // Find all courses user is enrolled in
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { courseId: true },
  });

  const enrolledCourseIds = enrollments.map((e) => e.courseId);
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!isAdmin && enrolledCourseIds.length === 0) return [];

  // Find all homework lessons that admin enabled for dashboard display
  const homeworks = await prisma.homework.findMany({
    where: {
      status: "PUBLISHED",
      isVisibleOnDashboard: true,
      OR: [
        { requiresAnyEnrollment: true },
        {
          lesson: {
            module: {
              courseId: { in: enrolledCourseIds },
            },
          },
        },
      ],
    },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
        },
      },
      submissions: {
        where: { userId: user.id },
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return homeworks.map((hw) => {
    const latestSub = hw.submissions[0] || null;
    const deadlineDate = hw.deadline ? new Date(hw.deadline) : null;
    const isOverdue = !latestSub && deadlineDate && now > deadlineDate;

    let computedStatus = "NOT_STARTED";
    if (latestSub) {
      computedStatus = latestSub.status;
    } else if (isOverdue) {
      computedStatus = "OVERDUE";
    }

    return {
      homeworkId: hw.id,
      lessonId: hw.lessonId,
      title: hw.title,
      courseTitle: hw.lesson.module.course.title,
      courseSlug: hw.lesson.module.course.slug,
      moduleTitle: hw.lesson.module.title,
      totalMarks: Number(hw.totalMarks),
      deadline: hw.deadline ? hw.deadline.toISOString() : null,
      isOverdue,
      status: computedStatus,
      marksObtained: latestSub?.marksObtained ? Number(latestSub.marksObtained) : null,
      percentage: latestSub?.percentage ? Number(latestSub.percentage) : null,
      feedback: latestSub?.feedback || null,
      submittedAt: latestSub?.submittedAt ? latestSub.submittedAt.toISOString() : null,
      attemptNumber: latestSub?.attemptNumber || 0,
      maxAttempts: hw.maxAttempts,
    };
  });
}

/**
 * Admin: Get List of All Homework Assignments with Submission Counts
 */
export async function getAdminHomeworkAssignmentsListAction() {
  await requireAdmin();

  const homeworks = await prisma.homework.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
        },
      },
      submissions: {
        select: {
          id: true,
          status: true,
          marksObtained: true,
          isLate: true,
        },
      },
    },
  });

  return homeworks.map((hw) => {
    const totalSubmissions = hw.submissions.length;
    const pendingReviews = hw.submissions.filter((s) => s.status === "SUBMITTED").length;
    const reviewedCount = hw.submissions.filter((s) => s.status === "REVIEWED").length;
    const returnedCount = hw.submissions.filter((s) => s.status === "RETURNED_FOR_RESUBMISSION").length;

    return {
      id: hw.id,
      lessonId: hw.lessonId,
      title: hw.title,
      description: hw.description,
      instructions: hw.instructions,
      totalMarks: Number(hw.totalMarks),
      passingMarks: hw.passingMarks ? Number(hw.passingMarks) : null,
      deadline: hw.deadline ? hw.deadline.toISOString() : null,
      allowLateSubmission: hw.allowLateSubmission,
      maxAttempts: hw.maxAttempts,
      status: hw.status,
      attachedMedia: (hw.attachedMediaIds as unknown as HomeworkAttachment[]) || [],
      isVisibleOnDashboard: hw.isVisibleOnDashboard,
      requiresAnyEnrollment: hw.requiresAnyEnrollment,
      courseId: hw.lesson.module.course.id,
      courseTitle: hw.lesson.module.course.title,
      courseSlug: hw.lesson.module.course.slug,
      moduleTitle: hw.lesson.module.title,
      lessonTitle: hw.lesson.title,
      totalSubmissions,
      pendingReviews,
      reviewedCount,
      returnedCount,
      createdAt: hw.createdAt.toISOString(),
    };
  });
}

/**
 * Shareable Homework Access Action
 * Verifies enrollment: ONLY enrolled students (or admins) can access the homework.
 */
export async function getHomeworkShareableDataAction(identifier: string) {
  const user = await getCurrentUser();

  // Find homework by ID or by lessonId
  const homework = await prisma.homework.findFirst({
    where: {
      OR: [{ id: identifier }, { lessonId: identifier }],
    },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      },
    },
  });

  if (!homework) {
    return { access: "NOT_FOUND" as const };
  }

  const course = homework.lesson.module.course;

  if (!user) {
    return {
      access: "UNAUTHENTICATED" as const,
      homeworkId: homework.id,
      courseTitle: course.title,
    };
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  // Check enrollment:
  // If requiresAnyEnrollment is true, ANY active course enrollment gives access!
  const specificEnrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: course.id,
      },
    },
  });

  const anyEnrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
  });

  const isEnrolled = Boolean(
    (specificEnrollment && specificEnrollment.status === "ACTIVE") ||
    (homework.requiresAnyEnrollment && anyEnrollment)
  );

  if (!isAdmin && !isEnrolled) {
    return {
      access: "FORBIDDEN" as const,
      courseTitle: course.title,
      courseSlug: course.slug,
      courseId: course.id,
      coursePrice: course.price ? Number(course.price) : 0,
      courseThumbnail: course.thumbnailCdnUrl || null,
    };
  }

  // User is authorized (enrolled or admin). Retrieve student submissions
  const submissions = await prisma.homeworkSubmission.findMany({
    where: {
      homeworkId: homework.id,
      userId: user.id,
    },
    orderBy: { attemptNumber: "desc" },
    include: {
      files: true,
      history: {
        orderBy: { attemptNumber: "asc" },
      },
    },
  });

  const latestSubmission = submissions[0] || null;
  const now = new Date();
  const deadlineDate = homework.deadline ? new Date(homework.deadline) : null;
  const isPastDeadline = deadlineDate ? now > deadlineDate : false;
  const isSubmissionAllowed =
    homework.status === "PUBLISHED" &&
    (!latestSubmission ||
      latestSubmission.status === "RETURNED_FOR_RESUBMISSION" ||
      latestSubmission.status === "DRAFT") &&
    (!isPastDeadline || homework.allowLateSubmission) &&
    submissions.length < homework.maxAttempts;

  return {
    access: "GRANTED" as const,
    homework: {
      id: homework.id,
      lessonId: homework.lessonId,
      title: homework.title,
      description: homework.description,
      instructions: homework.instructions,
      totalMarks: Number(homework.totalMarks),
      passingMarks: homework.passingMarks ? Number(homework.passingMarks) : null,
      deadline: homework.deadline ? homework.deadline.toISOString() : null,
      allowLateSubmission: homework.allowLateSubmission,
      maxAttempts: homework.maxAttempts,
      status: homework.status,
      attachedMedia: (homework.attachedMediaIds as unknown as HomeworkAttachment[]) || [],
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      moduleTitle: homework.lesson.module.title,
    },
    submissions: submissions.map((sub) => ({
      id: sub.id,
      attemptNumber: sub.attemptNumber,
      textAnswer: sub.textAnswer,
      status: sub.status,
      marksObtained: sub.marksObtained ? Number(sub.marksObtained) : null,
      percentage: sub.percentage ? Number(sub.percentage) : null,
      isPassed: sub.isPassed,
      feedback: sub.feedback,
      adminNote: isAdmin ? sub.adminNote : null,
      submittedAt: sub.submittedAt.toISOString(),
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      isLate: sub.isLate,
      files: sub.files.map((f) => ({
        id: f.id,
        fileUrl: f.fileUrl,
        storageKey: f.storageKey,
        originalFilename: f.originalFilename,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      })),
      history: sub.history.map((h) => ({
        id: h.id,
        attemptNumber: h.attemptNumber,
        status: h.status,
        marksObtained: h.marksObtained ? Number(h.marksObtained) : null,
        feedback: h.feedback,
        submittedAt: h.submittedAt.toISOString(),
        isLate: h.isLate,
      })),
    })),
    latestSubmission: latestSubmission
      ? {
          id: latestSubmission.id,
          attemptNumber: latestSubmission.attemptNumber,
          textAnswer: latestSubmission.textAnswer,
          status: latestSubmission.status,
          marksObtained: latestSubmission.marksObtained ? Number(latestSubmission.marksObtained) : null,
          percentage: latestSubmission.percentage ? Number(latestSubmission.percentage) : null,
          isPassed: latestSubmission.isPassed,
          feedback: latestSubmission.feedback,
          adminNote: isAdmin ? latestSubmission.adminNote : null,
          submittedAt: latestSubmission.submittedAt.toISOString(),
          reviewedAt: latestSubmission.reviewedAt ? latestSubmission.reviewedAt.toISOString() : null,
          isLate: latestSubmission.isLate,
          files: latestSubmission.files,
        }
      : null,
    isPastDeadline,
    isSubmissionAllowed,
    attemptsUsed: submissions.length,
    maxAttempts: homework.maxAttempts,
  };
}

/**
 * Toggle Homework Visibility on Student Dashboard (Admin Only)
 */
export async function toggleHomeworkDashboardVisibilityAction(
  homeworkId: string,
  isVisibleOnDashboard: boolean
) {
  await requireAdmin();

  const updated = await prisma.homework.update({
    where: { id: homeworkId },
    data: { isVisibleOnDashboard },
  });

  revalidatePath("/admin/homework");
  revalidatePath("/dashboard/homework");

  return { success: true, isVisibleOnDashboard: updated.isVisibleOnDashboard };
}

/**
 * Get Courses list for homework creation modal
 */
export async function getCoursesForHomeworkDropdownAction() {
  await requireAdmin();
  return prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create Homework Directly from Admin Homework Management
 * (Does NOT redirect to Course Builder; attaches seamlessly to course and creates practical lab)
 */
export async function createAdminHomeworkAction(payload: {
  title: string;
  instructions: string;
  description?: string;
  courseId?: string;
  totalMarks?: number;
  passingMarks?: number;
  deadline?: string;
  allowLateSubmission?: boolean;
  maxAttempts?: number;
  isVisibleOnDashboard?: boolean;
  requiresAnyEnrollment?: boolean;
  attachedMedia?: HomeworkAttachment[];
}) {
  const admin = await requireAdmin();

  if (!payload.title?.trim()) {
    throw new Error("Homework title is required.");
  }
  if (!payload.instructions?.trim()) {
    throw new Error("Homework instructions are required.");
  }

  // 1. Resolve Target Course
  let targetCourseId = payload.courseId;
  if (!targetCourseId) {
    const defaultCourse = await prisma.course.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
    });
    if (!defaultCourse) {
      const anyCourse = await prisma.course.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!anyCourse) throw new Error("Please create at least one course before creating homework.");
      targetCourseId = anyCourse.id;
    } else {
      targetCourseId = defaultCourse.id;
    }
  }

  const course = await prisma.course.findUnique({
    where: { id: targetCourseId },
    include: {
      modules: {
        orderBy: { position: "desc" },
        include: { lessons: { orderBy: { position: "desc" } } },
      },
    },
  });

  if (!course) throw new Error("Course not found");

  // 2. Find or Create Module for Assignments
  let targetModule = course.modules.find(
    (m) =>
      m.title.toLowerCase().includes("homework") ||
      m.title.toLowerCase().includes("assignment") ||
      m.title.toLowerCase().includes("practice") ||
      m.title.toLowerCase().includes("lab")
  );

  if (!targetModule) {
    const maxModulePos = course.modules.length > 0 ? course.modules[0].position : 0;
    targetModule = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Practical Assignments & Homework Labs",
        position: maxModulePos + 1,
        isPublished: true,
      },
      include: { lessons: true },
    });
  }

  // 3. Create Lesson with ASSIGNMENT content type
  const maxLessonPos = targetModule.lessons.length > 0 ? targetModule.lessons[0].position : 0;
  const slugBase = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const lessonSlug = `${slugBase}-${Date.now().toString(36)}`;

  const lesson = await prisma.lesson.create({
    data: {
      moduleId: targetModule.id,
      title: payload.title,
      slug: lessonSlug,
      position: maxLessonPos + 1,
      contentType: "ASSIGNMENT",
      isPublished: true,
      isFreePreview: false,
    },
  });

  // 4. Create Homework Record
  const deadlineDate = payload.deadline ? new Date(payload.deadline) : null;
  const totalMarks = payload.totalMarks || 100;
  const passingMarks = payload.passingMarks || 50;

  const homework = await prisma.homework.create({
    data: {
      lessonId: lesson.id,
      title: payload.title,
      description: payload.description || null,
      instructions: payload.instructions,
      totalMarks,
      passingMarks,
      deadline: deadlineDate,
      allowLateSubmission: payload.allowLateSubmission ?? true,
      maxAttempts: payload.maxAttempts ?? 5,
      status: "PUBLISHED",
      isVisibleOnDashboard: payload.isVisibleOnDashboard ?? true,
      requiresAnyEnrollment: payload.requiresAnyEnrollment ?? true,
      attachedMediaIds: payload.attachedMedia ? JSON.parse(JSON.stringify(payload.attachedMedia)) : null,
      isTestData: admin.isTestData || false,
    },
  });

  revalidatePath("/admin/homework");
  revalidatePath("/dashboard/homework");
  revalidatePath(`/homework/${homework.id}`);

  return { success: true, homeworkId: homework.id };
}


