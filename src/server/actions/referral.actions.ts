"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, requireSuperAdmin, requireSuperAdminAction, requirePermission } from "@/server/dal/auth";
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
            "referral_discount_type",
            "referral_discount_value",
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
  const referralDiscountType = (map.get("referral_discount_type") === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE") as "PERCENTAGE" | "FIXED_AMOUNT";
  const referralDiscountValue = map.has("referral_discount_value")
    ? parseFloat(map.get("referral_discount_value")!) || (referralDiscountType === "PERCENTAGE" ? referralDiscountPercentage : 500)
    : referralDiscountPercentage;
  const isReferralDiscountEnabled = map.has("referral_discount_enabled") ? map.get("referral_discount_enabled") === "true" : true;

  return {
    isReferralEnabled,
    holdingPeriodDays,
    minWithdrawalAmount,
    referralDiscountPercentage,
    referralDiscountType,
    referralDiscountValue,
    isReferralDiscountEnabled,
    levels: levels.map((l) => {
      const commissionType = (l.commissionType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE") as "PERCENTAGE" | "FIXED_AMOUNT";
      const commissionValue = l.commissionValue !== undefined && l.commissionValue !== null
        ? Number(l.commissionValue)
        : Number(l.commissionRate) * 100;
      return {
        id: l.id,
        level: l.level,
        commissionType,
        commissionValue,
        commissionPercentage: commissionType === "PERCENTAGE" ? commissionValue : (Number(l.commissionRate) * 100 || commissionValue),
        isEnabled: l.isEnabled,
        requiresDirectReferralQualification: l.requiresDirectReferralQualification ?? false,
        directReferralsRequired: l.directReferralsRequired ?? 0,
      };
    }),
  };
}

export async function saveReferralSettingsAction(
  data: ReferralSettingsInput
): Promise<ActionState> {
  const admin = await requirePermission("affiliate.manage");
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
    referralDiscountType = "PERCENTAGE",
    referralDiscountValue = referralDiscountPercentage,
    isReferralDiscountEnabled,
    levels,
  } = validated.data;

  const effectivePercentage =
    referralDiscountType === "PERCENTAGE" ? referralDiscountValue : referralDiscountPercentage;

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
      update: { value: effectivePercentage.toString() },
      create: {
        key: "referral_discount_percentage",
        value: effectivePercentage.toString(),
        type: "number",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_discount_type" },
      update: { value: referralDiscountType },
      create: {
        key: "referral_discount_type",
        value: referralDiscountType,
        type: "string",
      },
    });

    await tx.siteSetting.upsert({
      where: { key: "referral_discount_value" },
      update: { value: referralDiscountValue.toString() },
      create: {
        key: "referral_discount_value",
        value: referralDiscountValue.toString(),
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
      const type = (lvl.commissionType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE") as "PERCENTAGE" | "FIXED_AMOUNT";
      const val = lvl.commissionValue !== undefined ? lvl.commissionValue : lvl.commissionPercentage;
      const percentageRate = type === "PERCENTAGE" ? val : 0;
      const decimalRate = new Prisma.Decimal(
        (percentageRate / 100).toFixed(4)
      );

      await tx.referralLevel.create({
        data: {
          level: lvl.level,
          commissionRate: decimalRate,
          commissionType: type,
          commissionValue: new Prisma.Decimal(val.toFixed(2)),
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
          referralDiscountType,
          referralDiscountValue,
          isReferralDiscountEnabled,
          levels: levels.map((l) => ({
            level: l.level,
            commissionType: l.commissionType || "PERCENTAGE",
            commissionValue: l.commissionValue !== undefined ? l.commissionValue : l.commissionPercentage,
            percentage: l.commissionPercentage,
            isEnabled: l.isEnabled,
            requiresDirectReferralQualification: l.requiresDirectReferralQualification ?? false,
            directReferralsRequired: l.directReferralsRequired ?? 0,
          })),
        },
      },
    });
  });

  try {
    const { saveBrokerSettings } = await import("@/lib/broker/config");
    await saveBrokerSettings({
      referralDiscountType,
      referralDiscountValue,
      referralDiscountPercentage: effectivePercentage,
      isReferralDiscountEnabled,
    });
  } catch (e) {
    console.warn("Could not sync with broker settings:", e);
  }

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/referrals/settings");
  revalidatePath("/admin/broker-offers");
  revalidatePath("/admin/referrals/clearance");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/checkout");
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
        commissionType: lvl.commissionType || "PERCENTAGE",
        commissionValue: lvl.commissionValue !== undefined && lvl.commissionValue !== null ? Number(lvl.commissionValue) : Number(lvl.commissionRate) * 100,
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

      const commissionType = (levelConfig.commissionType || "PERCENTAGE") as "PERCENTAGE" | "FIXED_AMOUNT";
      const configuredVal = levelConfig.commissionValue !== undefined && levelConfig.commissionValue !== null
        ? Number(levelConfig.commissionValue)
        : Number(levelConfig.commissionRate) * 100;

      let commissionAmountNum = 0;
      if (commissionType === "FIXED_AMOUNT") {
        commissionAmountNum = Math.min(configuredVal, eligibleBaseAmount);
      } else {
        commissionAmountNum = Number(
          (eligibleBaseAmount * (configuredVal / 100)).toFixed(2)
        );
      }

      if (commissionAmountNum > 0) {
        const commissionAmountDecimal = new Prisma.Decimal(
          commissionAmountNum.toFixed(2)
        );

        // Calculate safe rate applied for audit history that never overflows DECIMAL(5, 4)
        const effectiveRate = eligibleBaseAmount > 0
          ? Math.min(0.9999, Math.max(0, commissionAmountNum / eligibleBaseAmount))
          : 0;
        const rateAppliedDecimal = new Prisma.Decimal(effectiveRate.toFixed(4));

        // A. Create commission record with unique constraint protection & availableAt
        const record = await tx.referralCommissionRecord.create({
          data: {
            snapshotId: snapshot.id,
            orderId: order.id,
            beneficiaryId: matchingAncestor.ancestorId,
            level: levelConfig.level,
            rateApplied: rateAppliedDecimal,
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

  // Process matured commissions in parallel (batch of 5 at a time)
  const batchSize = 5;
  for (let i = 0; i < maturedCommissions.length; i += batchSize) {
    const batch = maturedCommissions.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (commission) => {
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
      })
    );
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

// ==========================================
// 12. AFFILIATE PROMOTIONAL MATERIALS
// ==========================================

export type PromotionalMaterialType =
  | "BANNER"
  | "WHATSAPP"
  | "TELEGRAM"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TEXT";

export interface AffiliatePromotionalMaterial {
  id: string;
  title: string;
  type: PromotionalMaterialType;
  description?: string;
  imageUrl?: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_AFFILIATE_MATERIALS: AffiliatePromotionalMaterial[] = [
  {
    id: "default-mat-1",
    title: "WhatsApp Institutional Trading Invite",
    type: "WHATSAPP",
    description: "High-converting short copy for WhatsApp chats, status, and direct broadcast",
    imageUrl: "/logo.png",
    content: `🚀 *Master Institutional Price Action with Super Warrior 30!*

Stop gambling with lagging indicators. Learn real institutional market structure, liquidity sweeps & high-probability setups from professional traders! 📊📈

✅ Daily Live Market Analysis & Setups
✅ Full SMC, Liquidity & Risk Management Roadmap
🎁 *Exclusive Referral Discount Applied!*

👉 *Enroll now with my link:*
{AFFILIATE_LINK}

Referral Code: *{REFERRAL_CODE}*
Let's grow together! 🔥`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-mat-2",
    title: "Telegram Channel & Group Share",
    type: "TELEGRAM",
    description: "Detailed pitch formatted for Telegram trading groups and channels",
    imageUrl: "/logo.png",
    content: `🔥 **Super Warrior 30 Trading Mentorship — Level Up Your Trading**

Ready to turn your trading consistent? Join India's top institutional price action academy:

🔹 Market Structure (HH, HL, LH, LL) mastery
🔹 Institutional Liquidity & Order Flow concepts
🔹 Proven Risk-Reward Management
🔹 Live Trade Journal & Psychology Mastery

🎁 **Claim your referral bonus & join now:**
👉 {AFFILIATE_LINK}

Use my invite code: \`{REFERRAL_CODE}\``,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-mat-3",
    title: "Instagram Caption & Story Hook",
    type: "INSTAGRAM",
    description: "Engaging caption for Instagram Reels, Posts, and Story link stickers",
    imageUrl: "/logo.png",
    content: `Trading is not about guessing, it is about understanding WHERE the liquidity rests. 📉📈

If you want to trade with the banks and smart money instead of being their liquidity, checkout Super Warrior 30.

🔗 Click the link in bio or visit:
{AFFILIATE_LINK}
(Use invite code: {REFERRAL_CODE} for a special discount)

#trading #priceaction #smartmoneyconcepts #forextrading #nifty50 #banknifty #superwarrior30`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-mat-4",
    title: "Facebook Trading Community Recommendation",
    type: "FACEBOOK",
    description: "Detailed recommendation for Facebook trading groups, profiles, and communities",
    imageUrl: "/logo.png",
    content: `For everyone in the group asking where to learn real price action and institutional order flow:

I strongly recommend checking out Super Warrior 30 Trading Academy. The structured modules, real live trade proofs, and complete risk management frameworks are top-tier.

You can claim a direct discount using my invitation link:
{AFFILIATE_LINK}
Referral Code: {REFERRAL_CODE}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-mat-5",
    title: "Official Academy Masterclass Banner",
    type: "BANNER",
    description: "Official branded promotional banner for sharing across social feeds and web",
    imageUrl: "/logo.png",
    content: `Super Warrior 30 — Complete Professional Trading Masterclass.
Get instant access with my student referral bonus:
{AFFILIATE_LINK}
Code: {REFERRAL_CODE}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getAffiliateMaterialsAction(
  includeInactive = false
): Promise<AffiliatePromotionalMaterial[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "affiliate_promotional_materials" },
    });

    let materials: AffiliatePromotionalMaterial[] = [];
    if (setting && setting.value) {
      try {
        materials = JSON.parse(setting.value);
      } catch {
        materials = DEFAULT_AFFILIATE_MATERIALS;
      }
    } else {
      materials = DEFAULT_AFFILIATE_MATERIALS;
      // Auto-seed default materials for future quick edits
      prisma.siteSetting
        .upsert({
          where: { key: "affiliate_promotional_materials" },
          update: { value: JSON.stringify(DEFAULT_AFFILIATE_MATERIALS) },
          create: {
            key: "affiliate_promotional_materials",
            value: JSON.stringify(DEFAULT_AFFILIATE_MATERIALS),
            type: "json",
          },
        })
        .catch(() => {});
    }

    if (!Array.isArray(materials)) {
      materials = DEFAULT_AFFILIATE_MATERIALS;
    }

    if (!includeInactive) {
      materials = materials.filter((m) => m.isActive !== false);
    }

    return materials;
  } catch (error) {
    console.error("Error fetching affiliate promotional materials:", error);
    return DEFAULT_AFFILIATE_MATERIALS.filter((m) => includeInactive || m.isActive);
  }
}

export async function saveAffiliateMaterialAction(data: {
  id?: string;
  title: string;
  type: PromotionalMaterialType;
  description?: string;
  imageUrl?: string;
  content: string;
  isActive?: boolean;
}): Promise<ActionState> {
  try {
    await requireAdmin();

    if (!data.title?.trim() || !data.content?.trim()) {
      return {
        success: false,
        message: "Title and message content are required.",
      };
    }

    const currentMaterials = await getAffiliateMaterialsAction(true);
    const now = new Date().toISOString();

    let finalImageUrl = data.imageUrl?.trim() || undefined;

    // Ensure all images are stored on Bunny Storage & served via Bunny CDN
    if (finalImageUrl && finalImageUrl.startsWith("http")) {
      try {
        const { getResolvedBunnyConfig, uploadToBunnyStorage } = await import("@/lib/bunny");
        const bunnyConfig = await getResolvedBunnyConfig();
        const isBunnyUrl =
          (bunnyConfig.cdnHostname && finalImageUrl.includes(bunnyConfig.cdnHostname)) ||
          finalImageUrl.includes("b-cdn.net");

        if (!isBunnyUrl && bunnyConfig.storageZoneName && bunnyConfig.storagePassword) {
          const fetchRes = await fetch(finalImageUrl);
          if (fetchRes.ok) {
            const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            const ext = contentType.includes("png")
              ? "png"
              : contentType.includes("webp")
              ? "webp"
              : contentType.includes("gif")
              ? "gif"
              : "jpg";
            const uniqueId = crypto.randomUUID();
            const storagePath = `affiliate/materials/${uniqueId}.${ext}`;
            const uploadResult = await uploadToBunnyStorage(storagePath, buffer, contentType);
            if (uploadResult?.cdnUrl) {
              finalImageUrl = uploadResult.cdnUrl;
            }
          }
        }
      } catch (err) {
        console.warn("Could not automatically transfer image to Bunny Storage:", err);
      }
    }

    let updatedMaterials: AffiliatePromotionalMaterial[];

    if (data.id) {
      // Update existing
      updatedMaterials = currentMaterials.map((m) => {
        if (m.id === data.id) {
          return {
            ...m,
            title: data.title.trim(),
            type: data.type,
            description: data.description?.trim() || "",
            imageUrl: finalImageUrl,
            content: data.content.trim(),
            isActive: data.isActive !== undefined ? data.isActive : m.isActive,
            updatedAt: now,
          };
        }
        return m;
      });
    } else {
      // Add new
      const newMaterial: AffiliatePromotionalMaterial = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: data.title.trim(),
        type: data.type,
        description: data.description?.trim() || "",
        imageUrl: finalImageUrl,
        content: data.content.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: now,
        updatedAt: now,
      };
      updatedMaterials = [newMaterial, ...currentMaterials];
    }

    await prisma.siteSetting.upsert({
      where: { key: "affiliate_promotional_materials" },
      update: { value: JSON.stringify(updatedMaterials) },
      create: {
        key: "affiliate_promotional_materials",
        value: JSON.stringify(updatedMaterials),
        type: "json",
      },
    });

    revalidatePath("/admin/referrals");
    revalidatePath("/admin/referrals/materials");
    revalidatePath("/referrals");

    return {
      success: true,
      message: data.id ? "Promotional material updated!" : "Promotional material created!",
    };
  } catch (error) {
    console.error("Error saving promotional material:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save promotional material.",
    };
  }
}

export async function deleteAffiliateMaterialAction(id: string): Promise<ActionState> {
  try {
    await requireAdmin();

    const currentMaterials = await getAffiliateMaterialsAction(true);
    const filtered = currentMaterials.filter((m) => m.id !== id);

    await prisma.siteSetting.upsert({
      where: { key: "affiliate_promotional_materials" },
      update: { value: JSON.stringify(filtered) },
      create: {
        key: "affiliate_promotional_materials",
        value: JSON.stringify(filtered),
        type: "json",
      },
    });

    revalidatePath("/admin/referrals");
    revalidatePath("/admin/referrals/materials");
    revalidatePath("/referrals");

    return {
      success: true,
      message: "Promotional material deleted successfully.",
    };
  } catch (error) {
    console.error("Error deleting promotional material:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete promotional material.",
    };
  }
}

export async function toggleAffiliateMaterialStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    await requireAdmin();

    const currentMaterials = await getAffiliateMaterialsAction(true);
    const updated = currentMaterials.map((m) =>
      m.id === id ? { ...m, isActive, updatedAt: new Date().toISOString() } : m
    );

    await prisma.siteSetting.upsert({
      where: { key: "affiliate_promotional_materials" },
      update: { value: JSON.stringify(updated) },
      create: {
        key: "affiliate_promotional_materials",
        value: JSON.stringify(updated),
        type: "json",
      },
    });

    revalidatePath("/admin/referrals");
    revalidatePath("/admin/referrals/materials");
    revalidatePath("/referrals");

    return {
      success: true,
      message: isActive ? "Material activated." : "Material deactivated.",
    };
  } catch (error) {
    console.error("Error toggling material status:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to toggle status.",
    };
  }
}

