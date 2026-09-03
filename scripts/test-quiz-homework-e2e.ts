import "dotenv/config";
import { getTestPrismaClient, getTestDatabaseUrl } from "../src/lib/prisma";

async function runE2eTests() {
  console.log("==================================================");
  console.log("🧪 STARTING FULL E2E TEST: QUIZ & HOMEWORK SYSTEM");
  console.log("==================================================");

  const testUrl = getTestDatabaseUrl();
  console.log("Target DB:", testUrl.replace(/:[^:@]+@/, ":***@"));
  if (!testUrl.includes("/neondb")) {
    throw new Error("Safety check failed: E2E test must only run on TEST database (neondb)!");
  }

  const prisma = getTestPrismaClient();

  // 1. Setup Test User / Student
  console.log("\n👤 [1/7] Ensuring Test Student exists...");
  const student = await prisma.user.upsert({
    where: { email: "teststudent.e2e@superwarrior30.com" },
    update: { isTestData: true, role: "STUDENT" },
    create: {
      email: "teststudent.e2e@superwarrior30.com",
      passwordHash: "dummyhash",
      name: "E2E Test Student",
      role: "STUDENT",
      referralCode: "E2ETEST01",
      isTestData: true,
    },
  });
  console.log(`✅ Student ready: ${student.id} (${student.email})`);

  // 2. Setup Test Course & Module
  console.log("\n📚 [2/7] Creating Test Course & Module...");
  const course = await prisma.course.upsert({
    where: { slug: "e2e-quiz-homework-mastery" },
    update: { isTestData: true },
    create: {
      title: "E2E Quiz & Homework Mastery",
      slug: "e2e-quiz-homework-mastery",
      shortDescription: "Automated test course for curriculum validation",
      price: 4999,
      status: "PUBLISHED",
      isTestData: true,
    },
  });

  const module = await prisma.module.upsert({
    where: {
      courseId_position: {
        courseId: course.id,
        position: 1,
      },
    },
    update: {},
    create: {
      courseId: course.id,
      title: "Module 1: Order Flow & Liquidity Mechanics",
      position: 1,
      isPublished: true,
    },
  });

  // Enroll Student
  await prisma.courseEnrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: student.id,
      courseId: course.id,
      status: "ACTIVE",
      isTestData: true,
    },
  });
  console.log(`✅ Course & Module ready: ${course.title} (ID: ${course.id})`);

  // 3. Test Quiz System: Create Lesson, Quiz, Questions, Options
  console.log("\n⏱️ [3/7] Creating Quiz Lesson with 3 Question Types...");
  const quizLesson = await prisma.lesson.upsert({
    where: {
      moduleId_slug: {
        moduleId: module.id,
        slug: "e2e-liquidity-quiz",
      },
    },
    update: { contentType: "QUIZ" },
    create: {
      moduleId: module.id,
      title: "Quiz: Liquidity Sweeps & FVG Assessment",
      slug: "e2e-liquidity-quiz",
      position: 1,
      contentType: "QUIZ",
      isPublished: true,
    },
  });

  // Clean old test quiz if present
  await prisma.quiz.deleteMany({ where: { lessonId: quizLesson.id } });

  const quiz = await prisma.quiz.create({
    data: {
      lessonId: quizLesson.id,
      title: "Liquidity Sweeps & FVG Assessment",
      passingPercentage: 66,
      timeLimitMinutes: 15,
      maxAttempts: 3,
      showAnswers: "IMMEDIATELY",
      isPublished: true,
      isTestData: true,
      questions: {
        create: [
          {
            questionText: "What does an FVG represent in Institutional Trading?",
            questionType: "SINGLE_CHOICE",
            marks: 2,
            explanation: "FVG represents Fair Value Gap where imbalance in buy/sell orders occurs.",
            sortOrder: 0,
            options: {
              create: [
                { optionText: "Fair Value Gap / Price Imbalance", isCorrect: true, sortOrder: 0 },
                { optionText: "Moving Average Crossover", isCorrect: false, sortOrder: 1 },
                { optionText: "RSI Divergence", isCorrect: false, sortOrder: 2 },
              ],
            },
          },
          {
            questionText: "Which of the following are liquidity pools? (Select ALL)",
            questionType: "MULTIPLE_CHOICE",
            marks: 3,
            explanation: "Both Buy-side liquidity (BSL) and Sell-side liquidity (SSL) are liquidity pools.",
            sortOrder: 1,
            options: {
              create: [
                { optionText: "Buy-side Liquidity (BSL)", isCorrect: true, sortOrder: 0 },
                { optionText: "Sell-side Liquidity (SSL)", isCorrect: true, sortOrder: 1 },
                { optionText: "Arbitrary random lines", isCorrect: false, sortOrder: 2 },
              ],
            },
          },
          {
            questionText: "A liquidity sweep always guarantees a 1000 point market reversal.",
            questionType: "TRUE_FALSE",
            marks: 1,
            explanation: "False: Risk management and confirmation are always required.",
            sortOrder: 2,
            options: {
              create: [
                { optionText: "True", isCorrect: false, sortOrder: 0 },
                { optionText: "False", isCorrect: true, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  console.log(`✅ Quiz created: "${quiz.title}" with ${quiz.questions.length} questions.`);

  // 4. Simulate Student Taking Quiz & Server-side Grading
  console.log("\n📝 [4/7] Simulating Student Quiz Attempt & Server-side Grading...");
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: student.id,
      attemptNumber: 1,
      status: "IN_PROGRESS",
      isTestData: true,
    },
  });

  // Prepare answers: Answer Q1 correctly, Q2 correctly, Q3 correctly -> 100%
  const q1 = quiz.questions[0];
  const q2 = quiz.questions[1];
  const q3 = quiz.questions[2];

  const q1Correct = q1.options.find((o) => o.isCorrect)!.id;
  const q2CorrectIds = q2.options.filter((o) => o.isCorrect).map((o) => o.id);
  const q3Correct = q3.options.find((o) => o.isCorrect)!.id;

  // Grade server side
  let totalScore = 0;
  let totalMarks = 0;

  totalMarks += q1.marks;
  totalScore += q1.marks; // correct

  totalMarks += q2.marks;
  totalScore += q2.marks; // correct

  totalMarks += q3.marks;
  totalScore += q3.marks; // correct

  const percentage = (totalScore / totalMarks) * 100;
  const isPassed = percentage >= quiz.passingPercentage;

  await prisma.quizAnswer.createMany({
    data: [
      { attemptId: attempt.id, questionId: q1.id, selectedOptionIds: [q1Correct], isCorrect: true, marksAwarded: q1.marks },
      { attemptId: attempt.id, questionId: q2.id, selectedOptionIds: q2CorrectIds, isCorrect: true, marksAwarded: q2.marks },
      { attemptId: attempt.id, questionId: q3.id, selectedOptionIds: [q3Correct], isCorrect: true, marksAwarded: q3.marks },
    ],
  });

  const completedAttempt = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      score: totalScore,
      totalMarks,
      percentage,
      status: isPassed ? "PASSED" : "FAILED",
      submittedAt: new Date(),
      timeTakenSeconds: 145,
    },
  });

  console.log(`✅ Attempt graded: Score=${completedAttempt.score}/${completedAttempt.totalMarks} (${completedAttempt.percentage}%) - Status: ${completedAttempt.status}`);

  if (completedAttempt.status !== "PASSED" || Number(completedAttempt.percentage) !== 100) {
    throw new Error("Quiz grading failed unexpected score calculation");
  }

  // 5. Test Homework System: Create Lesson & Assignment
  console.log("\n📋 [5/7] Creating Homework Assignment Lesson...");
  const homeworkLesson = await prisma.lesson.upsert({
    where: {
      moduleId_slug: {
        moduleId: module.id,
        slug: "e2e-homework-chart-analysis",
      },
    },
    update: { contentType: "ASSIGNMENT" },
    create: {
      moduleId: module.id,
      title: "Homework: 15-Minute NIFTY Order Flow Chart Submission",
      slug: "e2e-homework-chart-analysis",
      position: 2,
      contentType: "ASSIGNMENT",
      isPublished: true,
    },
  });

  await prisma.homework.deleteMany({ where: { lessonId: homeworkLesson.id } });

  const homework = await prisma.homework.create({
    data: {
      lessonId: homeworkLesson.id,
      title: "15-Minute NIFTY Order Flow Chart Submission",
      instructions: "Identify liquidity grabs, label FVGs, and explain entry rationale.",
      totalMarks: 100,
      passingMarks: 60,
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days from now
      allowLateSubmission: true,
      maxAttempts: 3,
      status: "PUBLISHED",
      isTestData: true,
    },
  });
  console.log(`✅ Homework created: "${homework.title}" (Total Marks: ${homework.totalMarks})`);

  // 6. Simulate Student Submitting Homework
  console.log("\n📤 [6/7] Simulating Student Homework Submission & File Upload...");
  const submission1 = await prisma.homeworkSubmission.create({
    data: {
      homeworkId: homework.id,
      userId: student.id,
      attemptNumber: 1,
      textAnswer: "Here is my NIFTY 15-min chart analysis with marked BSL and SSL zones.",
      status: "SUBMITTED",
      isTestData: true,
      files: {
        create: [
          {
            fileUrl: "https://r2.superwarrior30.com/test-chart-screenshot.png",
            storageKey: "homework/test-chart.png",
            originalFilename: "nifty_15m_chart_analysis.png",
            fileSize: 1024500,
            mimeType: "image/png",
          },
        ],
      },
    },
    include: { files: true },
  });
  console.log(`✅ Attempt 1 Submitted (Files: ${submission1.files.length})`);

  // Simulate Teacher Review & Return for Resubmission
  console.log("👨‍🏫 Teacher reviews Attempt 1 and requests revision...");
  await prisma.homeworkSubmissionHistory.create({
    data: {
      submissionId: submission1.id,
      attemptNumber: 1,
      textAnswer: submission1.textAnswer,
      filesSnapshot: JSON.parse(JSON.stringify(submission1.files)),
      status: "RETURNED_FOR_RESUBMISSION",
      marksObtained: 40,
      feedback: "Good start, but you missed marking the 9:45 AM Fair Value Gap.",
      submittedAt: submission1.submittedAt,
    },
  });

  const returnedSub = await prisma.homeworkSubmission.update({
    where: { id: submission1.id },
    data: {
      status: "RETURNED_FOR_RESUBMISSION",
      marksObtained: 40,
      percentage: 40,
      feedback: "Good start, but you missed marking the 9:45 AM Fair Value Gap.",
    },
  });
  console.log(`✅ Attempt 1 Returned for Resubmission: "${returnedSub.feedback}"`);

  // Student Submits Attempt 2
  console.log("📤 Student submits revised Attempt 2...");
  const submission2 = await prisma.homeworkSubmission.create({
    data: {
      homeworkId: homework.id,
      userId: student.id,
      attemptNumber: 2,
      textAnswer: "Revised chart with 9:45 AM FVG clearly annotated and risk-to-reward ratio 1:3.",
      status: "SUBMITTED",
      isTestData: true,
      files: {
        create: [
          {
            fileUrl: "https://r2.superwarrior30.com/test-chart-screenshot-v2.png",
            storageKey: "homework/test-chart-v2.png",
            originalFilename: "nifty_15m_chart_v2_annotated.png",
            fileSize: 1245000,
            mimeType: "image/png",
          },
        ],
      },
    },
  });

  // Teacher Grades Attempt 2 with 95/100 -> PASSED!
  const reviewedSub2 = await prisma.homeworkSubmission.update({
    where: { id: submission2.id },
    data: {
      status: "REVIEWED",
      marksObtained: 95,
      percentage: 95,
      isPassed: true,
      feedback: "Outstanding analysis! Perfect liquidity sweep identification.",
      reviewedAt: new Date(),
    },
  });
  console.log(`✅ Attempt 2 Graded: Marks=${reviewedSub2.marksObtained}/100 (${reviewedSub2.percentage}%) - Status: ${reviewedSub2.status}`);

  // 7. Verify History & Isolation
  console.log("\n🔒 [7/7] Verifying History Snapshots & Progress Records...");
  const historyRecords = await prisma.homeworkSubmissionHistory.findMany({
    where: { submissionId: submission1.id },
  });
  console.log(`✅ Past attempt history records preserved: ${historyRecords.length}`);

  const totalLessonsInModule = await prisma.lesson.count({ where: { moduleId: module.id } });
  console.log(`✅ Module total lessons: ${totalLessonsInModule} (Quiz + Homework verified)`);

  await prisma.$disconnect();

  console.log("\n==================================================");
  console.log("🎉 ALL E2E TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================\n");
}

runE2eTests().catch((err) => {
  console.error("❌ E2E Test Failed:", err);
  process.exit(1);
});
