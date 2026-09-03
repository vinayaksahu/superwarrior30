import "dotenv/config";
import pg from "pg";
import { getTestDatabaseUrl, getProductionDatabaseUrl } from "../src/lib/prisma";

const { Client } = pg;

export const SQL_MIGRATION = `
-- 1. Add Enum Values to LessonContentType
DO $$ BEGIN
  ALTER TYPE "LessonContentType" ADD VALUE IF NOT EXISTS 'QUIZ';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "LessonContentType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create Enums for Quiz & Homework
DO $$ BEGIN
  CREATE TYPE "QuizQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuizShowAnswers" AS ENUM ('IMMEDIATELY', 'AFTER_REVIEW', 'NEVER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'PASSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "HomeworkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "HomeworkSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'RETURNED_FOR_RESUBMISSION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Create Table: quizzes
CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "passingPercentage" INTEGER NOT NULL DEFAULT 70,
  "timeLimitMinutes" INTEGER,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "showAnswers" "QuizShowAnswers" NOT NULL DEFAULT 'IMMEDIATELY',
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
  "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quizzes_lessonId_key" ON "quizzes"("lessonId");
CREATE INDEX IF NOT EXISTS "quizzes_lessonId_idx" ON "quizzes"("lessonId");
CREATE INDEX IF NOT EXISTS "quizzes_isTestData_lessonId_idx" ON "quizzes"("isTestData", "lessonId");

DO $$ BEGIN
  ALTER TABLE "quizzes" 
  ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Create Table: quiz_questions
CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "questionType" "QuizQuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
  "imageUrl" TEXT,
  "marks" INTEGER NOT NULL DEFAULT 1,
  "explanation" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "quiz_questions_quizId_sortOrder_idx" ON "quiz_questions"("quizId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "quiz_questions" 
  ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Create Table: quiz_options
CREATE TABLE IF NOT EXISTS "quiz_options" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionText" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "quiz_options_questionId_sortOrder_idx" ON "quiz_options"("questionId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "quiz_options" 
  ADD CONSTRAINT "quiz_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6. Create Table: quiz_attempts
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "score" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  "totalMarks" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "timeTakenSeconds" INTEGER,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quiz_attempts_quizId_userId_attemptNumber_key" ON "quiz_attempts"("quizId", "userId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "quiz_attempts_quizId_userId_idx" ON "quiz_attempts"("quizId", "userId");
CREATE INDEX IF NOT EXISTS "quiz_attempts_userId_status_idx" ON "quiz_attempts"("userId", "status");
CREATE INDEX IF NOT EXISTS "quiz_attempts_isTestData_quizId_idx" ON "quiz_attempts"("isTestData", "quizId");

DO $$ BEGIN
  ALTER TABLE "quiz_attempts" 
  ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "quiz_attempts" 
  ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Create Table: quiz_answers
CREATE TABLE IF NOT EXISTS "quiz_answers" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionIds" JSONB,
  "textAnswer" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "marksAwarded" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "quiz_answers_attemptId_idx" ON "quiz_answers"("attemptId");
CREATE INDEX IF NOT EXISTS "quiz_answers_questionId_idx" ON "quiz_answers"("questionId");

DO $$ BEGIN
  ALTER TABLE "quiz_answers" 
  ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "quiz_answers" 
  ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. Create Table: homework_assignments
CREATE TABLE IF NOT EXISTS "homework_assignments" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT NOT NULL,
  "totalMarks" DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  "passingMarks" DECIMAL(6,2),
  "deadline" TIMESTAMP(3),
  "allowLateSubmission" BOOLEAN NOT NULL DEFAULT true,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "status" "HomeworkStatus" NOT NULL DEFAULT 'PUBLISHED',
  "attachedMediaIds" JSONB,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homework_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "homework_assignments_lessonId_key" ON "homework_assignments"("lessonId");
CREATE INDEX IF NOT EXISTS "homework_assignments_lessonId_idx" ON "homework_assignments"("lessonId");
CREATE INDEX IF NOT EXISTS "homework_assignments_isTestData_lessonId_idx" ON "homework_assignments"("isTestData", "lessonId");

DO $$ BEGIN
  ALTER TABLE "homework_assignments" 
  ADD CONSTRAINT "homework_assignments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 9. Create Table: homework_submissions
CREATE TABLE IF NOT EXISTS "homework_submissions" (
  "id" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "textAnswer" TEXT,
  "status" "HomeworkSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "marksObtained" DECIMAL(6,2),
  "percentage" DECIMAL(5,2),
  "isPassed" BOOLEAN,
  "feedback" TEXT,
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isLate" BOOLEAN NOT NULL DEFAULT false,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homework_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "homework_submissions_homeworkId_userId_attemptNumber_key" ON "homework_submissions"("homeworkId", "userId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "homework_submissions_homeworkId_userId_idx" ON "homework_submissions"("homeworkId", "userId");
CREATE INDEX IF NOT EXISTS "homework_submissions_userId_status_idx" ON "homework_submissions"("userId", "status");
CREATE INDEX IF NOT EXISTS "homework_submissions_status_submittedAt_idx" ON "homework_submissions"("status", "submittedAt" DESC);
CREATE INDEX IF NOT EXISTS "homework_submissions_isTestData_homeworkId_idx" ON "homework_submissions"("isTestData", "homeworkId");

DO $$ BEGIN
  ALTER TABLE "homework_submissions" 
  ADD CONSTRAINT "homework_submissions_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homework_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "homework_submissions" 
  ADD CONSTRAINT "homework_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "homework_submissions" 
  ADD CONSTRAINT "homework_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 10. Create Table: homework_submission_files
CREATE TABLE IF NOT EXISTS "homework_submission_files" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "storageKey" TEXT,
  "originalFilename" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homework_submission_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "homework_submission_files_submissionId_idx" ON "homework_submission_files"("submissionId");

DO $$ BEGIN
  ALTER TABLE "homework_submission_files" 
  ADD CONSTRAINT "homework_submission_files_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "homework_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 11. Create Table: homework_submission_history
CREATE TABLE IF NOT EXISTS "homework_submission_history" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "textAnswer" TEXT,
  "filesSnapshot" JSONB,
  "status" "HomeworkSubmissionStatus" NOT NULL,
  "marksObtained" DECIMAL(6,2),
  "feedback" TEXT,
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "isLate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homework_submission_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "homework_submission_history_submissionId_attemptNumber_idx" ON "homework_submission_history"("submissionId", "attemptNumber");

DO $$ BEGIN
  ALTER TABLE "homework_submission_history" 
  ADD CONSTRAINT "homework_submission_history_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "homework_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
`;

export async function executeSqlMigration(target: "TEST" | "PRODUCTION") {
  const rawUrl = target === "TEST" ? getTestDatabaseUrl() : getProductionDatabaseUrl();
  if (!rawUrl) throw new Error(`Database URL for ${target} is not configured!`);

  console.log(`\n📡 Connecting to ${target} database (${rawUrl.replace(/:[^:@]+@/, ":***@")})...`);
  const client = new Client({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log(`✅ Connected to ${target} database. Executing SQL migration...`);

  await client.query(SQL_MIGRATION);
  console.log(`✨ DDL SQL Migration executed successfully on ${target} database.`);

  await client.end();
}

async function main() {
  const target = (process.argv[2] || "TEST").toUpperCase() as "TEST" | "PRODUCTION";
  await executeSqlMigration(target);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}
