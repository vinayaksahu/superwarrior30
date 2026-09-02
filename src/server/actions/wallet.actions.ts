"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, requireSuperAdminAction } from "@/server/dal/auth";
import {
  withdrawalRequestSchema,
  adminWithdrawalActionSchema,
  adminWalletAdjustmentSchema,
  type WithdrawalRequestInput,
  type AdminWithdrawalActionInput,
  type AdminWalletAdjustmentInput,
} from "@/lib/validations/wallet.schema";
import { PAGINATION } from "@/lib/constants";
import type { ActionState } from "@/types";
import { Prisma } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { processMaturedCommissionsAction } from "@/server/actions/referral.actions";

// ==========================================
// 1. STUDENT WALLET & TRANSACTIONS
// ==========================================

export async function getStudentWalletAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  const user = await requireAuth();

  // Run auto-clearance for matured commissions asynchronously without blocking wallet load
  processMaturedCommissionsAction().catch((err) => {
    console.warn("Auto clearance check error:", err);
  });

  // Upsert wallet for current user
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      availableBalance: new Prisma.Decimal(0.0),
      pendingBalance: new Prisma.Decimal(0.0),
      totalEarned: new Prisma.Decimal(0.0),
      totalWithdrawn: new Prisma.Decimal(0.0),
    },
  });

  const [transactions, totalTx, activeWithdrawals, earliestPending] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.walletTransaction.count({
      where: { walletId: wallet.id },
    }),
    prisma.withdrawal.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralCommissionRecord.findFirst({
      where: { beneficiaryId: user.id, status: "PENDING", availableAt: { not: null } },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true, commissionAmount: true },
    }),
  ]);

  return {
    wallet: {
      id: wallet.id,
      availableBalance: Number(wallet.availableBalance),
      pendingBalance: Number(wallet.pendingBalance),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      nextClearanceDate: earliestPending?.availableAt || null,
      earliestPendingAmount: Number(earliestPending?.commissionAmount || 0),
    },
    activeWithdrawals: activeWithdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      paymentMethod: w.paymentMethod,
      status: w.status,
      createdAt: w.createdAt,
    })),
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      description: tx.description,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId,
      createdAt: tx.createdAt,
    })),
    totalTransactions: totalTx,
    page,
    pageSize,
    totalPages: Math.ceil(totalTx / pageSize),
  };
}

export async function requestWithdrawalAction(
  data: WithdrawalRequestInput
): Promise<ActionState> {
  const user = await requireAuth();

  // Rate limit: maximum 3 withdrawal submissions per 15 minutes per student
  const { checkRateLimit } = await import("@/lib/rate-limit");
  const rateLimit = await checkRateLimit({
    key: `withdrawal:${user.id}`,
    limit: 3,
    windowSeconds: 900,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many withdrawal requests. Please wait a few minutes before submitting again.",
    };
  }

  const validated = withdrawalRequestSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid withdrawal details.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { amount, paymentMethod, upiId, accountHolderName, accountNumber, ifscCode, bankName } =
    validated.data;

  const withdrawalAmountDecimal = new Prisma.Decimal(amount.toFixed(2));

  return await prisma.$transaction(async (tx) => {
    // 0. Check dynamic minimum withdrawal threshold from settings
    const minSetting = await tx.siteSetting.findUnique({
      where: { key: "referral_min_withdrawal" },
    });
    const minAllowed = minSetting ? parseFloat(minSetting.value) || 500 : 500;
    if (amount < minAllowed) {
      return {
        success: false,
        message: `Minimum withdrawal payout request is ₹${minAllowed}.`,
      };
    }

    // 1. Check for active pending withdrawal
    const existingPending = await tx.withdrawal.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return {
        success: false,
        message: "You already have a pending withdrawal request in progress. Please wait for it to be processed.",
      };
    }

    // 2. Fetch and lock wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || wallet.availableBalance.lessThan(withdrawalAmountDecimal)) {
      return {
        success: false,
        message: `Insufficient available balance. You have ₹${Number(
          wallet?.availableBalance || 0
        ).toFixed(2)} available.`,
      };
    }

    const balanceBefore = wallet.availableBalance;
    const balanceAfter = wallet.availableBalance.minus(withdrawalAmountDecimal);

    // 3. Deduct reserved funds from available balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: balanceAfter,
      },
    });

    // 4. Build sanitized payment details JSONB
    const paymentDetails =
      paymentMethod === "upi"
        ? { upiId: upiId?.trim() }
        : {
            accountHolderName: accountHolderName?.trim(),
            accountNumber: accountNumber?.trim(),
            ifscCode: ifscCode?.trim()?.toUpperCase(),
            bankName: bankName?.trim(),
          };

    // 5. Create Withdrawal request
    const withdrawal = await tx.withdrawal.create({
      data: {
        userId: user.id,
        amount: withdrawalAmountDecimal,
        paymentMethod,
        paymentDetails,
        status: "PENDING",
      },
    });

    // 6. Record Wallet Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT_WITHDRAWAL",
        status: "PENDING",
        amount: withdrawalAmountDecimal.negated(),
        balanceBefore,
        balanceAfter,
        description: `Withdrawal request #${withdrawal.id.slice(-6)} via ${
          paymentMethod === "upi" ? "UPI" : "Bank Transfer"
        }`,
        referenceType: "WITHDRAWAL",
        referenceId: withdrawal.id,
      },
    });

    // 7. Audit log
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "WITHDRAWAL_REQUESTED",
        entityType: "Withdrawal",
        entityId: withdrawal.id,
        newValues: { amount, paymentMethod },
      },
    });

    revalidatePath("/wallet");
    revalidatePath("/admin/withdrawals");
    return {
      success: true,
      message: `Withdrawal request of ₹${amount} submitted successfully.`,
    };
  });
}

// ==========================================
// 2. ADMIN WITHDRAWAL MANAGEMENT
// ==========================================

export async function getAdminWithdrawalsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
} = {}) {
  await requireAdmin();

  const where: Prisma.WithdrawalWhereInput = {};

  if (status && status !== "all") {
    where.status = status as Prisma.EnumWithdrawalStatusFilter;
  }

  if (search) {
    where.OR = [
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { transactionRef: { contains: search, mode: "insensitive" } },
    ];
  }

  const [withdrawals, total, pendingAgg, completedAgg] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            wallet: { select: { availableBalance: true, totalWithdrawn: true } },
          },
        },
      },
    }),
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.aggregate({
      where: { status: "PENDING" },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  return {
    metrics: {
      pendingCount: pendingAgg._count.id,
      pendingAmount: Number(pendingAgg._sum.amount || 0),
      totalPaidOut: Number(completedAgg._sum.amount || 0),
    },
    data: withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.user.name || "Student",
      userEmail: w.user.email,
      amount: Number(w.amount),
      paymentMethod: w.paymentMethod,
      paymentDetails: w.paymentDetails as Record<string, unknown>,
      status: w.status,
      adminNote: w.adminNote,
      transactionRef: w.transactionRef,
      processedAt: w.processedAt,
      createdAt: w.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function processAdminWithdrawalAction(
  data: AdminWithdrawalActionInput
): Promise<ActionState> {
  const admin = await requireAdmin();

  const validated = adminWithdrawalActionSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid action parameters.",
    };
  }

  const { withdrawalId, action, adminNote, transactionRef } = validated.data;

  return await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { include: { wallet: true } } },
    });

    if (!withdrawal) {
      return { success: false, message: "Withdrawal request not found." };
    }

    if (withdrawal.status === "COMPLETED" || withdrawal.status === "REJECTED") {
      return {
        success: false,
        message: `This withdrawal is already ${withdrawal.status.toLowerCase()}.`,
      };
    }

    const wallet = withdrawal.user.wallet;
    if (!wallet) {
      return { success: false, message: "User wallet not found." };
    }

    if (action === "approve") {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "APPROVED", adminNote: adminNote || withdrawal.adminNote },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "WITHDRAWAL_APPROVED",
          entityType: "Withdrawal",
          entityId: withdrawalId,
        },
      });

      revalidatePath("/admin/withdrawals");
      return { success: true, message: "Withdrawal marked as approved." };
    }

    if (action === "complete") {
      // 1. Mark withdrawal as COMPLETED
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          processedBy: admin.id,
          transactionRef: transactionRef || null,
          adminNote: adminNote || withdrawal.adminNote,
        },
      });

      // 2. Increment wallet totalWithdrawn
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          totalWithdrawn: { increment: withdrawal.amount },
        },
      });

      // 3. Update transaction record status
      await tx.walletTransaction.updateMany({
        where: {
          referenceType: "WITHDRAWAL",
          referenceId: withdrawalId,
        },
        data: {
          status: "COMPLETED",
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "WITHDRAWAL_COMPLETED",
          entityType: "Withdrawal",
          entityId: withdrawalId,
          newValues: { transactionRef, amount: Number(withdrawal.amount) },
        },
      });

      revalidatePath("/admin/withdrawals");
      revalidatePath("/wallet");
      return { success: true, message: "Withdrawal marked as completed and paid out." };
    }

    if (action === "reject") {
      // 1. Mark withdrawal as REJECTED
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "REJECTED",
          processedAt: new Date(),
          processedBy: admin.id,
          adminNote: adminNote || "Withdrawal rejected by administrator",
        },
      });

      // 2. Restore reserved funds back to available balance
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = wallet.availableBalance.plus(withdrawal.amount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
        },
      });

      // 3. Create reversal ledger record
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ADJUSTMENT",
          status: "COMPLETED",
          amount: withdrawal.amount,
          balanceBefore,
          balanceAfter,
          description: `Restoration of rejected withdrawal #${withdrawalId.slice(-6)}: ${
            adminNote || "Rejected"
          }`,
          referenceType: "WITHDRAWAL_REVERSAL",
          referenceId: withdrawalId,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "WITHDRAWAL_REJECTED",
          entityType: "Withdrawal",
          entityId: withdrawalId,
          newValues: { reason: adminNote },
        },
      });

      revalidatePath("/admin/withdrawals");
      revalidatePath("/wallet");
      return { success: true, message: "Withdrawal rejected and reserved funds restored to student." };
    }

    return { success: false, message: "Invalid action." };
  });
}

// ==========================================
// 3. ADMIN WALLET MANAGEMENT & ADJUSTMENTS
// ==========================================

export async function getAdminWalletsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  await requireAdmin();

  const where: Prisma.WalletWhereInput = {};

  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { referralCode: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [wallets, total, systemTotals] = await Promise.all([
    prisma.wallet.findMany({
      where,
      orderBy: { availableBalance: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, referralCode: true } },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.wallet.count({ where }),
    prisma.wallet.aggregate({
      _sum: {
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
      },
    }),
  ]);

  return {
    totals: {
      availableBalance: Number(systemTotals._sum.availableBalance || 0),
      pendingBalance: Number(systemTotals._sum.pendingBalance || 0),
      totalEarned: Number(systemTotals._sum.totalEarned || 0),
      totalWithdrawn: Number(systemTotals._sum.totalWithdrawn || 0),
    },
    data: wallets.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.user.name || "Student",
      userEmail: w.user.email,
      referralCode: w.user.referralCode,
      availableBalance: Number(w.availableBalance),
      pendingBalance: Number(w.pendingBalance),
      totalEarned: Number(w.totalEarned),
      totalWithdrawn: Number(w.totalWithdrawn),
      transactionsCount: w._count.transactions,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function adminAdjustWalletAction(
  data: AdminWalletAdjustmentInput
): Promise<ActionState> {
  const admin = await requireSuperAdminAction();

  const validated = adminWalletAdjustmentSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid adjustment data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { userId, type, amount, reason } = validated.data;
  const adjustAmount = new Prisma.Decimal(amount.toFixed(2));

  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        availableBalance: new Prisma.Decimal(0.0),
        pendingBalance: new Prisma.Decimal(0.0),
        totalEarned: new Prisma.Decimal(0.0),
        totalWithdrawn: new Prisma.Decimal(0.0),
      },
    });

    const balanceBefore = wallet.availableBalance;
    const balanceAfter =
      type === "CREDIT"
        ? wallet.availableBalance.plus(adjustAmount)
        : wallet.availableBalance.minus(adjustAmount);

    if (balanceAfter.lessThan(0)) {
      return {
        success: false,
        message: `Debit exceeds available balance. Current balance is ₹${Number(balanceBefore)}.`,
      };
    }

    // Update wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: balanceAfter,
        totalEarned: type === "CREDIT" ? { increment: adjustAmount } : undefined,
      },
    });

    // Record ledger transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADJUSTMENT",
        status: "COMPLETED",
        amount: type === "CREDIT" ? adjustAmount : adjustAmount.negated(),
        balanceBefore,
        balanceAfter,
        description: `Admin manual adjustment (${type}): ${reason}`,
        referenceType: "ADMIN_ADJUSTMENT",
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "WALLET_ADJUSTED",
        entityType: "Wallet",
        entityId: wallet.id,
        newValues: { type, amount, reason, balanceBefore: Number(balanceBefore), balanceAfter: Number(balanceAfter) },
      },
    });

    revalidatePath("/admin/wallet");
    revalidatePath("/wallet");
    return { success: true, message: `Wallet adjusted successfully (${type} ₹${amount}).` };
  });
}
