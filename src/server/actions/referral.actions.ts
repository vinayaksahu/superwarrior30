"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/server/dal/auth";
import { referralSettingsSchema, type ReferralSettingsInput } from "@/lib/validations/referral.schema";
import { PAGINATION, APP_URL } from "@/lib/constants";
import type { ActionState } from "@/types";
import { Prisma } from "@/generated/prisma";

// ==========================================
// 1. ADMIN REFERRAL SETTINGS
// ==========================================

export async function getReferralSettingsAction() {
  await requireAdmin();

  const [globalSetting, levels] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { key: "referral_enabled" },
    }),
    prisma.referralLevel.findMany({
      orderBy: { level: "asc" },
    }),
  ]);

  const isReferralEnabled = globalSetting ? globalSetting.value === "true" : true;

  return {
    isReferralEnabled,
    levels: levels.map((l) => ({
      id: l.id,
      level: l.level,
      commissionPercentage: Number(l.commissionRate) * 100,
      isEnabled: l.isEnabled,
    })),
  };
}

export async function saveReferralSettingsAction(
  data: ReferralSettingsInput
): Promise<ActionState> {
  const admin = await requireAdmin();

  const validated = referralSettingsSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid referral settings.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { isReferralEnabled, levels } = validated.data;

  await prisma.$transaction(async (tx) => {
    // 1. Update global toggle
    await tx.siteSetting.upsert({
      where: { key: "referral_enabled" },
      update: { value: isReferralEnabled ? "true" : "false" },
      create: {
        key: "referral_enabled",
        value: isReferralEnabled ? "true" : "false",
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
          levels: levels.map((l) => ({
            level: l.level,
            percentage: l.commissionPercentage,
            isEnabled: l.isEnabled,
          })),
        },
      },
    });
  });

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/referrals/settings");
  revalidatePath("/dashboard/referrals");

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

  // 3. Check global referral toggle
  const globalSetting = await tx.siteSetting.findUnique({
    where: { key: "referral_enabled" },
  });
  if (globalSetting && globalSetting.value === "false") {
    return;
  }

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
      const commissionAmountNum = Number(
        (eligibleBaseAmount * Number(levelConfig.commissionRate)).toFixed(2)
      );

      if (commissionAmountNum > 0) {
        const commissionAmountDecimal = new Prisma.Decimal(
          commissionAmountNum.toFixed(2)
        );

        // A. Create commission record with unique constraint protection
        const record = await tx.referralCommissionRecord.create({
          data: {
            snapshotId: snapshot.id,
            orderId: order.id,
            beneficiaryId: matchingAncestor.ancestorId,
            level: levelConfig.level,
            rateApplied: levelConfig.commissionRate,
            commissionAmount: commissionAmountDecimal,
            status: "PENDING",
          },
        });

        // B. Update Beneficiary Wallet
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
          },
        });

        // C. Record Wallet Transaction
        await tx.walletTransaction.create({
          data: {
            walletId: beneficiaryWallet.id,
            type: "CREDIT_COMMISSION",
            status: "COMPLETED",
            amount: commissionAmountDecimal,
            balanceBefore: beneficiaryWallet.availableBalance,
            balanceAfter: beneficiaryWallet.availableBalance,
            description: `Level ${levelConfig.level} referral commission from order ${order.orderNumber}`,
            referenceType: "COMMISSION",
            referenceId: record.id,
          },
        });
      }
    }
  }
}

// ==========================================
// 3. REVERSAL ENGINE (FOR REFUNDS)
// ==========================================

export async function reverseOrderCommissions(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  // Find all active/pending commission records for this order
  const records = await tx.referralCommissionRecord.findMany({
    where: {
      orderId,
      status: { in: ["PENDING", "AVAILABLE"] },
    },
  });

  for (const record of records) {
    // 1. Mark status as CANCELLED
    await tx.referralCommissionRecord.update({
      where: { id: record.id },
      data: { status: "CANCELLED" },
    });

    // 2. Adjust beneficiary wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId: record.beneficiaryId },
    });

    if (wallet) {
      const deduction = record.commissionAmount;
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

      // 3. Record reversal transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ADJUSTMENT",
          status: "COMPLETED",
          amount: deduction.negated(),
          balanceBefore: wallet.availableBalance,
          balanceAfter: wallet.availableBalance,
          description: `Reversal of Level ${record.level} commission for refunded order`,
          referenceType: "COMMISSION_REVERSAL",
          referenceId: record.id,
        },
      });
    }
  }
}

// ==========================================
// 4. ADMIN REFERRAL DASHBOARD QUERIES
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

  // Metrics aggregation
  const [
    totalRelationships,
    totalCommissionsAgg,
    pendingCommissionsAgg,
    availableCommissionsAgg,
    levelCounts,
  ] = await Promise.all([
    prisma.referralRelationship.count(),
    prisma.referralCommissionRecord.aggregate({
      _sum: { commissionAmount: true },
      where: { status: { not: "CANCELLED" } },
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
      where: { status: { not: "CANCELLED" } },
      orderBy: { level: "asc" },
    }),
  ]);

  // Top referrers
  const topReferrers = await prisma.user.findMany({
    where: {
      directReferrals: { some: {} },
    },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      createdAt: true,
      _count: { select: { directReferrals: true } },
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
// 5. STUDENT REFERRAL DASHBOARD QUERIES
// ==========================================

export async function getStudentReferralDashboardAction() {
  const user = await requireAuth();

  // 1. Fetch user's code & wallet
  const [userData, directCount, levelStats, wallet] = await Promise.all([
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
  ]);

  // 2. Fetch referred network tree (Sanitized: only safe display info, NO emails or secrets)
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
      levelBreakdown: levelStats.map((l) => ({
        level: l.depth,
        count: l._count.descendantId,
      })),
    },
    network: networkTree.map((item) => {
      const name = item.descendant.name || "Student";
      // Safe display: "John D."
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
    })),
  };
}
