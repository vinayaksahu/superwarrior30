-- AlterTable: Add Direct Referral Qualification fields to referral_levels
-- Migration: add_direct_referral_qualification

ALTER TABLE "referral_levels" ADD COLUMN IF NOT EXISTS "requiresDirectReferralQualification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "referral_levels" ADD COLUMN IF NOT EXISTS "directReferralsRequired" INTEGER NOT NULL DEFAULT 0;
