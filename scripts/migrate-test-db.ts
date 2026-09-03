import "dotenv/config";
import { execSync } from "node:child_process";
import { getTestDatabaseUrl, isTestDatabaseConfigured, getTestPrismaClient } from "../src/lib/prisma";

async function runTestMigration() {
  console.log("==================================================");
  console.log("🛠️ STEP 1: APPLYING MIGRATION TO TEST DATABASE");
  console.log("==================================================");

  if (!isTestDatabaseConfigured()) {
    throw new Error("TEST_DATABASE_URL is not configured!");
  }

  const testUrl = getTestDatabaseUrl();
  console.log("Target Test Database URL:", testUrl.replace(/:[^:@]+@/, ":***@"));

  // Verify that target URL is strictly neondb
  if (!testUrl.includes("/neondb")) {
    throw new Error("SAFETY CHECK FAILED: Test Database URL must point to neondb!");
  }

  // Push schema to Test DB
  console.log("\n🚀 Running prisma db push on TEST database...");
  execSync(`npx prisma db push --accept-data-loss`, {
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      DIRECT_URL: testUrl,
    },
    stdio: "inherit",
  });

  // Verify tables in Test Database
  console.log("\n🔍 Verifying schema on TEST database...");
  const testClient = getTestPrismaClient();

  const quizzes = await testClient.quiz.findMany({ take: 5 });
  const questions = await testClient.quizQuestion.findMany({ take: 5 });
  const options = await testClient.quizOption.findMany({ take: 5 });
  const attempts = await testClient.quizAttempt.findMany({ take: 5 });
  const homeworks = await testClient.homework.findMany({ take: 5 });
  const submissions = await testClient.homeworkSubmission.findMany({ take: 5 });
  const history = await testClient.homeworkSubmissionHistory.findMany({ take: 5 });

  console.log("✅ [TEST DB VERIFIED] Successfully queried new tables:");
  console.log("  - quizzes count:", quizzes.length);
  console.log("  - quiz_questions count:", questions.length);
  console.log("  - quiz_options count:", options.length);
  console.log("  - quiz_attempts count:", attempts.length);
  console.log("  - homework_assignments count:", homeworks.length);
  console.log("  - homework_submissions count:", submissions.length);
  console.log("  - homework_submission_history count:", history.length);

  await testClient.$disconnect();
  console.log("\n🎉 TEST DATABASE MIGRATION APPLIED & VERIFIED SUCCESSFULLY!\n");
}

runTestMigration().catch((err) => {
  console.error("❌ Test DB Migration failed:", err);
  process.exit(1);
});
