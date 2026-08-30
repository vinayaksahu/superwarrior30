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
  allowCouponStacking: boolean;
  isAutoVerificationActive: boolean;
}

/**
 * Public action for checkout and landing pages
 */
export async function getBrokerPublicConfigAction(): Promise<PublicBrokerConfig> {
  const settings = await getBrokerSettings();
  return {
    isEnabled: settings.isEnabled,
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
    allowCouponStacking: Boolean(settings.allowCouponStacking),
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

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "BROKER_SETTINGS_UPDATED",
          entityType: "SiteSetting",
          entityId: "BROKER_OFFER_SETTINGS",
          newValues: updated as any,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/broker-offers");
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");

    return {
      success: true,
      settings: updated,
      message: "Broker offer settings updated successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update broker settings.",
    };
  }
}

/**
 * Server-side member verification check
 */
export async function verifyBrokerMemberIdAction(
  memberId: string
): Promise<BrokerVerificationResult> {
  return await verifyBrokerMemberIdServer(memberId);
}

/**
 * Admin list of broker claims / cashback ledger entries
 */
export async function listBrokerClaimsAction(params?: {
  status?: string;
  mode?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 25));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params?.status && params.status !== "ALL") {
    where.cashbackStatus = params.status;
  }

  if (params?.mode && params.mode !== "ALL") {
    where.mode = params.mode;
  }

  if (params?.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { brokerMemberId: { contains: term, mode: "insensitive" } },
      { user: { email: { contains: term, mode: "insensitive" } } },
      { user: { name: { contains: term, mode: "insensitive" } } },
      { order: { orderNumber: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [totalCount, claims] = await Promise.all([
    prisma.brokerOfferClaim.count({ where }),
    prisma.brokerOfferClaim.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            paidAt: true,
            items: {
              select: {
                itemTitle: true,
              },
            },
          },
        },
        verifiedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        paidBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    claims: claims.map((c) => ({
      ...c,
      coursePrice: Number(c.coursePrice),
      offerPercentage: Number(c.offerPercentage),
      calculatedAmount: Number(c.calculatedAmount),
    })),
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Admin verifies Member ID (Cashback Mode approval/rejection)
 */
export async function adminVerifyMemberIdAction(input: {
  claimId: string;
  action: "APPROVE" | "REJECT";
  rejectionReason?: string;
}) {
  const admin = await requireAdminWrite();
  await ensureDatabaseSchemaSync();

  const claim = await prisma.brokerOfferClaim.findUnique({
    where: { id: input.claimId },
    include: { user: true, order: true },
  });

  if (!claim) {
    return { success: false, message: "Broker claim record not found." };
  }

  if (input.action === "APPROVE") {
    const updated = await prisma.brokerOfferClaim.update({
      where: { id: input.claimId },
      data: {
        verificationStatus: "VERIFIED",
        cashbackStatus: "AVAILABLE",
        verifiedAt: new Date(),
        verifiedById: admin.id,
        rejectionReason: null,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "BROKER_MEMBER_APPROVED",
          entityType: "BrokerOfferClaim",
          entityId: claim.id,
          newValues: {
            claimId: claim.id,
            brokerMemberId: claim.brokerMemberId,
            userId: claim.userId,
            calculatedAmount: Number(claim.calculatedAmount),
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
      message: `Member ID ${claim.brokerMemberId} approved. Cashback of ₹${Number(claim.calculatedAmount).toFixed(2)} is now AVAILABLE for student to claim.`,
      claim: updated,
    };
  } else {
    const updated = await prisma.brokerOfferClaim.update({
      where: { id: input.claimId },
      data: {
        verificationStatus: "REJECTED",
        cashbackStatus: "REJECTED",
        verifiedAt: new Date(),
        verifiedById: admin.id,
        rejectionReason: input.rejectionReason || "Member ID could not be verified under partner account.",
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "BROKER_MEMBER_REJECTED",
          entityType: "BrokerOfferClaim",
          entityId: claim.id,
          newValues: {
            claimId: claim.id,
            reason: input.rejectionReason,
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
      message: "Broker Member ID verification rejected.",
      claim: updated,
    };
  }
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

    // 1. Update Claim Status to PAID
    const updatedClaim = await tx.brokerOfferClaim.update({
      where: { id: input.claimId },
      data: {
        cashbackStatus: "PAID",
        paidAt: new Date(),
        paidById: admin.id,
        payoutTxRef: input.payoutTxRef.trim(),
      },
    });

    // 2. Credit user's Wallet and record Financial Ledger entry
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

    // 3. Audit log
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
