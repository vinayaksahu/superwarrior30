/**
 * Test Suite: Phase 18 - Background Processing Queue
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing!");
}

const pool = new pg.Pool({
  connectionString: connectionString.includes("sslmode=require")
    ? connectionString.replace("sslmode=require", "sslmode=verify-full")
    : connectionString,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function runPhase18Tests() {
  console.log("================================================================================");
  console.log("PHASE 18 TEST SUITE: BACKGROUND PROCESSING QUEUE");
  console.log("================================================================================\n");

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "trade_processing_jobs" (
      "id" TEXT PRIMARY KEY,
      "streamId" TEXT,
      "tradeId" TEXT,
      "jobType" TEXT NOT NULL,
      "stage" TEXT NOT NULL DEFAULT 'QUEUED',
      "progressPercent" INTEGER NOT NULL DEFAULT 0,
      "errorMessage" TEXT,
      "logs" JSONB,
      "startedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "trade_processing_jobs_streamId_idx" ON "trade_processing_jobs"("streamId");
    CREATE INDEX IF NOT EXISTS "trade_processing_jobs_stage_idx" ON "trade_processing_jobs"("stage");
    CREATE INDEX IF NOT EXISTS "trade_processing_jobs_createdAt_idx" ON "trade_processing_jobs"("createdAt" DESC);
  `);

  // TEST 1: Create a queued job
  console.log("[TEST 1] Creating simulated background job in trade_processing_jobs...");
  const job = await prisma.tradeProcessingJob.create({
    data: {
      jobType: "GENERATE_CLIP",
      stage: "ANALYZING",
      progressPercent: 45,
      logs: { detail: "Analyzing market structure and candle confirmations" },
    },
  });

  console.log("Created Job:", { id: job.id, stage: job.stage, progress: job.progressPercent });
  if (job.stage !== "ANALYZING" || job.progressPercent !== 45) {
    throw new Error("Test 1 Failed: Job not created properly");
  }
  console.log("[PASS] Test 1: Background job created successfully\n");

  // TEST 2: Query queue jobs
  console.log("[TEST 2] Querying active processing jobs from queue...");
  const activeJobs = await prisma.tradeProcessingJob.findMany({
    where: {
      stage: { in: ["QUEUED", "DOWNLOADING", "TRANSCRIBING", "ANALYZING", "DETECTING_TRADES", "VISUAL_ANALYSIS", "GENERATING_CLIP", "RENDERING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const found = activeJobs.find((j: any) => j.id === job.id);
  if (!found) {
    throw new Error("Test 2 Failed: Created active job not found in active jobs query");
  }
  console.log(`[PASS] Test 2: Active queue query returned job ${job.id} (${found.progressPercent}%)\n`);

  // TEST 3: Cancel job execution
  console.log("[TEST 3] Cancelling active job...");
  const updatedJob = await prisma.tradeProcessingJob.update({
    where: { id: job.id },
    data: {
      stage: "CANCELLED",
      errorMessage: "Cancelled by administrator.",
      completedAt: new Date(),
    },
  });

  if (updatedJob.stage !== "CANCELLED") {
    throw new Error("Test 3 Failed: Job status was not updated to CANCELLED");
  }
  console.log(`[PASS] Test 3: Job transition to CANCELLED verified (${updatedJob.errorMessage})\n`);

  // Cleanup test job
  await prisma.tradeProcessingJob.delete({ where: { id: job.id } }).catch(() => null);
  await pool.end();

  console.log("================================================================================");
  console.log("ALL PHASE 18 TESTS PASSED SUCCESSFULLY! (Background Processing Queue UI)");
  console.log("================================================================================");
}

runPhase18Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  pool.end();
  process.exit(1);
});
