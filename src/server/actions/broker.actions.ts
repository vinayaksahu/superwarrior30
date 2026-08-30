"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireAdminWrite } from "@/server/dal/auth";
import {
  getBrokerSettings,
  saveBrokerSettings,
  BrokerOfferSettings,
  BrokerOfferMode,
} from "@/lib/broker/config";
import {
  verifyBrokerMemberIdServer,
  BrokerVerificationResult,
} from "@/lib/broker/verification";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";

export interface PublicBrokerConfig {
  isEnabled: boolean;
  mode: BrokerOfferMode;
  brokerName: string;
  brokerPartnerUrl: string;
  offerPercentage: number;
  isAutoVerificationActive: boolean;
  customInstructions?: string;
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
    isAutoVerificationActive: Boolean(settings.isAutoVerificationActive),
    customInstructions: settings.customInstructions,
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
 * Guard: Prevents saving INSTANT_DISCOUNT if auto-verification is inactive.
 */
export async function updateBrokerAdminSettingsAction(
  newSettings: Partial<BrokerOfferSettings>
) {
  const admin = await requireAdminWrite();

  // Safety validation
  if (newSettings.mode === "INSTANT_DISCOUNT") {
    const isAutoActive =
      newSettings.isAutoVerificationActive !== undefined
        ? newSettings.isAutoVerificationActive
        : (await getBrokerSettings()).isAutoVerificationActive;

    if (!isAutoActive) {
      return {
        success: false,
        message:
          "Cannot enable Instant Discount Mode: Automatic verification is not active. Please configure and activate auto-verification first.",
      };
    }
  }

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

  const claim = await prisma.brokerOfferClaim.findUnique({
    where: { id: input.claimId },
  });

  if (!claim) {
    return { success: false, message: "Cashback claim not found." };
  }

  if (claim.cashbackStatus !== "CLAIM_REQUESTED" && claim.cashbackStatus !== "AVAILABLE") {
    return {
      success: false,
      message: `Cannot release payout for claim in '${claim.cashbackStatus}' status.`,
    };
  }

  const updated = await prisma.brokerOfferClaim.update({
    where: { id: input.claimId },
    data: {
      cashbackStatus: "PAID",
      paidAt: new Date(),
      paidById: admin.id,
      payoutTxRef: input.payoutTxRef.trim(),
    },
  });

  try {
    await prisma.auditLog.create({
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
    message: `Cashback payout of ₹${Number(claim.calculatedAmount).toFixed(2)} marked as PAID.`,
    claim: updated,
  };
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
