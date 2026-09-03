import "dotenv/config";
import pg from "pg";
import { getProductionDatabaseUrl, getProductionPrismaClient } from "../src/lib/prisma";
import { SQL_MIGRATION } from "./apply-lms-sql-migration";

const { Client } = pg;

async function runProductionMigration() {
  console.log("==================================================");
  console.log("🚀 STEP 2: APPLYING MIGRATION TO LIVE PRODUCTION DB");
  console.log("==================================================");

  const prodUrl = getProductionDatabaseUrl();
  console.log("Target Database URL:", prodUrl.replace(/:[^:@]+@/, ":***@"));

  // Strict Verification: Target must be productiondb
  const parsed = new URL(prodUrl);
  if (parsed.pathname !== "/productiondb") {
    throw new Error(`SAFETY ABORT: Target database is '${parsed.pathname}' instead of '/productiondb'! Operation cancelled.`);
  }

  const client = new Client({
    connectionString: prodUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Connected to LIVE PRODUCTION DB. Checking pre-migration counts...");

  const preCoursesRes = await client.query('SELECT COUNT(*) FROM "courses" WHERE "deletedAt" IS NULL');
  const preUsersRes = await client.query('SELECT COUNT(*) FROM "users"');
  const preOrdersRes = await client.query('SELECT COUNT(*) FROM "orders"');
  const preLessonsRes = await client.query('SELECT COUNT(*) FROM "lessons"');

  const preCourses = Number(preCoursesRes.rows[0].count);
  const preUsers = Number(preUsersRes.rows[0].count);
  const preOrders = Number(preOrdersRes.rows[0].count);
  const preLessons = Number(preLessonsRes.rows[0].count);

  console.log(`📊 Pre-Migration Production Data Snapshot:`);
  console.log(`   - Courses: ${preCourses}`);
  console.log(`   - Lessons: ${preLessons}`);
  console.log(`   - Users: ${preUsers}`);
  console.log(`   - Orders: ${preOrders}`);

  console.log("\n⚡ Executing Additive DDL SQL Migration on Production DB...");
  await client.query(SQL_MIGRATION);
  console.log("✨ Migration executed successfully!");

  console.log("\n🔍 Verifying Production Schema & Data Integrity...");
  const postCoursesRes = await client.query('SELECT COUNT(*) FROM "courses" WHERE "deletedAt" IS NULL');
  const postUsersRes = await client.query('SELECT COUNT(*) FROM "users"');
  const postOrdersRes = await client.query('SELECT COUNT(*) FROM "orders"');
  const postLessonsRes = await client.query('SELECT COUNT(*) FROM "lessons"');

  const postCourses = Number(postCoursesRes.rows[0].count);
  const postUsers = Number(postUsersRes.rows[0].count);
  const postOrders = Number(postOrdersRes.rows[0].count);
  const postLessons = Number(postLessonsRes.rows[0].count);

  if (postCourses !== preCourses || postUsers !== preUsers || postOrders !== preOrders || postLessons !== preLessons) {
    throw new Error("DATA LOSS DETECTED! Pre and Post counts do not match!");
  }

  // Check new tables exist in Production
  const quizzesRes = await client.query('SELECT COUNT(*) FROM "quizzes"');
  const homeworksRes = await client.query('SELECT COUNT(*) FROM "homework_assignments"');
  const submissionsRes = await client.query('SELECT COUNT(*) FROM "homework_submissions"');

  console.log("✅ [PRODUCTION DB VERIFIED] All new tables exist and zero data loss occurred!");
  console.log(`   - Courses Intact: ${postCourses}`);
  console.log(`   - Lessons Intact: ${postLessons}`);
  console.log(`   - Users Intact: ${postUsers}`);
  console.log(`   - Orders Intact: ${postOrders}`);
  console.log(`   - Quizzes Table Accessible: YES (${quizzesRes.rows[0].count} rows)`);
  console.log(`   - Homework Table Accessible: YES (${homeworksRes.rows[0].count} rows)`);
  console.log(`   - Submissions Table Accessible: YES (${submissionsRes.rows[0].count} rows)`);

  await client.end();
  console.log("\n🎉 LIVE PRODUCTION DATABASE MIGRATION & INTEGRITY VERIFIED 100%!\n");
}

runProductionMigration().catch((err) => {
  console.error("❌ Production Migration failed:", err);
  process.exit(1);
});
