import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // STRICT SECURITY: Endpoint is completely disabled in production environments
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  // Development/Test authorization gate
  const authHeader = req.headers.get("authorization") || req.headers.get("x-admin-init-secret");
  const initSecret = process.env.ADMIN_INIT_SECRET;
  if (!initSecret || (authHeader !== `Bearer ${initSecret}` && authHeader !== initSecret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid initialization secret." },
      { status: 401 }
    );
  }

  try {
    // Step 1: Create all PostgreSQL tables and enums if they do not exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STUDENT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "LessonContentType" AS ENUM ('VIDEO', 'PDF', 'TEXT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'REVOKED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'CANCELLED', 'PAID_OUT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "WalletTxType" AS ENUM ('CREDIT_COMMISSION', 'DEBIT_WITHDRAWAL', 'ADJUSTMENT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "phone" TEXT,
        "avatarUrl" TEXT,
        "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
        "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
        "referralCode" TEXT UNIQUE NOT NULL,
        "tokenVersion" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "referral_levels" (
        "id" TEXT PRIMARY KEY,
        "level" INTEGER UNIQUE NOT NULL,
        "commissionRate" DECIMAL(5,4) NOT NULL,
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "referral_relationships" (
        "id" TEXT PRIMARY KEY,
        "referrerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "referredId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "referral_closures" (
        "id" TEXT PRIMARY KEY,
        "ancestorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "descendantId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "depth" INTEGER NOT NULL,
        UNIQUE ("ancestorId", "descendantId")
      );

      CREATE TABLE IF NOT EXISTS "courses" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT UNIQUE NOT NULL,
        "shortDescription" TEXT,
        "fullDescription" TEXT,
        "thumbnailKey" TEXT,
        "price" DECIMAL(12,2) NOT NULL,
        "compareAtPrice" DECIMAL(12,2),
        "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "isReferralEligible" BOOLEAN NOT NULL DEFAULT true,
        "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
        "totalDuration" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "modules" (
        "id" TEXT PRIMARY KEY,
        "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "isPublished" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("courseId", "position")
      );

      CREATE TABLE IF NOT EXISTS "lessons" (
        "id" TEXT PRIMARY KEY,
        "moduleId" TEXT NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "contentType" "LessonContentType" NOT NULL DEFAULT 'VIDEO',
        "textContent" TEXT,
        "videoKey" TEXT,
        "pdfKey" TEXT,
        "durationSec" INTEGER NOT NULL DEFAULT 0,
        "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
        "isPublished" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("moduleId", "position"),
        UNIQUE ("moduleId", "slug")
      );

      CREATE TABLE IF NOT EXISTS "course_enrollments" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
        "orderId" TEXT,
        "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
        "progressPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        UNIQUE ("userId", "courseId")
      );

      CREATE TABLE IF NOT EXISTS "lesson_progress" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "lessonId" TEXT NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
        "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
        "watchTimeSeconds" INTEGER NOT NULL DEFAULT 0,
        "completedAt" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "lessonId")
      );

      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT PRIMARY KEY,
        "orderNumber" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "couponId" TEXT,
        "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "subtotalAmount" DECIMAL(12,2) NOT NULL,
        "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "totalAmount" DECIMAL(12,2) NOT NULL,
        "paymentProvider" TEXT,
        "paymentId" TEXT,
        "metadata" JSONB,
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
        "itemTitle" TEXT NOT NULL,
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "totalPrice" DECIMAL(12,2) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "discountType" "DiscountType" NOT NULL,
        "discountValue" DECIMAL(12,2) NOT NULL,
        "minOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "maxDiscountAmount" DECIMAL(12,2),
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "usageLimit" INTEGER,
        "perUserLimit" INTEGER NOT NULL DEFAULT 1,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "coupon_courses" (
        "id" TEXT PRIMARY KEY,
        "couponId" TEXT NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
        "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
        UNIQUE ("couponId", "courseId")
      );

      CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
        "id" TEXT PRIMARY KEY,
        "couponId" TEXT NOT NULL REFERENCES "coupons"("id") ON DELETE RESTRICT,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "discountApplied" DECIMAL(12,2) NOT NULL,
        "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("couponId", "orderId")
      );

      CREATE TABLE IF NOT EXISTS "order_commission_snapshots" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT UNIQUE NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "baseAmount" DECIMAL(12,2) NOT NULL,
        "planSnapshot" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "referral_commission_records" (
        "id" TEXT PRIMARY KEY,
        "snapshotId" TEXT NOT NULL REFERENCES "order_commission_snapshots"("id") ON DELETE CASCADE,
        "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "beneficiaryId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "level" INTEGER NOT NULL,
        "rateApplied" DECIMAL(5,4) NOT NULL,
        "commissionAmount" DECIMAL(12,2) NOT NULL,
        "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("orderId", "beneficiaryId", "level")
      );

      CREATE TABLE IF NOT EXISTS "wallets" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" TEXT PRIMARY KEY,
        "walletId" TEXT NOT NULL REFERENCES "wallets"("id") ON DELETE RESTRICT,
        "type" "WalletTxType" NOT NULL,
        "status" "WalletTxStatus" NOT NULL DEFAULT 'COMPLETED',
        "amount" DECIMAL(12,2) NOT NULL,
        "balanceBefore" DECIMAL(12,2) NOT NULL,
        "balanceAfter" DECIMAL(12,2) NOT NULL,
        "description" TEXT,
        "referenceType" TEXT,
        "referenceId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "withdrawals" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "amount" DECIMAL(12,2) NOT NULL,
        "paymentMethod" TEXT NOT NULL,
        "paymentDetails" JSONB NOT NULL,
        "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
        "adminNote" TEXT,
        "processedAt" TIMESTAMP(3),
        "processedBy" TEXT,
        "transactionRef" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "site_settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'string',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" TEXT PRIMARY KEY,
        "actorId" TEXT,
        "actorEmail" TEXT,
        "actorRole" TEXT,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "oldValues" JSONB,
        "newValues" JSONB,
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ BEGIN
        CREATE TYPE "PaymentMethodType" AS ENUM ('UPI', 'BANK', 'CRYPTO');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

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

      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualPaymentRef" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualPaymentProof" JSONB;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

      -- Bunny Media Columns Migration
      ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnailCdnUrl" TEXT;
      ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyVideoId" TEXT;
      ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "bunnyCdnUrl" TEXT;
      ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "mediaProvider" TEXT DEFAULT 'BUNNY';

      -- Support Inquiries & Student Ticket System
      DO $$ BEGIN
        CREATE TYPE "SupportInquiryStatus" AS ENUM ('OPEN', 'NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
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

      CREATE TABLE IF NOT EXISTS "support_inquiry_messages" (
        "id" TEXT PRIMARY KEY,
        "inquiryId" TEXT NOT NULL REFERENCES "support_inquiries"("id") ON DELETE CASCADE,
        "senderId" TEXT,
        "senderRole" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Media Asset Library & Lesson Media Attachment System
      DO $$ BEGIN
        CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'PDF', 'IMAGE', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "MediaUploadStatus" AS ENUM ('QUEUED', 'UPLOADING', 'UPLOADED', 'FAILED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "MediaStatus" AS ENUM ('QUEUED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "media_assets" (
        "id" TEXT PRIMARY KEY,
        "fileName" TEXT NOT NULL,
        "originalFileName" TEXT NOT NULL,
        "mediaType" "MediaType" NOT NULL DEFAULT 'VIDEO',
        "mimeType" TEXT NOT NULL,
        "fileSize" BIGINT NOT NULL DEFAULT 0,
        "storageProvider" TEXT NOT NULL DEFAULT 'BUNNY',
        "storageKey" TEXT,
        "storageUrl" TEXT,
        "bunnyVideoId" TEXT,
        "thumbnailUrl" TEXT,
        "duration" INTEGER DEFAULT 0,
        "pageCount" INTEGER DEFAULT 0,
        "width" INTEGER,
        "height" INTEGER,
        "checksum" TEXT,
        "uploadStatus" "MediaUploadStatus" NOT NULL DEFAULT 'QUEUED',
        "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
        "status" "MediaStatus" NOT NULL DEFAULT 'QUEUED',
        "errorMessage" TEXT,
        "uploadedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "isTestData" BOOLEAN NOT NULL DEFAULT true,
        "environment" TEXT NOT NULL DEFAULT 'LIVE',
        "deletedAt" TIMESTAMP(3),
        "deletedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "lesson_media" (
        "id" TEXT PRIMARY KEY,
        "lessonId" TEXT NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
        "mediaId" TEXT NOT NULL REFERENCES "media_assets"("id") ON DELETE RESTRICT,
        "mediaRole" TEXT NOT NULL DEFAULT 'PRIMARY',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isTestData" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("lessonId", "mediaId", "mediaRole")
      );

      CREATE INDEX IF NOT EXISTS "media_assets_mediaType_status_idx" ON "media_assets"("mediaType", "status");
      CREATE INDEX IF NOT EXISTS "media_assets_status_createdAt_idx" ON "media_assets"("status", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "media_assets_checksum_idx" ON "media_assets"("checksum");
      CREATE INDEX IF NOT EXISTS "media_assets_isTestData_deletedAt_status_idx" ON "media_assets"("isTestData", "deletedAt", "status");
      CREATE INDEX IF NOT EXISTS "media_assets_uploadedById_idx" ON "media_assets"("uploadedById");
      CREATE INDEX IF NOT EXISTS "media_assets_environment_isTestData_idx" ON "media_assets"("environment", "isTestData");

      CREATE INDEX IF NOT EXISTS "lesson_media_lessonId_idx" ON "lesson_media"("lessonId");
      CREATE INDEX IF NOT EXISTS "lesson_media_mediaId_idx" ON "lesson_media"("mediaId");
      CREATE INDEX IF NOT EXISTS "lesson_media_isTestData_lessonId_idx" ON "lesson_media"("isTestData", "lessonId");
    `);

    // Step 1.5: Seed default UPI and Crypto Payment Methods if table is empty
    await prisma.$executeRawUnsafe(`
      INSERT INTO "system_payment_methods" ("id", "type", "title", "details", "instructions", "isActive", "createdAt", "updatedAt")
      VALUES 
        (
          'spm_upi_001',
          'UPI',
          'GooglePay / PhonePe / Paytm UPI',
          '{"upiId":"superwarrior30@upi","payeeName":"Super Warrior 30 Mentorship","qrCodeUrl":"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=superwarrior30@upi&pn=SuperWarrior30"}',
          'Scan the QR code or send payment to the UPI ID. After completing payment, enter the 12-digit UTR / Reference Number below.',
          true,
          NOW(),
          NOW()
        ),
        (
          'spm_crypto_001',
          'CRYPTO',
          'USDT (BEP-20 / BNB Smart Chain)',
          '{"network":"BEP-20 (BNB Smart Chain)","walletAddress":"0x45127b42b72c3357d94bc3687fe6c813a1a9e99a","qrCodeUrl":"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0x45127b42b72c3357d94bc3687fe6c813a1a9e99a"}',
          'Send exact USDT amount via BEP-20 network to the deposit address. Paste your transaction hash (TxID) below.',
          true,
          NOW(),
          NOW()
        ),
        (
          'spm_bank_001',
          'BANK',
          'Direct IMPS / NEFT Bank Transfer',
          '{"bankName":"HDFC Bank","accountName":"Super Warrior 30 Trading Institute","accountNumber":"50200084920192","ifsc":"HDFC0001234","branch":"Mumbai Main Branch"}',
          'Transfer exact amount via IMPS/NEFT/RTGS. Enter the bank transfer reference/UTR number below.',
          true,
          NOW(),
          NOW()
        )
      ON CONFLICT ("id") DO NOTHING;
    `);

    // Step 2: Ensure UserRole enum has SUPER_ADMIN and SUPPORT
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Step 3: Create / Upgrade Super Admin User
    const adminPassword = await hashPassword("Admin@123");
    const adminId = "usr_admin_001";
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "users" ("id", "email", "name", "passwordHash", "role", "status", "referralCode", "tokenVersion", "createdAt", "updatedAt")
      VALUES ('${adminId}', 'vinayaksahu3@gmail.com', 'Super Admin', '${adminPassword}', 'SUPER_ADMIN', 'ACTIVE', 'ADMIN001', 1, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE SET "role" = 'SUPER_ADMIN';

      INSERT INTO "wallets" ("id", "userId", "availableBalance", "pendingBalance", "totalEarned", "totalWithdrawn", "version", "createdAt", "updatedAt")
      VALUES ('wlt_admin_001', '${adminId}', 0.00, 0.00, 0.00, 0.00, 1, NOW(), NOW())
      ON CONFLICT ("userId") DO NOTHING;
    `);

    // Step 3: Create Sample Referral Levels
    await prisma.$executeRawUnsafe(`
      INSERT INTO "referral_levels" ("id", "level", "commissionRate", "isEnabled", "createdAt", "updatedAt")
      VALUES 
        ('lvl_1', 1, 0.1000, true, NOW(), NOW()),
        ('lvl_2', 2, 0.0500, true, NOW(), NOW()),
        ('lvl_3', 3, 0.0300, true, NOW(), NOW())
      ON CONFLICT ("level") DO UPDATE SET "commissionRate" = EXCLUDED."commissionRate";
    `);

    // Step 4: Create Sample Courses
    await prisma.$executeRawUnsafe(`
      INSERT INTO "courses" ("id", "title", "slug", "shortDescription", "fullDescription", "price", "compareAtPrice", "status", "isFeatured", "difficulty", "totalDuration", "createdAt", "updatedAt")
      VALUES 
        ('crs_001', 'Trading Fundamentals Masterclass', 'trading-fundamentals-masterclass', 'Master the basics of stock market trading with proven strategies.', 'Complete institutional trading masterclass from market structure to chart execution.', 4999.00, 9999.00, 'PUBLISHED', true, 'BEGINNER', 18000, NOW(), NOW()),
        ('crs_002', 'Advanced Technical Analysis', 'advanced-technical-analysis', 'Deep dive into chart patterns, order flow, and advanced trading setups.', 'Institutional price action patterns and Fibonacci liquidity strategies.', 7999.00, 14999.00, 'PUBLISHED', true, 'ADVANCED', 28800, NOW(), NOW())
      ON CONFLICT ("slug") DO NOTHING;

      INSERT INTO "modules" ("id", "courseId", "title", "position", "isPublished", "createdAt", "updatedAt")
      VALUES 
        ('mod_001', 'crs_001', 'Introduction & Setup', 1, true, NOW(), NOW()),
        ('mod_002', 'crs_001', 'Price Action & Execution', 2, true, NOW(), NOW())
      ON CONFLICT ("courseId", "position") DO NOTHING;

      INSERT INTO "lessons" ("id", "moduleId", "title", "slug", "position", "contentType", "durationSec", "isFreePreview", "isPublished", "videoKey", "createdAt", "updatedAt")
      VALUES 
        ('lsn_001', 'mod_001', 'Welcome to Trading - Free Preview', 'welcome-to-trading', 1, 'VIDEO', 600, true, true, 'sample-video.mp4', NOW(), NOW()),
        ('lsn_002', 'mod_001', 'Market Structure & Setup', 'market-structure-setup', 2, 'VIDEO', 1200, false, true, 'sample-video.mp4', NOW(), NOW()),
        ('lsn_003', 'mod_002', 'Orderflow Strategies', 'orderflow-strategies', 1, 'VIDEO', 1500, false, true, 'sample-video.mp4', NOW(), NOW())
      ON CONFLICT ("moduleId", "position") DO NOTHING;
    `);

    // Step 5: Site Settings
    await prisma.$executeRawUnsafe(`
      INSERT INTO "site_settings" ("id", "key", "value", "type", "createdAt", "updatedAt")
      VALUES 
        ('stg_001', 'site_name', 'Super Warrior 30', 'string', NOW(), NOW()),
        ('stg_002', 'site_tagline', 'Institutional Price Action Mentorship', 'string', NOW(), NOW()),
        ('stg_003', 'currency', 'INR', 'string', NOW(), NOW()),
        ('stg_004', 'referral_enabled', 'true', 'boolean', NOW(), NOW()),
        ('stg_005', 'min_withdrawal_amount', '500', 'number', NOW(), NOW()),
        ('stg_006', 'instructor_name', 'Vinayak Sahu', 'string', NOW(), NOW())
      ON CONFLICT ("key") DO NOTHING;
    `);

    return NextResponse.json({
      success: true,
      message: "Database tables verified and initialized successfully in development mode.",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Initialization error";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
