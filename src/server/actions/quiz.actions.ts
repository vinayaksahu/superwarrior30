"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { requireAdmin } from "@/server/dal/auth";
import { revalidatePath } from "next/cache";

export interface QuizOptionInput {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuizQuestionInput {
  id?: string;
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  imageUrl?: string | null;
  marks: number;
  explanation?: string | null;
  sortOrder: number;
  options: QuizOptionInput[];
}

export interface SaveQuizPayload {
  title: string;
  description?: string;
  passingPercentage: number;
  timeLimitMinutes?: number | null;
  maxAttempts: number;
  showAnswers: "IMMEDIATELY" | "AFTER_REVIEW" | "NEVER";
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isPublished: boolean;
  questions: QuizQuestionInput[];
}

/**
 * Get Quiz for a Lesson (Safe for students — hides correct answers before submission)
 */
export async function getLessonQuizAction(lessonId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!quiz) return null;

  // If student, check previous attempts
  const userAttempts = await prisma.quizAttempt.findMany({
    where: {
      quizId: quiz.id,
      userId: user.id,
    },
    orderBy: { attemptNumber: "desc" },
    include: {
      answers: true,
    },
  });

  const latestAttempt = userAttempts[0] || null;
  const isCompleted = userAttempts.some((a) => a.status === "PASSED" || (quiz.maxAttempts > 0 && userAttempts.length >= quiz.maxAttempts));

  // Determine if correct answers should be revealed
  const shouldRevealAnswers =
    isAdmin ||
    (latestAttempt &&
      latestAttempt.status !== "IN_PROGRESS" &&
      (quiz.showAnswers === "IMMEDIATELY" || (quiz.showAnswers === "AFTER_REVIEW" && isCompleted)));

  const sanitizedQuestions = quiz.questions.map((q) => {
    let options = q.options.map((opt) => ({
      id: opt.id,
      optionText: opt.optionText,
      sortOrder: opt.sortOrder,
      isCorrect: shouldRevealAnswers ? opt.isCorrect : undefined,
    }));

    if (quiz.shuffleOptions && !shouldRevealAnswers) {
      // Deterministic or pseudorandom shuffle for non-revealed questions
      options = [...options].sort(() => Math.random() - 0.5);
    }

    return {
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      imageUrl: q.imageUrl,
      marks: q.marks,
      explanation: shouldRevealAnswers ? q.explanation : undefined,
      sortOrder: q.sortOrder,
      options,
    };
  });

  return {
    quiz: {
      ...quiz,
      questions: quiz.shuffleQuestions && !shouldRevealAnswers
        ? [...sanitizedQuestions].sort(() => Math.random() - 0.5)
        : sanitizedQuestions,
    },
    userAttempts: userAttempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      score: Number(a.score),
      totalMarks: Number(a.totalMarks),
      percentage: Number(a.percentage),
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      timeTakenSeconds: a.timeTakenSeconds,
      answers: a.answers,
    })),
    canAttempt: !isCompleted && userAttempts.length < quiz.maxAttempts,
    attemptsCount: userAttempts.length,
    maxAttempts: quiz.maxAttempts,
  };
}

/**
 * Save / Update Quiz (Admin Only)
 */
export async function saveQuizAction(lessonId: string, payload: SaveQuizPayload) {
  const admin = await requireAdmin();

  // Verify lesson exists
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  // Ensure contentType is QUIZ
  if (lesson.contentType !== "QUIZ") {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { contentType: "QUIZ" },
    });
  }

  // Calculate total marks across questions
  const totalQuestionsMarks = payload.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  // Upsert Quiz
  const existingQuiz = await prisma.quiz.findUnique({
    where: { lessonId },
  });

  let quizId = existingQuiz?.id;

  if (existingQuiz) {
    await prisma.quiz.update({
      where: { id: existingQuiz.id },
      data: {
        title: payload.title,
        description: payload.description,
        passingPercentage: payload.passingPercentage,
        timeLimitMinutes: payload.timeLimitMinutes,
        maxAttempts: payload.maxAttempts,
        showAnswers: payload.showAnswers,
        shuffleQuestions: payload.shuffleQuestions,
        shuffleOptions: payload.shuffleOptions,
        isPublished: payload.isPublished,
      },
    });

    // Delete existing questions and options for clean replacement
    await prisma.quizQuestion.deleteMany({
      where: { quizId: existingQuiz.id },
    });
  } else {
    const created = await prisma.quiz.create({
      data: {
        lessonId,
        title: payload.title,
        description: payload.description,
        passingPercentage: payload.passingPercentage,
        timeLimitMinutes: payload.timeLimitMinutes,
        maxAttempts: payload.maxAttempts,
        showAnswers: payload.showAnswers,
        shuffleQuestions: payload.shuffleQuestions,
        shuffleOptions: payload.shuffleOptions,
        isPublished: payload.isPublished,
        isTestData: admin.isTestData || false,
      },
    });
    quizId = created.id;
  }

  // Create questions and options
  await Promise.all(
    payload.questions.map((q, i) =>
      prisma.quizQuestion.create({
        data: {
          quizId: quizId!,
          questionText: q.questionText,
          questionType: q.questionType,
          imageUrl: q.imageUrl || null,
          marks: q.marks || 1,
          explanation: q.explanation || null,
          sortOrder: i,
          options: {
            create: q.options.map((opt, optIdx) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              sortOrder: optIdx,
            })),
          },
        },
      })
    )
  );

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  revalidatePath(`/learn/${lesson.module.course.slug}/${lesson.id}`);

  return { success: true, quizId };
}

/**
 * Start Quiz Attempt for Student
 */
export async function startQuizAttemptAction(quizId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        include: { module: { include: { course: true } } },
      },
    },
  });

  if (!quiz) throw new Error("Quiz not found");

  // Check enrollment
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: quiz.lesson.module.courseId,
      },
    },
  });

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!enrollment && !isAdmin) {
    throw new Error("You must be enrolled in this course to take the quiz.");
  }

  // Count existing attempts
  const attemptsCount = await prisma.quizAttempt.count({
    where: {
      quizId,
      userId: user.id,
    },
  });

  if (attemptsCount >= quiz.maxAttempts) {
    throw new Error(`Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`);
  }

  // Create new Attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      attemptNumber: attemptsCount + 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      isTestData: user.isTestData || false,
    },
  });

  return { success: true, attemptId: attempt.id, attemptNumber: attempt.attemptNumber };
}

/**
 * Submit Quiz Attempt with Strict Server-Side Grading
 */
export async function submitQuizAttemptAction(
  attemptId: string,
  submittedAnswers: { questionId: string; selectedOptionIds: string[]; textAnswer?: string }[],
  timeTakenSeconds?: number
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
          },
          lesson: {
            include: { module: { include: { course: true } } },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error("Quiz attempt not found");
  if (attempt.userId !== user.id) throw new Error("Forbidden");
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("This quiz attempt has already been submitted.");
  }

  const quiz = attempt.quiz;
  let totalCalculatedMarks = 0;
  let earnedScore = 0;

  // Grade each question server-side
  const answerRecords = [];

  for (const question of quiz.questions) {
    const qMarks = question.marks || 1;
    totalCalculatedMarks += qMarks;

    const studentAns = submittedAnswers.find((a) => a.questionId === question.id);
    const selectedIds = studentAns?.selectedOptionIds || [];

    const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

    let isQuestionCorrect = false;

    if (question.questionType === "SINGLE_CHOICE" || question.questionType === "TRUE_FALSE") {
      if (selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0])) {
        isQuestionCorrect = true;
      }
    } else if (question.questionType === "MULTIPLE_CHOICE") {
      // Must have selected ALL correct options and NO incorrect options
      const hasAllCorrect = correctOptionIds.every((id) => selectedIds.includes(id));
      const hasNoIncorrect = selectedIds.every((id) => correctOptionIds.includes(id));
      if (hasAllCorrect && hasNoIncorrect && correctOptionIds.length > 0) {
        isQuestionCorrect = true;
      }
    }

    const marksAwarded = isQuestionCorrect ? qMarks : 0;
    earnedScore += marksAwarded;

    answerRecords.push({
      attemptId,
      questionId: question.id,
      selectedOptionIds: selectedIds,
      textAnswer: studentAns?.textAnswer || null,
      isCorrect: isQuestionCorrect,
      marksAwarded,
    });
  }

  const percentage = totalCalculatedMarks > 0 ? (earnedScore / totalCalculatedMarks) * 100 : 0;
  const isPassed = percentage >= quiz.passingPercentage;
  const finalStatus = isPassed ? "PASSED" : "FAILED";

  // Batch insert answers
  await prisma.quizAnswer.createMany({
    data: answerRecords,
  });

  // Update Attempt Record
  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score: earnedScore,
      totalMarks: totalCalculatedMarks,
      percentage,
      status: finalStatus,
      submittedAt: new Date(),
      timeTakenSeconds: timeTakenSeconds || null,
    },
  });

  // If passed, mark Lesson Progress as COMPLETED
  if (isPassed) {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: quiz.lessonId,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        userId: user.id,
        lessonId: quiz.lessonId,
        status: "COMPLETED",
        completedAt: new Date(),
        isTestData: user.isTestData || false,
      },
    });
  }

  revalidatePath(`/learn/${quiz.lesson.module.course.slug}/${quiz.lessonId}`);

  return {
    success: true,
    score: earnedScore,
    totalMarks: totalCalculatedMarks,
    percentage: Math.round(percentage * 100) / 100,
    isPassed,
    status: finalStatus,
  };
}

/**
 * Admin: Get All Quizzes & Statistics
 */
export async function getAdminQuizzesAction() {
  await requireAdmin();

  const quizzes = await prisma.quiz.findMany({
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
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
      attempts: {
        select: {
          status: true,
          percentage: true,
        },
      },
    },
  });

  return quizzes.map((q) => {
    const passedAttempts = q.attempts.filter((a) => a.status === "PASSED").length;
    const failedAttempts = q.attempts.filter((a) => a.status === "FAILED").length;
    const avgScore =
      q.attempts.length > 0
        ? Math.round(
            q.attempts.reduce((sum, a) => sum + Number(a.percentage), 0) / q.attempts.length
          )
        : 0;

    return {
      id: q.id,
      title: q.title,
      courseTitle: q.lesson.module.course.title,
      courseSlug: q.lesson.module.course.slug,
      moduleTitle: q.lesson.module.title,
      lessonId: q.lessonId,
      questionsCount: q._count.questions,
      attemptsCount: q._count.attempts,
      passingPercentage: q.passingPercentage,
      passedAttempts,
      failedAttempts,
      avgScore,
      createdAt: q.createdAt.toISOString(),
    };
  });
}

/**
 * Admin: Get Quiz Attempts List with Student Details
 */
export async function getAdminQuizAttemptsAction(quizId: string) {
  await requireAdmin();

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      quiz: {
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
    },
  });

  return attempts.map((a) => ({
    id: a.id,
    attemptNumber: a.attemptNumber,
    studentName: a.user.name || "Unnamed Student",
    studentEmail: a.user.email,
    studentPhone: a.user.phone,
    score: Number(a.score),
    totalMarks: Number(a.totalMarks),
    percentage: Number(a.percentage),
    status: a.status,
    timeTakenSeconds: a.timeTakenSeconds,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
  }));
}

/**
 * Admin: Inspect Single Attempt with Answers & Student Choices
 */
export async function getAdminQuizAttemptDetailAction(attemptId: string) {
  await requireAdmin();

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      quiz: {
        include: {
          questions: {
            orderBy: { sortOrder: "asc" },
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) throw new Error("Attempt not found");

  return {
    ...attempt,
    score: Number(attempt.score),
    totalMarks: Number(attempt.totalMarks),
    percentage: Number(attempt.percentage),
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
  };
}
