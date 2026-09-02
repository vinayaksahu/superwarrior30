import { prisma } from "@/lib/prisma";
import { resolveCurrentEnvironment } from "@/lib/env-context";

const syncedEnvironments = new Set<string>();

export async function ensureDatabaseSchemaSync(force = false) {
  const currentEnv = await resolveCurrentEnvironment();
  if (syncedEnvironments.has(currentEnv) && !force) return;

  // 1. Ensure prerequisite ENUM types and base tables exist first before altering tables
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "TestimonialStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "PaymentMethodType" AS ENUM ('UPI', 'BANK', 'CRYPTO', 'GATEWAY');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "testimonials" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT,
        "studentName" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "photoUrl" TEXT,
        "videoUrl" TEXT,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
        "isApproved" BOOLEAN NOT NULL DEFAULT false,
        "isVisible" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "tradingPlatform" TEXT,
        "accountType" TEXT,
        "tradingResult" TEXT,
        "experienceDuration" TEXT,
        "consentGiven" BOOLEAN NOT NULL DEFAULT false,
        "rejectionReason" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "reviewedById" TEXT,
        "approvedAt" TIMESTAMP(3),
        "courseId" TEXT,
        "isTestData" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "testimonial_media" (
        "id" TEXT PRIMARY KEY,
        "testimonialId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'SCREENSHOT',
        "caption" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isTestData" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {
    // ignore
  }

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
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gatewayOrderId" TEXT;`,
    `CREATE INDEX IF NOT EXISTS "orders_gatewayOrderId_idx" ON "orders"("gatewayOrderId");`,

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

    // referral_levels columns
    `ALTER TABLE "referral_levels" ADD COLUMN IF NOT EXISTS "requiresDirectReferralQualification" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "referral_levels" ADD COLUMN IF NOT EXISTS "directReferralsRequired" INTEGER DEFAULT 0;`,

    // users columns
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'STUDENT';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminRole" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customPermissions" JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kycStatus" TEXT DEFAULT 'NOT_SUBMITTED';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;`,

    // isTestData columns across all business models
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "referral_commission_records" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,

    // testimonials columns
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "status" "TestimonialStatus" DEFAULT 'PENDING';`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "showOnHome" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "showOnLanding" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "tradingPlatform" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "accountType" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "tradingResult" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "experienceDuration" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "consentGiven" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;`,
    `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);`,
    `ALTER TABLE "testimonial_media" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "broker_offer_claims" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "referral_relationships" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "referral_closures" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "system_payment_methods" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "funnel_events" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN DEFAULT true;`,

    // Ensure ALL critical business data is accessible in LIVE mode
    // Orders & Order Items — real purchases must always be visible
    `UPDATE "orders" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "orders" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    `UPDATE "order_items" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "order_items" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Courses — published courses must be visible
    `UPDATE "courses" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "courses" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Course Enrollments — purchased enrollments must be visible
    `UPDATE "course_enrollments" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "course_enrollments" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Coupons — promo coupons must be visible
    `UPDATE "coupons" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "coupons" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Users — all real users must be visible
    `UPDATE "users" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "users" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Wallets — user wallets must be visible
    `UPDATE "wallets" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "wallets" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Lesson Progress
    `UPDATE "lesson_progress" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "lesson_progress" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Wallet Transactions
    `UPDATE "wallet_transactions" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "wallet_transactions" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Referral relationships & closures
    `UPDATE "referral_relationships" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "referral_relationships" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    `UPDATE "referral_closures" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "referral_closures" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Referral commissions
    `UPDATE "referral_commission_records" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "referral_commission_records" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Broker offer claims
    `UPDATE "broker_offer_claims" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "broker_offer_claims" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Testimonials
    `UPDATE "testimonials" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "testimonials" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    `UPDATE "testimonial_media" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "testimonial_media" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Live Sessions
    `UPDATE "live_sessions" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "live_sessions" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Support Inquiries
    `UPDATE "support_inquiries" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "support_inquiries" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Withdrawals
    `UPDATE "withdrawals" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "withdrawals" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Leads
    `UPDATE "leads" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "leads" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Audit Logs
    `UPDATE "audit_logs" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "audit_logs" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // System Payment Methods
    `UPDATE "system_payment_methods" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "system_payment_methods" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Funnel Events
    `UPDATE "funnel_events" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "funnel_events" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    // Media Assets & Lesson Media
    `UPDATE "media_assets" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "media_assets" ALTER COLUMN "isTestData" SET DEFAULT false;`,
    `UPDATE "lesson_media" SET "isTestData" = false WHERE "isTestData" IS NULL OR "isTestData" = true;`,
    `ALTER TABLE "lesson_media" ALTER COLUMN "isTestData" SET DEFAULT false;`,

    // targeted super admin email update
    `UPDATE "users" SET "email" = 'vinayaksahu3@gmail.com' WHERE "email" = 'admin@superwarrior30.com' AND "role" = 'SUPER_ADMIN';`,
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
        CREATE TYPE "PaymentMethodType" AS ENUM ('UPI', 'BANK', 'CRYPTO', 'GATEWAY');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'GATEWAY';
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

  // LeadStage enum and Funnel Tables
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "LeadStage" AS ENUM ('NEW_LEAD', 'QUIZ_COMPLETED', 'COURSE_VIEWED', 'CHECKOUT_STARTED', 'PURCHASED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "whatsapp" TEXT,
        "tradingExperience" TEXT,
        "targetMarket" TEXT,
        "mainChallenge" TEXT,
        "lossRange" TEXT,
        "learningGoals" TEXT,
        "readyForTraining" TEXT,
        "quizAnswers" JSONB,
        "stage" "LeadStage" NOT NULL DEFAULT 'NEW_LEAD',
        "courseId" TEXT,
        "userId" TEXT,
        "source" TEXT,
        "utmSource" TEXT,
        "utmMedium" TEXT,
        "utmCampaign" TEXT,
        "utmContent" TEXT,
        "landingPageAt" TIMESTAMP(3),
        "quizStartedAt" TIMESTAMP(3),
        "quizCompletedAt" TIMESTAMP(3),
        "courseViewedAt" TIMESTAMP(3),
        "checkoutStartedAt" TIMESTAMP(3),
        "purchaseCompletedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads"("email");
      CREATE INDEX IF NOT EXISTS "leads_phone_idx" ON "leads"("phone");
      CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads"("stage");
      CREATE INDEX IF NOT EXISTS "leads_createdAt_idx" ON "leads"("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "leads_utmSource_utmCampaign_idx" ON "leads"("utmSource", "utmCampaign");
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "TestimonialStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "testimonials" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "studentName" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "photoUrl" TEXT,
        "videoUrl" TEXT,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
        "isApproved" BOOLEAN NOT NULL DEFAULT false,
        "isVisible" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "tradingPlatform" TEXT,
        "accountType" TEXT,
        "tradingResult" TEXT,
        "experienceDuration" TEXT,
        "consentGiven" BOOLEAN NOT NULL DEFAULT false,
        "rejectionReason" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "reviewedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "approvedAt" TIMESTAMP(3),
        "courseId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "testimonials_status_isVisible_idx" ON "testimonials"("status", "isVisible");
      CREATE INDEX IF NOT EXISTS "testimonials_isApproved_isVisible_idx" ON "testimonials"("isApproved", "isVisible");
      CREATE INDEX IF NOT EXISTS "testimonials_userId_idx" ON "testimonials"("userId");
      CREATE INDEX IF NOT EXISTS "testimonials_isFeatured_createdAt_idx" ON "testimonials"("isFeatured", "createdAt" DESC);
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "testimonial_media" (
        "id" TEXT PRIMARY KEY,
        "testimonialId" TEXT NOT NULL REFERENCES "testimonials"("id") ON DELETE CASCADE,
        "url" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'SCREENSHOT',
        "caption" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isTestData" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "testimonial_media_testimonialId_idx" ON "testimonial_media"("testimonialId");
      CREATE INDEX IF NOT EXISTS "testimonial_media_isTestData_testimonialId_idx" ON "testimonial_media"("isTestData", "testimonialId");
    `);
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "funnel_events" (
        "id" TEXT PRIMARY KEY,
        "leadId" TEXT,
        "sessionId" TEXT,
        "eventType" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "funnel_events_eventType_createdAt_idx" ON "funnel_events"("eventType", "createdAt");
      CREATE INDEX IF NOT EXISTS "funnel_events_leadId_idx" ON "funnel_events"("leadId");
      CREATE INDEX IF NOT EXISTS "funnel_events_sessionId_idx" ON "funnel_events"("sessionId");
    `);
  } catch {
    // ignore
  }

  // Backfill: populate gatewayOrderId from paymentId for existing Razorpay orders
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "orders" SET "gatewayOrderId" = "paymentId"
      WHERE "gatewayOrderId" IS NULL
        AND "paymentProvider" IN ('RAZORPAY', 'MOCK')
        AND "paymentId" IS NOT NULL;
    `);
  } catch {
    // ignore
  }

  // Live Sessions & Video Meetings Tables
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "LiveSessionProvider" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'EMBEDDED_ROOM', 'BUNNY_LIVE', 'CUSTOM');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "LiveSessionStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "live_sessions" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
        "provider" "LiveSessionProvider" NOT NULL DEFAULT 'ZOOM',
        "meetingUrl" TEXT,
        "meetingId" TEXT,
        "passcode" TEXT,
        "roomName" TEXT,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "durationMinutes" INTEGER NOT NULL DEFAULT 60,
        "status" "LiveSessionStatus" NOT NULL DEFAULT 'UPCOMING',
        "recordingUrl" TEXT,
        "bunnyVideoId" TEXT,
        "isPublished" BOOLEAN NOT NULL DEFAULT true,
        "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "live_sessions_status_scheduledAt_idx" ON "live_sessions"("status", "scheduledAt");
      CREATE INDEX IF NOT EXISTS "live_sessions_courseId_idx" ON "live_sessions"("courseId");
      CREATE INDEX IF NOT EXISTS "live_sessions_isPublished_idx" ON "live_sessions"("isPublished");

      CREATE TABLE IF NOT EXISTS "live_session_attendees" (
        "id" TEXT PRIMARY KEY,
        "sessionId" TEXT NOT NULL REFERENCES "live_sessions"("id") ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "live_session_attendees_sessionId_userId_key" UNIQUE ("sessionId", "userId")
      );

      CREATE INDEX IF NOT EXISTS "live_session_attendees_userId_idx" ON "live_session_attendees"("userId");
      CREATE INDEX IF NOT EXISTS "live_session_attendees_sessionId_idx" ON "live_session_attendees"("sessionId");
    `);
  } catch {
    // ignore
  }

  // Broker Offer & Cashback System
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BrokerOfferMode" AS ENUM ('CASHBACK', 'INSTANT_DISCOUNT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "BrokerVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "CashbackStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_VERIFICATION', 'AVAILABLE', 'CLAIM_REQUESTED', 'PAID', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "broker_offer_claims" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "orderId" TEXT NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
        "brokerName" TEXT NOT NULL DEFAULT 'Partner Broker',
        "brokerMemberId" TEXT NOT NULL,
        "proofUrl" TEXT,
        "mode" "BrokerOfferMode" NOT NULL DEFAULT 'CASHBACK',
        "verificationStatus" "BrokerVerificationStatus" NOT NULL DEFAULT 'PENDING',
        "verifiedAt" TIMESTAMP(3),
        "verifiedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "rejectionReason" TEXT,
        "coursePrice" DECIMAL(12,2) NOT NULL,
        "offerPercentage" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
        "calculatedAmount" DECIMAL(12,2) NOT NULL,
        "cashbackStatus" "CashbackStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "payoutDetails" JSONB,
        "claimedAt" TIMESTAMP(3),
        "paidAt" TIMESTAMP(3),
        "paidById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "payoutTxRef" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE "broker_offer_claims" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;

      CREATE INDEX IF NOT EXISTS "broker_offer_claims_userId_cashbackStatus_idx" ON "broker_offer_claims"("userId", "cashbackStatus");
      CREATE INDEX IF NOT EXISTS "broker_offer_claims_verificationStatus_idx" ON "broker_offer_claims"("verificationStatus");
      CREATE INDEX IF NOT EXISTS "broker_offer_claims_cashbackStatus_idx" ON "broker_offer_claims"("cashbackStatus");
      CREATE INDEX IF NOT EXISTS "broker_offer_claims_brokerMemberId_idx" ON "broker_offer_claims"("brokerMemberId");
      CREATE INDEX IF NOT EXISTS "broker_offer_claims_createdAt_idx" ON "broker_offer_claims"("createdAt" DESC);
    `);
  } catch {
    // ignore
  }

  // Media Provider Configurations (Bunny CDN, Cloudflare R2, etc.)
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "MediaProviderType" AS ENUM ('BUNNY', 'CLOUDFLARE_R2', 'AWS_S3', 'LOCAL');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "media_provider_configs" (
        "id" TEXT PRIMARY KEY,
        "provider" "MediaProviderType" NOT NULL DEFAULT 'BUNNY',
        "environment" TEXT NOT NULL DEFAULT 'production',
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,
        "isProductionReady" BOOLEAN NOT NULL DEFAULT false,
        "accountApiKeyEncrypted" TEXT,
        "accountEmail" TEXT,
        "storageZoneId" TEXT,
        "storageZoneName" TEXT,
        "storagePasswordEncrypted" TEXT,
        "storageHostname" TEXT DEFAULT 'storage.bunnycdn.com',
        "pullZoneId" TEXT,
        "pullZoneName" TEXT,
        "cdnHostname" TEXT,
        "streamLibraryId" TEXT,
        "streamLibraryName" TEXT,
        "streamApiKeyEncrypted" TEXT,
        "tokenSecurityKeyEncrypted" TEXT,
        "enableTokenAuth" BOOLEAN NOT NULL DEFAULT false,
        "lastTestedAt" TIMESTAMP(3),
        "testResults" JSONB,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "media_provider_configs_provider_environment_idx" ON "media_provider_configs"("provider", "environment");
      CREATE INDEX IF NOT EXISTS "media_provider_configs_isEnabled_isProductionReady_idx" ON "media_provider_configs"("isEnabled", "isProductionReady");
    `);
  } catch {
    // ignore
  }

  // Support Inquiries & Student Ticket System
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SupportInquiryStatus" AS ENUM ('OPEN', 'NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TYPE "SupportInquiryStatus" ADD VALUE IF NOT EXISTS 'OPEN';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TYPE "SupportInquiryStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_USER';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "support_inquiries" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'GENERAL',
        "source" TEXT NOT NULL DEFAULT 'PUBLIC_CONTACT',
        "status" "SupportInquiryStatus" NOT NULL DEFAULT 'OPEN',
        "orderNumber" TEXT,
        "adminNotes" TEXT,
        "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE "support_inquiries" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'PUBLIC_CONTACT';
      ALTER TABLE "support_inquiries" ADD COLUMN IF NOT EXISTS "userId" TEXT;

      CREATE INDEX IF NOT EXISTS "support_inquiries_email_idx" ON "support_inquiries"("email");
      CREATE INDEX IF NOT EXISTS "support_inquiries_status_idx" ON "support_inquiries"("status");
      CREATE INDEX IF NOT EXISTS "support_inquiries_category_idx" ON "support_inquiries"("category");
      CREATE INDEX IF NOT EXISTS "support_inquiries_source_idx" ON "support_inquiries"("source");
      CREATE INDEX IF NOT EXISTS "support_inquiries_userId_idx" ON "support_inquiries"("userId");
      CREATE INDEX IF NOT EXISTS "support_inquiries_createdAt_idx" ON "support_inquiries"("createdAt" DESC);

      CREATE TABLE IF NOT EXISTS "support_inquiry_messages" (
        "id" TEXT PRIMARY KEY,
        "inquiryId" TEXT NOT NULL REFERENCES "support_inquiries"("id") ON DELETE CASCADE,
        "senderId" TEXT,
        "senderRole" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "support_inquiry_messages_inquiryId_idx" ON "support_inquiry_messages"("inquiryId");
      CREATE INDEX IF NOT EXISTS "support_inquiry_messages_createdAt_idx" ON "support_inquiry_messages"("createdAt");

      CREATE TABLE IF NOT EXISTS "email_otps" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "users"("id") ON DELETE CASCADE,
        "email" TEXT NOT NULL,
        "purpose" TEXT NOT NULL DEFAULT 'LOGIN_VERIFICATION',
        "otpHash" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "maxAttempts" INTEGER NOT NULL DEFAULT 5,
        "usedAt" TIMESTAMP(3),
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "email_otps_email_purpose_idx" ON "email_otps"("email", "purpose");
      CREATE INDEX IF NOT EXISTS "email_otps_userId_purpose_idx" ON "email_otps"("userId", "purpose");
      CREATE INDEX IF NOT EXISTS "email_otps_expiresAt_idx" ON "email_otps"("expiresAt");
      CREATE INDEX IF NOT EXISTS "email_otps_createdAt_idx" ON "email_otps"("createdAt");

      -- Auto-heal any staff accounts mistakenly set to BLOCKED by device limit
      UPDATE "users" 
      SET "status" = 'ACTIVE' 
      WHERE "role" IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT') 
        AND "status" = 'BLOCKED';

      -- Ensure only root Super Admin has SUPER_ADMIN base role in database
      UPDATE "users"
      SET "role" = 'ADMIN'
      WHERE "email" NOT IN ('vinayaksahu3@gmail.com', 'admin@superwarrior30.com')
        AND "role" = 'SUPER_ADMIN';

      -- Ensure all coupons are active and unmasked for production
      UPDATE "coupons"
      SET "isTestData" = false
      WHERE "isTestData" IS NULL OR "isTestData" = true;
    `);
  } catch {
    // ignore
  }

  // Ensure default system coupon SUPER30 exists in database
  try {
    const existingSuper30 = await prisma.coupon.findUnique({
      where: { code: "SUPER30" },
    });
    if (!existingSuper30) {
      await prisma.coupon.create({
        data: {
          code: "SUPER30",
          discountType: "PERCENTAGE",
          discountValue: 30,
          minOrderAmount: 0,
          maxDiscountAmount: 240,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2035-12-31"),
          usageLimit: null,
          perUserLimit: 10,
          isActive: true,
          isTestData: false,
        },
      });
    } else if (existingSuper30.isTestData) {
      await prisma.coupon.update({
        where: { id: existingSuper30.id },
        data: { isTestData: false, isActive: true },
      });
    }
  } catch {
    // ignore
  }

  syncedEnvironments.add(currentEnv);
}
