import "dotenv/config";
import { getTestPrismaClient } from "../src/lib/prisma";

async function verifyTestSchema() {
  console.log("🔍 Verifying Prisma Client queries on TEST database...");
  const prisma = getTestPrismaClient();

  const [quizzes, questions, options, attempts, answers, homeworks, submissions, files, history] = await Promise.all([
    prisma.quiz.count(),
    prisma.quizQuestion.count(),
    prisma.quizOption.count(),
    prisma.quizAttempt.count(),
    prisma.quizAnswer.count(),
    prisma.homework.count(),
    prisma.homeworkSubmission.count(),
    prisma.homeworkSubmissionFile.count(),
    prisma.homeworkSubmissionHistory.count(),
  ]);

  console.log("✅ All Quiz and Homework tables successfully verified on TEST DB!");
  console.log({
    quizzes,
    questions,
    options,
    attempts,
    answers,
    homeworks,
    submissions,
    files,
    history,
  });

  await prisma.$disconnect();
}

verifyTestSchema().catch((err) => {
  console.error("❌ Schema verification failed:", err);
  process.exit(1);
});
