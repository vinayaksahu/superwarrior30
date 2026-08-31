"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireAdminWrite } from "@/server/dal/auth";
import {
  getBrokerSettings,
  saveBrokerSettings,
  BrokerOfferSettings,
  BrokerOfferMode,
  EligibleCourseScope,
} from "@/lib/broker/config";
import {
  verifyBrokerMemberIdServer,
  BrokerVerificationResult,
} from "@/lib/broker/verification";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";

export interface PublicBrokerConfig {
  isEnabled: boolean;
  isCouponEnabled: boolean;
  isReferralDiscountEnabled: boolean;
  referralDiscountPercentage: number;
  allowCouponWithBroker: boolean;
  allowReferralWithCoupon: boolean;
  allowReferralWithBroker: boolean;
  allowAllStacking: boolean;
  allowCouponStacking: boolean;
  allowReferralStacking: boolean;

  mode: BrokerOfferMode;
  brokerName: string;
  brokerPartnerUrl: string;
  offerPercentage: number;
  minimumOrderAmount: number;
  maximumBenefitAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  eligibleCourseScope: EligibleCourseScope;
  eligibleCourseIds: string[];
  requireMemberId: boolean;
  requireProof: boolean;
  description: string;
  isAutoVerificationActive: boolean;
}

/**
 * Public action for checkout and landing pages
 */
export async function getBrokerPublicConfigAction(): Promise<PublicBrokerConfig> {
  const settings = await getBrokerSettings();
  return {
    isEnabled: settings.isEnabled,
    isCouponEnabled: settings.isCouponEnabled !== false,
    isReferralDiscountEnabled: settings.isReferralDiscountEnabled !== false,
    referralDiscountPercentage: Number(settings.referralDiscountPercentage) || 10,
    allowCouponWithBroker: Boolean(settings.allowCouponWithBroker),
    allowReferralWithCoupon: Boolean(settings.allowReferralWithCoupon),
    allowReferralWithBroker: Boolean(settings.allowReferralWithBroker),
    allowAllStacking: Boolean(settings.allowAllStacking),
    allowCouponStacking: Boolean(settings.allowCouponStacking || settings.allowCouponWithBroker || settings.allowAllStacking),
    allowReferralStacking: Boolean(settings.allowReferralStacking || settings.allowAllStacking),

    mode: settings.mode,
    brokerName: settings.brokerName,
    brokerPartnerUrl: settings.brokerPartnerUrl,
    offerPercentage: Number(settings.offerPercentage) || 40,
    minimumOrderAmount: Number(settings.minimumOrderAmount) || 0,
    maximumBenefitAmount: settings.maximumBenefitAmount ? Number(settings.maximumBenefitAmount) : null,
    startDate: settings.startDate || null,
    endDate: settings.endDate || null,
    eligibleCourseScope: settings.eligibleCourseScope || "ALL_COURSES",
    eligibleCourseIds: settings.eligibleCourseIds || [],
    requireMemberId: settings.requireMemberId !== false,
    requireProof: Boolean(settings.requireProof),
    description: settings.description || "Open your broker account using our partner link and unlock a special course benefit.",
    isAutoVerificationActive: Boolean(settings.isAutoVerificationActive),
  };
}

/**
 * Admin action to get full configuration
 */
export async function getBrokerAdminSettingsAction(): Promise<BrokerOfferSettings> {
  await requireAdmin();
  return await getBrokerSettings();
}

/**
 * Admin action to update configuration.
 */
export async function updateBrokerAdminSettingsAction(
  newSettings: Partial<BrokerOfferSettings>
) {
  const admin = await requireAdminWrite();

  try {
    const updated = await saveBrokerSettings(newSettings);

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "UPDATE_BROKER_SETTINGS",
        entityType: "SiteSetting",
        entityId: "BROKER_OFFER_SETTINGS",
        newValues: updated as any,
      },
    });

    revalidatePath("/admin/broker-offers");
    revalidatePath("/admin/referrals/settings");
    revalidatePath("/checkout");
    revalidatePath("/register");

    return { success: true, settings: updated };
  } catch (error) {
    console.error("Failed to update broker settings:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update offer and stacking settings.",
    };
  }
}

/**
 * Public action for students to verify their broker member ID at checkout
 */
export async function verifyBrokerMemberIdAction(
  memberId: string
): Promise<BrokerVerificationResult> {
  if (!memberId || !memberId.trim()) {
    return {
      isVerified: false,
      message: "Please enter a valid Broker Member ID.",
    };
  }

  const settings = await getBrokerSettings();
  return await verifyBrokerMemberIdServer(memberId, settings);
}
