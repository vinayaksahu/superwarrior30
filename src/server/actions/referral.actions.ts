"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, requireSuperAdmin, requireSuperAdminAction } from "@/server/dal/auth";
import { referralSettingsSchema, type ReferralSettingsInput } from "@/lib/validations/referral.schema";
import { PAGINATION, APP_URL } from "@/lib/constants";
import type { ActionState } from "@/types";
import { Prisma } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

// ==========================================
// 1. ADMIN REFERRAL SETTINGS
// ==========================================

export async function getReferralSettingsAction() {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const [settings, levels] = await Promise.all([
    prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "referral_enabled",
            "referral_holding_days",
            "referral_min_withdrawal",
            "referral_discount_percentage",
            "referral_discount_enabled",
          ],
        },
      },
    }),
    prisma.referralLevel.findMany({
      orderBy: { level: "asc" },
    }),
  ]);

  const map = new Map(settings.map((s) => [s.key, s.value]));
  const isReferralEnabled = map.has("referral_enabled") ? map.get("referral_enabled") === "true" : true;
  const holdingPeriodDays = map.has("referral_holding_days") ? parseInt(map.get("referral_holding_days")!, 10) || 7 : 7;
  const minWithdrawalAmount = map.has("referral_min_withdrawal") ? parseFloat(map.get("referral_min_withdrawal")!) || 500 : 500;
  const referralDiscountPercentage = map.has("referral_discount_percentage") ? parseFloat(map.get("referral_discount_percentage")!) || 10 : 10;
  const isReferralDiscountEnabled = map.has("referral_discount_enabled") ? map.get("referral_discount_enabled") === "true" : true;

  return {
    isReferralEnabled,
    holdingPeriodDays,
    minWithdrawalAmount,
    referralDiscountPercentage,
    isReferralDiscountEnabled,
    levels: levels.map((l) => ({
      id: l.id,
      level: l.level,
      commissionPercentage: Number(l.commissionRate) * 100,
      isEnabled: l.isEnabled,
      requiresDirectReferralQualification: l.requiresDirectReferralQualification ?? false,
      directReferralsRequired: l.directReferralsRequired ?? 0,
    })),
  };
}

export async function saveReferralSettingsAction(
  data: ReferralSettingsInput
): Promise<ActionState> {
  const admin = await requireAdmin();
  await ensureDatabaseSchemaSync();

  const validated = referralSettingsSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid referral settings.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const {
    isReferralEnabled,
    holdingPeriodDays,
    minWithdrawalAmount,
    referralDiscountPercentage,
    isReferralDiscountEnabled,
    levels,
  } = validated.data;

  await prisma.$transaction(async (tx) => {
    // 1. Update global settings
    await tx.siteSetting.upsert({
      where: { key: "referral_enabled" },
      update: { value: isReferralEnabled ? "true" : "false" },
      create: {
        key: "referral_enabled",
        value: isReferralEnabled ? "true" : "false",
        type: "boolean",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_holding_days" },
      update: { value: holdingPeriodDays.toString() },
      create: {
        key: "referral_holding_days",
        value: holdingPeriodDays.toString(),
        type: "number",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_min_withdrawal" },
      update: { value: minWithdrawalAmount.toString() },
      create: {
        key: "referral_min_withdrawal",
        value: minWithdrawalAmount.toString(),
        type: "number",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_discount_percentage" },
      update: { value: referralDiscountPercentage.toString() },
      create: {
        key: "referral_discount_percentage",
        value: referralDiscountPercentage.toString(),
        type: "number",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_discount_enabled" },
      update: { value: isReferralDiscountEnabled ? "true" : "false" },
      create: {
        key: "referral_discount_enabled",
        value: isReferralDiscountEnabled ? "true" : "false",
        type: "boolean",
      },
    });

    // 2. Delete existing levels and recreate
    await tx.referralLevel.deleteMany({});

    for (const lvl of levels) {
      const decimalRate = new Prisma.Decimal(
        (lvl.commissionPercentage / 100).toFixed(4)
      );

      await tx.referralLevel.create({
        data: {
          level: lvl.level,
          commissionRate: decimalRate,
          isEnabled: lvl.isEnabled,
          requiresDirectReferralQualification: lvl.requiresDirectReferralQualification ?? false,
          directReferralsRequired: lvl.directReferralsRequired ?? 0,
        },
      });
    }

    // 3. Create audit log
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "REFERRAL_SETTINGS_UPDATED",
        entityType: "ReferralSettings",
        entityId: "global",
        newValues: {
          isReferralEnabled,
          holdingPeriodDays,
          minWithdrawalAmount,
          referralDiscountPercentage,
          isReferralDiscountEnabled,
          levels: levels.map((l) => ({
            level: l.level,
            percentage: l.commissionPercentage,
            isEnabled: l.isEnabled,
            requiresDirectReferralQualification: l.requiresDirectReferralQualification ?? false,
            directReferralsRequired: l.directReferralsRequired ?? 0,
          })),
        },
      },
    });
  });

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/referrals/settings");
  revalidatePath("/admin/referrals/clearance");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/wallet");

  return { success: true, message: "Referral settings saved successfully." };
}

// ==========================================
// 2. CORE COMMISSION ENGINE (CALCULATE & CREATE)
// ==========================================

export async function calculateAndCreateOrderCommissions(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  // 1. Fetch order with items, course referral eligibility, and existing snapshot
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          course: {
            select: {
              id: true,
              isReferralEligible: true,
            },
          },
        },
      },
      commissionSnapshot: true,
    },
  });

  if (!order) return;

  // 2. Idempotency protection: do not recreate if snapshot exists
  if (order.commissionSnapshot) {
    return;
  }

  // 3. Check global referral toggle and holding period
  const [globalSetting, holdingSetting] = await Promise.all([
    tx.siteSetting.findUnique({
      where: { key: "referral_enabled" },
    }),
    tx.siteSetting.findUnique({
      where: { key: "referral_holding_days" },
    }),
  ]);

  if (globalSetting && globalSetting.value === "false") {
    return;
  }

  const holdingPeriodDays = holdingSetting ? parseInt(holdingSetting.value, 10) || 7 : 7;
  const availableAt = new Date(Date.now() + holdingPeriodDays * 24 * 60 * 60 * 1000);

  // 4. Calculate referral-eligible base amount
  const eligibleItems = order.items.filter(
    (item) => item.course?.isReferralEligible !== false
  );

  if (eligibleItems.length === 0) {
    return;
  }

  const eligibleBaseAmount = eligibleItems.reduce(
    (sum, item) => sum + Number(item.totalPrice),
    0
  );

  if (eligibleBaseAmount <= 0) {
    return;
  }

  // 5. Fetch configured referral levels
  const configuredLevels = await tx.referralLevel.findMany({
    orderBy: { level: "asc" },
  });

  if (configuredLevels.length === 0) {
    return;
  }

  // 6. Fetch upline ancestors from ReferralClosure table
  const uplineClosures = await tx.referralClosure.findMany({
    where: { descendantId: order.userId },
    orderBy: { depth: "asc" },
  });

  if (uplineClosures.length === 0) {
    return;
  }

  // 7. Create historical snapshot of the plan at purchase time
  const snapshot = await tx.orderCommissionSnapshot.create({
    data: {
      orderId: order.id,
      baseAmount: new Prisma.Decimal(eligibleBaseAmount.toFixed(2)),
      planSnapshot: configuredLevels.map((lvl) => ({
        level: lvl.level,
        rate: Number(lvl.commissionRate),
        isEnabled: lvl.isEnabled,
        requiresDirectReferralQualification: lvl.requiresDirectReferralQualification ?? false,
        directReferralsRequired: lvl.directReferralsRequired ?? 0,
      })),
    },
  });

  // 8. Generate individual commission records for each active level
  for (const levelConfig of configuredLevels) {
    if (!levelConfig.isEnabled) continue;

    const matchingAncestor = uplineClosures.find(
      (c) => c.depth === levelConfig.level
    );

    if (matchingAncestor && matchingAncestor.ancestorId !== order.userId) {
      // Check Direct Referral Qualification if required for this level
      if (levelConfig.requiresDirectReferralQualification === true) {
        const requiredCount = levelConfig.directReferralsRequired ?? 0;
        const directReferralCount = await tx.referralRelationship.count({
          where: { referrerId: matchingAncestor.ancestorId },
        });

        if (directReferralCount < requiredCount) {
          // Beneficiary does not meet direct referral requirement for this level. Skip.
          continue;
        }
      }

      const commissionAmountNum = Number(
        (eligibleBaseAmount * Number(levelConfig.commissionRate)).toFixed(2)
      );

      if (commissionAmountNum > 0) {
        const commissionAmountDecimal = new Prisma.Decimal(
          commissionAmountNum.toFixed(2)
        );

        // A. Create commission record with unique constraint protection & availableAt
        const record = await tx.referralCommissionRecord.create({
          data: {
            snapshotId: snapshot.id,
            orderId: order.id,
            beneficiaryId: matchingAncestor.ancestorId,
            level: levelConfig.level,
            rateApplied: levelConfig.commissionRate,
            commissionAmount: commissionAmountDecimal,
            status: "PENDING",
            isTestData: order.isTestData,
            availableAt,
          },
        });

        // B. Update Beneficiary Wallet (pendingBalance and totalEarned increment)
        const beneficiaryWallet = await tx.wallet.upsert({
          where: { userId: matchingAncestor.ancestorId },
          update: {
            pendingBalance: { increment: commissionAmountDecimal },
            totalEarned: { increment: commissionAmountDecimal },
          },
          create: {
            userId: matchingAncestor.ancestorId,
            availableBalance: new Prisma.Decimal(0.0),
            pendingBalance: commissionAmountDecimal,
            totalEarned: commissionAmountDecimal,
            totalWithdrawn: new Prisma.Decimal(0.0),
            isTestData: order.isTestData,
          },
        });

        // C. Record Wallet Transaction
        await tx.walletTransaction.create({
          data: {
            walletId: beneficiaryWallet.id,
            type: "CREDIT_COMMISSION",
            status: "PENDING",
            amount: commissionAmountDecimal,
            balanceBefore: beneficiaryWallet.availableBalance,
            balanceAfter: beneficiaryWallet.availableBalance,
            description: `Level ${levelConfig.level} referral commission from order ${order.orderNumber} (Pending clearance)`,
            referenceType: "COMMISSION",
            referenceId: record.id,
            isTestData: order.isTestData,
          },
        });

        // D. Audit log
        await tx.auditLog.create({
          data: {
            actorId: matchingAncestor.ancestorId,
            action: "COMMISSION_CREATED",
            entityType: "ReferralCommissionRecord",
            entityId: record.id,
            newValues: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              amount: commissionAmountNum,
              level: levelConfig.level,
              availableAt: availableAt.toISOString(),
            },
          },
        });
      }
    }
  }
}

// ==========================================
// 3. AUTOMATIC & MANUAL COMMISSION CLEARANCE
// ==========================================

export async function processMaturedCommissionsAction(): Promise<{
  success: boolean;
  clearedCount: number;
  totalAmount: number;
  message: string;
}> {
  await ensureDatabaseSchemaSync();

  const now = new Date();

  // Find all pending commissions that have reached or passed their clearance availableAt date
  const maturedCommissions = await prisma.referralCommissionRecord.findMany({
    where: {
      status: "PENDING",
      availableAt: {
        lte: now,
      },
    },
    include: {
      order: { select: { orderNumber: true } },
      beneficiary: { select: { id: true, email: true } },
    },
  });

  if (maturedCommissions.length === 0) {
    return {
      success: true,
      clearedCount: 0,
      totalAmount: 0,
      message: "No matured commissions awaiting clearance.",
    };
  }

  let totalAmountCleared = 0;
  let clearedCount = 0;

  for (const commission of maturedCommissions) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark commission as AVAILABLE
        await tx.referralCommissionRecord.update({
          where: { id: commission.id },
          data: {
            status: "AVAILABLE",
            clearedAt: now,
            clearedReason: "Matured after clearance holding period",
          },
        });

        // 2. Fetch user wallet
        const wallet = await tx.wallet.findUnique({
          where: { userId: commission.beneficiaryId },
        });

        if (wallet) {
          const balanceBefore = wallet.availableBalance;
          const balanceAfter = wallet.availableBalance.plus(commission.commissionAmount);
          const newPending = Prisma.Decimal.max(
            0,
            wallet.pendingBalance.minus(commission.commissionAmount)
          );

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              pendingBalance: newPending,
              availableBalance: balanceAfter,
            },
          });

          // 3. Record Wallet Transaction
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: "CREDIT_COMMISSION",
              status: "COMPLETED",
              amount: commission.commissionAmount,
              balanceBefore,
              balanceAfter,
              description: `Commission cleared and released to available balance (Order #${commission.order.orderNumber})`,
              referenceType: "COMMISSION_RELEASE",
              referenceId: commission.id,
            },
          });

          // 4. Audit Log
          await tx.auditLog.create({
            data: {
              actorId: commission.beneficiaryId,
              actorEmail: commission.beneficiary.email,
              action: "COMMISSION_RELEASED",
              entityType: "ReferralCommissionRecord",
              entityId: commission.id,
              newValues: {
                amount: Number(commission.commissionAmount),
                orderNumber: commission.order.orderNumber,
                clearedAt: now.toISOString(),
              },
            },
          });
        }
      });

      totalAmountCleared += Number(commission.commissionAmount);
      clearedCount++;
    } catch (err) {
      console.error(`Error clearing commission ${commission.id}:`, err);
    }
  }

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/referrals/clearance");
  revalidatePath("/admin/wallet");
  revalidatePath("/wallet");
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    clearedCount,
    totalAmount: totalAmountCleared,
    message: `Successfully cleared ${clearedCount} commission(s) totaling ₹${totalAmountCleared.toFixed(2)}.`,
  };
}

export async function manualReleaseCommissionAction(
  commissionId: string,
  reason?: string
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN") {
    return { success: false, message: "Unauthorized: Admin privileges required." };
  }

  await ensureDatabaseSchemaSync();

  const commission = await prisma.referralCommissionRecord.findUnique({
    where: { id: commissionId },
    include: {
      order: { select: { orderNumber: true } },
      beneficiary: { select: { id: true, name: true, email: true } },
    },
  });

  if (!commission) {
    return { success: false, message: "Commission record not found." };
  }

  if (commission.status !== "PENDING") {
    return {
      success: false,
      message: `Commission is already in status "${commission.status}". Only PENDING commissions can be released.`,
    };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Update commission record to AVAILABLE with manual release tracking
    await tx.referralCommissionRecord.update({
      where: { id: commissionId },
      data: {
        status: "AVAILABLE",
        clearedAt: now,
        clearedById: admin.id,
        clearedReason: reason?.trim() || "Early manual release by Admin",
      },
    });

    // 2. Adjust beneficiary wallet
    const wallet = await tx.wallet.upsert({
      where: { userId: commission.beneficiaryId },
      update: {},
      create: {
        userId: commission.beneficiaryId,
        availableBalance: new Prisma.Decimal(0.0),
        pendingBalance: new Prisma.Decimal(0.0),
        totalEarned: commission.commissionAmount,
        totalWithdrawn: new Prisma.Decimal(0.0),
      },
    });

    const balanceBefore = wallet.availableBalance;
    const balanceAfter = wallet.availableBalance.plus(commission.commissionAmount);
    const newPending = Prisma.Decimal.max(
      0,
      wallet.pendingBalance.minus(commission.commissionAmount)
    );

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: newPending,
        availableBalance: balanceAfter,
      },
    });

    // 3. Record Wallet Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT_COMMISSION",
        status: "COMPLETED",
        amount: commission.commissionAmount,
        balanceBefore,
        balanceAfter,
        description: `Early manual release by ${admin.role} for Order #${commission.order?.orderNumber || "N/A"}${
          reason ? `: ${reason}` : ""
        }`,
        referenceType: "COMMISSION_RELEASE",
        referenceId: commission.id,
      },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COMMISSION_MANUALLY_RELEASED",
        entityType: "ReferralCommissionRecord",
        entityId: commissionId,
        newValues: {
          amount: Number(commission.commissionAmount),
          previousStatus: "PENDING",
          newStatus: "AVAILABLE",
          beneficiaryId: commission.beneficiaryId,
          beneficiaryEmail: commission.beneficiary?.email,
          orderNumber: commission.order?.orderNumber,
          reason: reason?.trim() || `Manual release by ${admin.role}`,
        },
      },
    });
  });

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/referrals/clearance");
  revalidatePath("/admin/wallet");
  revalidatePath("/wallet");
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message: `Commission of ₹${Number(commission.commissionAmount).toFixed(
      2
    )} released to available balance for ${commission.beneficiary?.name || commission.beneficiary?.email || "Student"}.`,
  };
}

// ==========================================
// 4. REVERSAL ENGINE (FOR REFUNDS / CANCELLATIONS)
// ==========================================

export async function reverseOrderCommissions(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason?: string
) {
  // Find all active/pending commission records for this order
  const records = await tx.referralCommissionRecord.findMany({
    where: {
      orderId,
      status: { in: ["PENDING", "AVAILABLE", "PAID_OUT"] },
    },
    include: {
      order: { select: { orderNumber: true } },
    },
  });

  for (const record of records) {
    const previousStatus = record.status;

    // 1. Mark status as REVERSED
    await tx.referralCommissionRecord.update({
      where: { id: record.id },
      data: {
        status: "REVERSED",
        clearedReason: reason || "Order refunded or cancelled",
      },
    });

    // 2. Adjust beneficiary wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId: record.beneficiaryId },
    });

    if (wallet) {
      const deduction = record.commissionAmount;

      if (previousStatus === "PENDING") {
        const newPending = Prisma.Decimal.max(
          0,
          wallet.pendingBalance.minus(deduction)
        );
        const newTotal = Prisma.Decimal.max(
          0,
          wallet.totalEarned.minus(deduction)
        );

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: newPending,
            totalEarned: newTotal,
          },
        });
      } else if (previousStatus === "AVAILABLE") {
        const balanceBefore = wallet.availableBalance;
        const balanceAfter = wallet.availableBalance.minus(deduction);
        const newTotal = Prisma.Decimal.max(
          0,
          wallet.totalEarned.minus(deduction)
        );

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: balanceAfter,
            totalEarned: newTotal,
          },
        });

        // Record reversal transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "ADJUSTMENT",
            status: "COMPLETED",
            amount: deduction.negated(),
            balanceBefore,
            balanceAfter,
            description: `Reversal of Level ${record.level} commission for refunded order #${record.order.orderNumber}`,
            referenceType: "COMMISSION_REVERSAL",
            referenceId: record.id,
          },
        });
      } else if (previousStatus === "PAID_OUT") {
        // Commission was already withdrawn; decrement totalEarned and record clawback ledger transaction
        const newTotal = Prisma.Decimal.max(
          0,
          wallet.totalEarned.minus(deduction)
        );

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            totalEarned: newTotal,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "ADJUSTMENT",
            status: "COMPLETED",
            amount: deduction.negated(),
            balanceBefore: wallet.availableBalance,
            balanceAfter: wallet.availableBalance,
            description: `Reversal / adjustment of paid commission for refunded order #${record.order.orderNumber}`,
            referenceType: "COMMISSION_REVERSAL",
            referenceId: record.id,
          },
        });
      }
    }
  }
}

// ==========================================
// 5. ADMIN COMMISSION CLEARANCE DASHBOARD
// ==========================================

export async function getAdminCommissionClearanceAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  filter = "all",
  search,
}: {
  page?: number;
  pageSize?: number;
  filter?: "all" | "pending" | "ready" | "available" | "reversed";
  search?: string;
} = {}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  // Run auto-clearance of matured commissions first
  try {
    await processMaturedCommissionsAction();
  } catch (err) {
    console.warn("Auto clearance check error:", err);
  }

  const now = new Date();

  // Metrics
  const [
    totalCommissionsAgg,
    pendingCommissionsAgg,
    readyToClearAgg,
    availableCommissionsAgg,
    reversedCommissionsAgg,
  ] = await Promise.all([
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: { status: { notIn: ["CANCELLED", "REVERSED"] } },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: { status: "PENDING" },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: {
        status: "PENDING",
        availableAt: { lte: now },
      },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: { status: "AVAILABLE" },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: { status: { in: ["CANCELLED", "REVERSED"] } },
    }),
  ]);

  // Filter building
  const where: Prisma.ReferralCommissionRecordWhereInput = {};

  if (filter === "pending") {
    where.status = "PENDING";
  } else if (filter === "ready") {
    where.status = "PENDING";
    where.availableAt = { lte: now };
  } else if (filter === "available") {
    where.status = "AVAILABLE";
  } else if (filter === "reversed") {
    where.status = { in: ["CANCELLED", "REVERSED"] };
  }

  if (search) {
    where.OR = [
      { beneficiary: { email: { contains: search, mode: "insensitive" } } },
      { beneficiary: { name: { contains: search, mode: "insensitive" } } },
      { beneficiary: { referralCode: { contains: search, mode: "insensitive" } } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { order: { user: { email: { contains: search, mode: "insensitive" } } } },
      { order: { user: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.referralCommissionRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        beneficiary: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            wallet: { select: { availableBalance: true, pendingBalance: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
            items: { select: { itemTitle: true } },
          },
        },
        clearedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.referralCommissionRecord.count({ where }),
  ]);

  return {
    metrics: {
      totalCount: totalCommissionsAgg._count.id,
      totalAmount: Number(totalCommissionsAgg._sum.commissionAmount || 0),
      pendingCount: pendingCommissionsAgg._count.id,
      pendingAmount: Number(pendingCommissionsAgg._sum.commissionAmount || 0),
      readyCount: readyToClearAgg._count.id,
      readyAmount: Number(readyToClearAgg._sum.commissionAmount || 0),
      availableCount: availableCommissionsAgg._count.id,
      availableAmount: Number(availableCommissionsAgg._sum.commissionAmount || 0),
      reversedCount: reversedCommissionsAgg._count.id,
      reversedAmount: Number(reversedCommissionsAgg._sum.commissionAmount || 0),
    },
    records: records.map((r) => {
      const isMatured = r.status === "PENDING" && r.availableAt && r.availableAt <= now;
      let daysRemaining = 0;
      if (r.status === "PENDING" && r.availableAt) {
        const diffMs = r.availableAt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        id: r.id,
        orderId: r.order?.id || r.orderId,
        orderNumber: r.order?.orderNumber || "N/A",
        orderAmount: Number(r.order?.totalAmount || 0),
        orderStatus: r.order?.status || "UNKNOWN",
        buyerName: r.order?.user?.name || "Student",
        buyerEmail: r.order?.user?.email || "N/A",
        courseTitle: r.order?.items?.map((i) => i.itemTitle).filter(Boolean).join(", ") || "Course",
        beneficiaryId: r.beneficiary?.id || r.beneficiaryId,
        beneficiaryName: r.beneficiary?.name || "Affiliate",
        beneficiaryEmail: r.beneficiary?.email || "N/A",
        beneficiaryCode: r.beneficiary?.referralCode || null,
        beneficiaryAvailable: Number(r.beneficiary?.wallet?.availableBalance || 0),
        level: r.level,
        ratePercentage: Number(r.rateApplied) * 100,
        commissionAmount: Number(r.commissionAmount),
        status: r.status,
        availableAt: r.availableAt,
        clearedAt: r.clearedAt,
        clearedReason: r.clearedReason,
        clearedByName: r.clearedBy?.name || r.clearedBy?.email || null,
        isMatured,
        daysRemaining,
        createdAt: r.createdAt,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ==========================================
// 6. ADMIN REFERRAL DASHBOARD QUERIES
// ==========================================

export async function getAdminReferralDashboardAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  level,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  level?: string;
  status?: string;
  search?: string;
} = {}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  // Run auto-clearance of matured commissions
  try {
    await processMaturedCommissionsAction();
  } catch (err) {
    console.warn("Auto clearance check error:", err);
  }

  // Metrics aggregation
  const [
    totalRelationships,
    totalCommissionsAgg,
    pendingCommissionsAgg,
    availableCommissionsAgg,
    levelCounts,
  ] = await Promise.all([
    prisma.referralRelationship.count({
      where: {
        referred: {
          role: "STUDENT",
        },
      },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      where: { status: { notIn: ["CANCELLED", "REVERSED"] } },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "PENDING" },
    }),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "AVAILABLE" },
    }),
    prisma.referralCommissionRecord.groupBy({
      by: ["level"],
      _sum: { commissionAmount: true },
      _count: { id: true },
      where: { status: { notIn: ["CANCELLED", "REVERSED"] } },
      orderBy: { level: "asc" },
    }),
  ]);

  // Top referrers (only real students with referred students)
  const topReferrers = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      directReferrals: {
        some: {
          referred: {
            role: "STUDENT",
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      createdAt: true,
      _count: {
        select: {
          directReferrals: {
            where: {
              referred: {
                role: "STUDENT",
              },
            },
          },
        },
      },
      wallet: {
        select: {
          totalEarned: true,
          pendingBalance: true,
          availableBalance: true,
        },
      },
    },
    orderBy: {
      directReferrals: { _count: "desc" },
    },
    take: 5,
  });

  // Commission Records Table Filter
  const where: Prisma.ReferralCommissionRecordWhereInput = {};
  if (level && level !== "all") {
    where.level = parseInt(level);
  }
  if (status && status !== "all") {
    where.status = status as Prisma.EnumCommissionStatusFilter;
  }
  if (search) {
    where.OR = [
      { beneficiary: { email: { contains: search, mode: "insensitive" } } },
      { beneficiary: { name: { contains: search, mode: "insensitive" } } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [records, totalRecords] = await Promise.all([
    prisma.referralCommissionRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        beneficiary: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
      },
    }),
    prisma.referralCommissionRecord.count({ where }),
  ]);

  return {
    metrics: {
      totalReferredStudents: totalRelationships,
      totalCommissionsAmount: Number(totalCommissionsAgg._sum.commissionAmount || 0),
      pendingCommissionsAmount: Number(pendingCommissionsAgg._sum.commissionAmount || 0),
      availableCommissionsAmount: Number(availableCommissionsAgg._sum.commissionAmount || 0),
      levelBreakdown: levelCounts.map((l) => ({
        level: l.level,
        amount: Number(l._sum.commissionAmount || 0),
        count: l._count.id,
      })),
    },
    topReferrers: topReferrers.map((u) => ({
      id: u.id,
      name: u.name || "Student",
      email: u.email,
      referralCode: u.referralCode,
      referralCount: u._count.directReferrals,
      totalEarned: Number(u.wallet?.totalEarned || 0),
    })),
    records: {
      data: records.map((r) => ({
        id: r.id,
        orderNumber: r.order.orderNumber,
        beneficiaryName: r.beneficiary.name || "Student",
        beneficiaryEmail: r.beneficiary.email,
        level: r.level,
        ratePercentage: Number(r.rateApplied) * 100,
        commissionAmount: Number(r.commissionAmount),
        status: r.status,
        createdAt: r.createdAt,
      })),
      total: totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  };
}

// ==========================================
// 7. STUDENT REFERRAL DASHBOARD QUERIES
// ==========================================

export async function getStudentReferralDashboardAction() {
  const user = await requireAuth();
  await ensureDatabaseSchemaSync();

  // Run auto-clearance of matured commissions
  try {
    await processMaturedCommissionsAction();
  } catch (err) {
    console.warn("Auto clearance check error:", err);
  }

  // 1. Fetch user's code, wallet, direct count, level stats, and next clearance date
  const [userData, directCount, levelStats, wallet, earliestPending] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true },
    }),
    prisma.referralRelationship.count({
      where: { referrerId: user.id },
    }),
    prisma.referralClosure.groupBy({
      by: ["depth"],
      where: { ancestorId: user.id },
      _count: { descendantId: true },
      orderBy: { depth: "asc" },
    }),
    prisma.wallet.findUnique({
      where: { userId: user.id },
    }),
    prisma.referralCommissionRecord.findFirst({
      where: { beneficiaryId: user.id, status: "PENDING", availableAt: { not: null } },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true, commissionAmount: true },
    }),
  ]);

  // 2. Fetch referred network tree
  const networkTree = await prisma.referralClosure.findMany({
    where: { ancestorId: user.id },
    orderBy: [{ depth: "asc" }, { descendant: { createdAt: "desc" } }],
    include: {
      descendant: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          status: true,
        },
      },
    },
    take: 50,
  });

  // 3. Fetch Student's Commission Earnings History
  const earnings = await prisma.referralCommissionRecord.findMany({
    where: { beneficiaryId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          orderNumber: true,
        },
      },
    },
    take: 20,
  });

  const referralLink = `${APP_URL}/register?ref=${userData?.referralCode || ""}`;

  return {
    referralCode: userData?.referralCode || "",
    referralLink,
    stats: {
      directReferrals: directCount,
      totalNetworkStudents: levelStats.reduce((sum, l) => sum + l._count.descendantId, 0),
      totalEarned: Number(wallet?.totalEarned || 0),
      pendingBalance: Number(wallet?.pendingBalance || 0),
      availableBalance: Number(wallet?.availableBalance || 0),
      nextClearanceDate: earliestPending?.availableAt || null,
      earliestPendingAmount: Number(earliestPending?.commissionAmount || 0),
      levelBreakdown: levelStats.map((l) => ({
        level: l.depth,
        count: l._count.descendantId,
      })),
    },
    network: networkTree.map((item) => {
      const name = item.descendant.name || "Student";
      const parts = name.trim().split(" ");
      const safeName =
        parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1][0]}.`
          : parts[0];

      return {
        id: item.descendant.id,
        name: safeName,
        level: item.depth,
        joinedAt: item.descendant.createdAt,
        status: item.descendant.status,
      };
    }),
    earningsHistory: earnings.map((e) => ({
      id: e.id,
      orderRef: e.order.orderNumber,
      level: e.level,
      ratePercentage: Number(e.rateApplied) * 100,
      amount: Number(e.commissionAmount),
      status: e.status,
      createdAt: e.createdAt,
      availableAt: e.availableAt,
    })),
  };
}
