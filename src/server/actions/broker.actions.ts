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
  const settings = await getBrokerSettings();
  if (!memberId || !memberId.trim()) {
    return {
      isVerified: false,
      isServiceAvailable: true,
      memberId: "",
      brokerName: settings.brokerName,
      message: "Please enter a valid Broker Member ID.",
    };
  }

  return await verifyBrokerMemberIdServer(memberId, settings);
}

/**
 * Admin action to list all broker claims
 */
export async function listBrokerClaimsAction(params?: {
  page?: number;
  limit?: number;
  status?: string;
  mode?: string;
  search?: string;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const whereClause: Prisma.BrokerOfferClaimWhereInput = {};

  if (params?.status && params.status !== "ALL") {
    whereClause.verificationStatus = params.status as any;
  }

  if (params?.mode && params.mode !== "ALL") {
    whereClause.mode = params.mode as any;
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    whereClause.OR = [
      { brokerMemberId: { contains: s, mode: "insensitive" } },
      { user: { name: { contains: s, mode: "insensitive" } } },
      { user: { email: { contains: s, mode: "insensitive" } } },
      { order: { orderNumber: { contains: s, mode: "insensitive" } } },
    ];
  }

  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const skip = (page - 1) * limit;

  const claims = await prisma.brokerOfferClaim.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
        },
      },
    },
  });

  return claims.map((c) => ({
    ...c,
    coursePrice: Number(c.coursePrice),
    offerPercentage: Number(c.offerPercentage),
    calculatedAmount: Number(c.calculatedAmount),
  }));
}

/**
 * Admin verifies or rejects a Broker Member ID claim manually
 */
export async function adminVerifyMemberIdAction(input: {
  claimId: string;
  status?: "VERIFIED" | "REJECTED";
  action?: "APPROVE" | "REJECT" | "VERIFIED" | "REJECTED";
  adminNotes?: string;
  note?: string;
  reason?: string;
}) {
  const admin = await requireAdminWrite();
  await ensureDatabaseSchemaSync();

  const existingClaim = await prisma.brokerOfferClaim.findUnique({
    where: { id: input.claimId },
    include: { order: true, user: true },
  });

  if (!existingClaim) {
    return { success: false, message: "Claim record not found." };
  }

  const isVerified =
    input.status === "VERIFIED" ||
    input.action === "APPROVE" ||
    input.action === "VERIFIED";

  const targetStatus = isVerified ? "VERIFIED" : "REJECTED";
  const notes = input.adminNotes || input.note || input.reason || null;

  const updated = await prisma.brokerOfferClaim.update({
    where: { id: input.claimId },
    data: {
      verificationStatus: targetStatus,
      verifiedAt: isVerified ? new Date() : null,
      verifiedById: isVerified ? admin.id : null,
      rejectionReason: !isVerified ? notes : null,
      cashbackStatus:
        existingClaim.mode === "CASHBACK"
          ? isVerified
            ? "AVAILABLE"
            : "NOT_APPLICABLE"
          : "NOT_APPLICABLE",
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: isVerified ? "VERIFY_BROKER_CLAIM" : "REJECT_BROKER_CLAIM",
        entityType: "BrokerOfferClaim",
        entityId: existingClaim.id,
        newValues: {
          claimId: existingClaim.id,
          status: targetStatus,
          adminNotes: notes,
        },
      },
    });
  } catch {
    // ignore
  }

  revalidatePath("/admin/broker-offers");
  revalidatePath("/dashboard/cashbacks");

    return {
      success: true,
      message: isVerified
        ? "Broker Member ID successfully verified!"
        : "Broker Member ID verification rejected.",
      claim: updated,
    };
  }

/**
 * Student submits Payout details (UPI ID / Bank) to claim available cashback
 */
export async function claimCashbackAction(input: {
  claimId: string;
  payoutDetails: {
    method: "UPI" | "BANK";
    upiId?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  };
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Please log in to claim cashback." };
  }

  await ensureDatabaseSchemaSync();

  const claim = await prisma.brokerOfferClaim.findUnique({
    where: { id: input.claimId },
  });

  if (!claim) {
    return { success: false, message: "Cashback claim not found." };
  }

  if (claim.userId !== user.id) {
    return { success: false, message: "Unauthorized access to this cashback claim." };
  }

  if (claim.cashbackStatus !== "AVAILABLE") {
    return {
      success: false,
      message: `Cannot claim cashback in '${claim.cashbackStatus}' status. Cashback must be approved and AVAILABLE first.`,
    };
  }

  if (input.payoutDetails.method === "UPI" && !input.payoutDetails.upiId?.trim()) {
    return { success: false, message: "Please provide a valid UPI ID for payout." };
  }

  if (
    input.payoutDetails.method === "BANK" &&
    (!input.payoutDetails.accountNumber?.trim() || !input.payoutDetails.ifsc?.trim())
  ) {
    return { success: false, message: "Please provide complete bank account details." };
  }

  const updated = await prisma.brokerOfferClaim.update({
    where: { id: input.claimId },
    data: {
      cashbackStatus: "CLAIM_REQUESTED",
      claimedAt: new Date(),
      payoutDetails: input.payoutDetails as any,
    },
  });

  revalidatePath("/dashboard/cashbacks");
  revalidatePath("/admin/broker-offers");

  return {
    success: true,
    message: "Cashback claim submitted successfully! Admin will process your payout shortly.",
    claim: updated,
  };
}

/**
 * Admin releases payout and marks cashback as PAID
 * Also credits the user's Wallet and writes a Financial Ledger record.
 */
export async function adminReleaseCashbackPayoutAction(input: {
  claimId: string;
  payoutTxRef: string;
}) {
  const admin = await requireAdminWrite();
  await ensureDatabaseSchemaSync();

  if (!input.payoutTxRef?.trim()) {
    return { success: false, message: "Please enter the transaction reference / UTR ID." };
  }

  return await prisma.$transaction(async (tx) => {
    const claim = await tx.brokerOfferClaim.findUnique({
      where: { id: input.claimId },
      include: { order: true, user: true },
    });

    if (!claim) {
      return { success: false, message: "Cashback claim not found." };
    }

    if (claim.cashbackStatus === "PAID") {
      return { success: false, message: "This cashback claim is already marked as PAID." };
    }

    const updatedClaim = await tx.brokerOfferClaim.update({
      where: { id: input.claimId },
      data: {
        cashbackStatus: "PAID",
        paidAt: new Date(),
        paidById: admin.id,
        payoutTxRef: input.payoutTxRef.trim(),
      },
    });

    const wallet = await tx.wallet.upsert({
      where: { userId: claim.userId },
      update: {},
      create: {
        userId: claim.userId,
        availableBalance: new Prisma.Decimal(0.0),
        pendingBalance: new Prisma.Decimal(0.0),
        totalEarned: new Prisma.Decimal(0.0),
        totalWithdrawn: new Prisma.Decimal(0.0),
      },
    });

    const balanceBefore = wallet.availableBalance;
    const balanceAfter = wallet.availableBalance.plus(claim.calculatedAmount);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: balanceAfter,
        totalEarned: wallet.totalEarned.plus(claim.calculatedAmount),
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADJUSTMENT",
        status: "COMPLETED",
        amount: claim.calculatedAmount,
        balanceBefore,
        balanceAfter,
        description: `Broker Cashback Credit for Order #${claim.order.orderNumber} (Ref: ${input.payoutTxRef.trim()})`,
        referenceType: "CASHBACK",
        referenceId: claim.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "CASHBACK_PAYOUT_RELEASED",
        entityType: "BrokerOfferClaim",
        entityId: claim.id,
        newValues: {
          claimId: claim.id,
          amount: Number(claim.calculatedAmount),
          payoutTxRef: input.payoutTxRef.trim(),
          userId: claim.userId,
          walletId: wallet.id,
        },
      },
    });

    revalidatePath("/admin/broker-offers");
    revalidatePath("/admin/wallet");
    revalidatePath("/wallet");
    revalidatePath("/dashboard/cashbacks");

    return {
      success: true,
      message: `Cashback payout of ₹${Number(claim.calculatedAmount).toFixed(2)} marked as PAID and credited to student wallet.`,
      claim: updatedClaim,
    };
  });
}

/**
 * Student retrieves their active & past cashback claims
 */
export async function getStudentCashbacksAction() {
  const user = await getCurrentUser();
  if (!user) return [];

  await ensureDatabaseSchemaSync();

  const claims = await prisma.brokerOfferClaim.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          items: {
            select: {
              itemTitle: true,
            },
          },
        },
      },
    },
  });

  return claims.map((c) => ({
    ...c,
    coursePrice: Number(c.coursePrice),
    offerPercentage: Number(c.offerPercentage),
    calculatedAmount: Number(c.calculatedAmount),
  }));
}
