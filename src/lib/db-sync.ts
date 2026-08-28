import { prisma } from "@/lib/prisma";

let isSynced = false;

export async function ensureDatabaseSchemaSync() {
  if (isSynced) return;

  const alterStatements = [
    // orders columns
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualPaymentRef" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualPaymentProof" JSONB;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "metadata" JSONB;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2) DEFAULT 0.00;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(12,2) DEFAULT 0.00;`,

    // courses columns
    `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);`,
    `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;`,
    `CREATE INDEX IF NOT EXISTS "courses_deletedAt_idx" ON "courses"("deletedAt");`,

    // course_enrollments columns
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER DEFAULT 0;`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "progressPercentage" DECIMAL(5,2) DEFAULT 0.00;`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP(3);`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "certificateIssued" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "certificateId" TEXT;`,

    // lesson_progress columns
    `ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "watchTimeSeconds" INTEGER DEFAULT 0;`,
    `ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "lastPositionSeconds" INTEGER DEFAULT 0;`,
    `ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);`,
    `ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,

    // order_items columns
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "courseId" TEXT;`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "itemTitle" TEXT;`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(12,2);`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "totalPrice" DECIMAL(12,2);`,

    // referral_commission_records columns
    `ALTER TABLE "referral_commission_records" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3);`,
    `ALTER TABLE "referral_commission_records" ADD COLUMN IF NOT EXISTS "clearedAt" TIMESTAMP(3);`,
    `ALTER TABLE "referral_commission_records" ADD COLUMN IF NOT EXISTS "clearedById" TEXT;`,
    `ALTER TABLE "referral_commission_records" ADD COLUMN IF NOT EXISTS "clearedReason" TEXT;`,
    `CREATE INDEX IF NOT EXISTS "referral_commission_records_status_availableAt_idx" ON "referral_commission_records"("status", "availableAt");`,

    // users columns
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'STUDENT';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kycStatus" TEXT DEFAULT 'NOT_SUBMITTED';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;`,
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Ignore if already exists
    }
  }

  // Enums & Tables
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PaymentMethodType" AS ENUM ('UPI', 'BANK', 'CRYPTO');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "lesson_progress" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "lesson_progress" ALTER COLUMN "status" TYPE "ProgressStatus" USING ("status"::text::"ProgressStatus");
        ALTER TABLE "lesson_progress" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED'::"ProgressStatus";
      EXCEPTION WHEN others THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_payment_methods" (
        "id" TEXT PRIMARY KEY,
        "type" "PaymentMethodType" NOT NULL,
        "title" TEXT NOT NULL,
        "details" JSONB NOT NULL,
        "instructions" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "lesson_progress" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "lessonId" TEXT NOT NULL,
        "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
        "watchTimeSeconds" INTEGER NOT NULL DEFAULT 0,
        "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
        "completedAt" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "lesson_progress_userId_lessonId_key" UNIQUE ("userId", "lessonId")
      );
    `);
  } catch {
    // ignore
  }

  // user_devices table for Session & Device Limit Security
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_devices" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "deviceTokenHash" TEXT NOT NULL,
        "deviceName" TEXT,
        "browser" TEXT,
        "operatingSystem" TEXT,
        "userAgent" TEXT,
        "lastIpAddress" TEXT,
        "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "revokedAt" TIMESTAMP(3),
        "revokedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "user_devices_userId_deviceTokenHash_key" UNIQUE ("userId", "deviceTokenHash")
      );
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "CommissionStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
    `);
  } catch {
    // ignore
  }

  try {
    // Backfill holding period for any existing pending commissions
    await prisma.$executeRawUnsafe(`
      UPDATE "referral_commission_records"
      SET "availableAt" = "createdAt" + INTERVAL '7 days'
      WHERE "availableAt" IS NULL AND "status" = 'PENDING';
    `);
  } catch {
    // ignore
  }

  try {
    // Backfill cleared timestamps for any existing available commissions
    await prisma.$executeRawUnsafe(`
      UPDATE "referral_commission_records"
      SET "availableAt" = "createdAt", "clearedAt" = "updatedAt"
      WHERE "availableAt" IS NULL AND "status" = 'AVAILABLE';
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "user_devices_userId_idx" ON "user_devices"("userId");
      CREATE INDEX IF NOT EXISTS "user_devices_deviceTokenHash_idx" ON "user_devices"("deviceTokenHash");
      CREATE INDEX IF NOT EXISTS "user_devices_userId_isActive_idx" ON "user_devices"("userId", "isActive");
    `);
  } catch {
    // ignore
  }

  isSynced = true;
}
