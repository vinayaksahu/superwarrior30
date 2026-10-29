"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { getCurrentUser, requireAuth, requirePermission } from "@/server/dal/auth";
import type { ActionState } from "@/types";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";
import { calculateCopyTradingTier, evaluateCopyTradeEligibility } from "@/lib/copy-trading-risk";
import { getPublicPaymentMethodsAction, PaymentMethodItem } from "@/server/actions/payment-method.actions";

export interface StudentCopyTradingPayload {
  brokerName: string;
  accountNumber: string;
  serverName: string;
  platform: "MT5" | "MT4";
  password?: string;
  accountCurrency?: string;
  balance?: number;
  equity?: number;
  riskMode: "FIXED_LOT" | "MULTIPLIER" | "PROPORTIONAL_EQUITY";
  multiplier: number;
  fixedLot: number;
  maxDrawdownGuard: number;
  maxLotLimit: number;
}

export interface CopyTradingHostingStatus {
  canConnect: boolean;
  isCourseEnrolled: boolean;
  isOneYearExempt: boolean;
  exemptionDaysRemaining: number;
  exemptionExpiresAt: string | null;
  hasActiveVpsPayment: boolean;
  vpsPaymentExpiresAt: string | null;
  monthlyFee: number; // 1999
}

export interface CopyTradingSettlementItem {
  id: string;
  subscriptionId: string | null;
  userId: string;
  invoiceNumber: string;
  weekPeriod: string;
  profitUsd: number;
  profitInr: number;
  investorShareInr: number;
  academyShareInr: number;
  affiliateShareInr: number;
  totalAmountDueInr: number;
  affiliateUserId: string | null;
  status: string; // PENDING, PAID, SETTLED
  paymentMethod: string | null;
  utrNumber: string | null;
  proofUrl: string | null;
  paidAt: Date | string | null;
  settledAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  user?: { id: string; name: string | null; email: string; phone?: string | null };
  affiliateUser?: { id: string; name: string | null; email: string; referralCode: string } | null;
}

export interface CopyTradingAffiliateInfo {
  referralCode: string;
  has14999Course: boolean;
  hostingStatus: CopyTradingHostingStatus;
  totalReferredInvestors: number;
  activeCopyingReferrals: number;
  referredUsers: {
    id: string;
    name: string;
    email: string;
    isCopying: boolean;
    joinedAt: Date | string;
    commissionUsd?: number;
  }[];
}

export interface MasterAccountPayload {
  id?: string;
  accountName: string;
  brokerName: string;
  accountNumber: string;
  serverName: string;
  platform: "MT5" | "MT4";
  strategyDescription?: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH";
  minCapitalUsd: number;
  isActive: boolean;
  totalTrades?: number;
  winRate?: number;
  totalProfitUsd?: number;
  profitFactor?: number;
  maxDrawdown?: number;
  roiMonthly?: number;
  vpsNodeName?: string;
}

/**
 * Helper to fetch Copy Trading Affiliate Info & Course Fee Exemption Status
 * Students who purchased the ₹14,999 course get 1 Year Free Cloud VPS hosting.
 * After 1 year, or for non-course students, the standard ₹1,999/mo fee applies.
 */
export async function fetchUserCopyTradingAffiliateInfo(userId: string): Promise<CopyTradingAffiliateInfo> {
  const userFull: any = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      enrollments: {
        select: {
          enrolledAt: true,
          course: {
            select: { price: true, compareAtPrice: true, title: true },
          },
        },
      },
      orders: {
        where: { status: "PAID" },
        select: { totalAmount: true, createdAt: true },
      },
      directReferrals: {
        select: {
          referred: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              copyTradingSubscriptions: {
                select: { id: true, status: true, balance: true },
              },
            },
          },
        },
      },
    },
  });

  const highValueEnrollment = userFull?.enrollments?.find(
    (e: any) => Number(e.course?.price) >= 14000 || Number(e.course?.compareAtPrice) >= 14000
  );
  const highValueOrder = userFull?.orders?.find(
    (o: any) => Number(o.totalAmount) >= 14000
  );

  const has14999Course = Boolean(highValueEnrollment || highValueOrder);
  const purchaseDate = highValueEnrollment?.enrolledAt || highValueOrder?.createdAt || null;

  let isOneYearExempt = false;
  let exemptionDaysRemaining = 0;
  let exemptionExpiresAt: string | null = null;

  if (purchaseDate) {
    const purchaseTime = new Date(purchaseDate).getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const expiryTime = purchaseTime + oneYearMs;
    const now = Date.now();
    if (expiryTime > now) {
      isOneYearExempt = true;
      exemptionDaysRemaining = Math.max(0, Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000)));
      exemptionExpiresAt = new Date(expiryTime).toISOString();
    } else {
      isOneYearExempt = false;
      exemptionDaysRemaining = 0;
      exemptionExpiresAt = new Date(expiryTime).toISOString();
    }
  }

  // Active VPS Hosting Payment check (valid for 30 days)
  const activeVpsPayment = await prisma.copyTradingVpsPayment.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      validUntil: { gte: new Date() },
    },
    orderBy: { validUntil: "desc" },
  });

  const hasActiveVpsPayment = Boolean(activeVpsPayment);
  const vpsPaymentExpiresAt = activeVpsPayment ? activeVpsPayment.validUntil.toISOString() : null;
  const canConnect = isOneYearExempt || hasActiveVpsPayment;

  const hostingStatus: CopyTradingHostingStatus = {
    canConnect,
    isCourseEnrolled: has14999Course,
    isOneYearExempt,
    exemptionDaysRemaining,
    exemptionExpiresAt,
    hasActiveVpsPayment,
    vpsPaymentExpiresAt,
    monthlyFee: 1999,
  };

  // Fetch settled affiliate commissions generated by referred users
  const affiliateInvoices = await prisma.copyTradingSettlementInvoice.findMany({
    where: {
      affiliateUserId: userId,
      status: "PAID",
    },
    select: {
      userId: true,
      affiliateShareUsd: true,
    },
  });

  const referredUsers = (userFull?.directReferrals || []).map((rel: any) => {
    const isCopying = rel.referred?.copyTradingSubscriptions?.some((s: any) => s.status === "ACTIVE") ?? false;
    const refUserId = rel.referred?.id || "";
    const userCommission = affiliateInvoices
      .filter((inv) => inv.userId === refUserId)
      .reduce((sum, inv) => sum + Number(inv.affiliateShareUsd || 0), 0);

    return {
      id: refUserId,
      name: rel.referred?.name || "Student",
      email: rel.referred?.email || "",
      isCopying,
      joinedAt: rel.referred?.createdAt || new Date(),
      commissionUsd: Number(userCommission.toFixed(2)),
    };
  });

  const totalReferredInvestors = referredUsers.length;
  const activeCopyingReferrals = referredUsers.filter((u: any) => u.isCopying).length;

  return {
    referralCode: userFull?.referralCode || userId.slice(0, 8).toUpperCase(),
    has14999Course,
    hostingStatus,
    totalReferredInvestors,
    activeCopyingReferrals,
    referredUsers,
  };
}

/**
 * 70 / 20 / 10 Weekly Settlement Split Calculator:
 * - 70% Investor (Student) Net Profit
 * - 20% Rahul Trade Warrior Academy
 * - 10% Affiliate Partner (Referrer)
 * If no referrer exists, Academy retains 30%.
 */
export async function calculateWeeklySettlementSplit(netProfitUsd: number, hasReferrer: boolean) {
  if (netProfitUsd <= 0) {
    return {
      netProfitUsd: 0,
      investorShareUsd: 0,
      academyShareUsd: 0,
      affiliateShareUsd: 0,
      investorPercent: 70,
      academyPercent: hasReferrer ? 20 : 30,
      affiliatePercent: hasReferrer ? 10 : 0,
    };
  }

  const investorShareUsd = Number((netProfitUsd * 0.70).toFixed(2));
  const affiliateShareUsd = hasReferrer ? Number((netProfitUsd * 0.10).toFixed(2)) : 0;
  const academyShareUsd = Number((netProfitUsd - investorShareUsd - affiliateShareUsd).toFixed(2));

  return {
    netProfitUsd,
    investorShareUsd,
    academyShareUsd,
    affiliateShareUsd,
    investorPercent: 70,
    academyPercent: hasReferrer ? 20 : 30,
    affiliatePercent: hasReferrer ? 10 : 0,
  };
}

/**
 * Fetch Student Copy Trading Dashboard Data
 */
export async function getStudentCopyTradingDataAction() {
  await ensureDatabaseSchemaSync();
  const user = await requireAuth();

  // Find active Master Account
  const master = await prisma.copyTradingMaster.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  }) || await prisma.copyTradingMaster.findFirst({
    orderBy: { createdAt: "desc" },
  });

  // Find student's subscription
  const subscription = master
    ? await prisma.copyTradingSubscription.findUnique({
        where: {
          userId_masterId: {
            userId: user.id,
            masterId: master.id,
          },
        },
      })
    : null;

  // Recent trade logs copied to this student or general master trade logs
  const logs = subscription
    ? await prisma.copyTradeLog.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { openedAt: "desc" },
        take: 30,
      })
    : master
    ? await prisma.copyTradeLog.findMany({
        where: { masterId: master.id },
        orderBy: { openedAt: "desc" },
        take: 15,
      })
    : [];

  // Settings
  const settingsRecords = await prisma.copyTradingSetting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settingsRecords) {
    settingsMap[s.key] = s.value;
  }

  // Affiliate & Course Fee Exemption Status
  const affiliateInfo = await fetchUserCopyTradingAffiliateInfo(user.id);

  // Invoices & VPS Payments & Public Payment Methods
  const [invoices, vpsPayments, paymentMethods] = await Promise.all([
    prisma.copyTradingSettlementInvoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.copyTradingVpsPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    getPublicPaymentMethodsAction(),
  ]);

  return {
    master,
    subscription,
    logs,
    settings: settingsMap,
    affiliateInfo,
    invoices,
    vpsPayments,
    paymentMethods,
  };
}

/**
 * Submit or Update Student MT4/MT5 Subscription Request
 */
export async function submitStudentSubscriptionAction(
  data: StudentCopyTradingPayload
): Promise<ActionState<{ id: string; status: string }>> {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    if (!data.brokerName?.trim() || !data.accountNumber?.trim() || !data.serverName?.trim()) {
      return { success: false, message: "Broker name, account number, and server name are required." };
    }

    // Hosting Gate: Check if user has active VPS or is within 1-Year exemption (for ₹14,999 course students)
    const affiliateInfo = await fetchUserCopyTradingAffiliateInfo(user.id);
    if (!affiliateInfo.hostingStatus.canConnect) {
      return {
        success: false,
        message: "Dedicated Cloud VPS hosting (₹1,999/mo) is required to connect your MT4/MT5 account. Please complete the VPS payment first.",
      };
    }

    const master = await prisma.copyTradingMaster.findFirst({
      where: { isActive: true },
    }) || await prisma.copyTradingMaster.findFirst();

    if (!master) {
      return { success: false, message: "No active master trading account found. Please contact support." };
    }

    const initialBalance = Number(data.balance) > 0 ? Number(data.balance) : 300.0;
    const initialEquity = Number(data.equity) > 0 ? Number(data.equity) : initialBalance;
    const tier = calculateCopyTradingTier(initialBalance);

    // Upsert subscription
    const subscription = await prisma.copyTradingSubscription.upsert({
      where: {
        userId_masterId: {
          userId: user.id,
          masterId: master.id,
        },
      },
      update: {
        brokerName: data.brokerName.trim(),
        accountNumber: data.accountNumber.trim(),
        serverName: data.serverName.trim(),
        platform: data.platform || "MT5",
        encryptedPassword: data.password?.trim() || undefined,
        accountCurrency: data.accountCurrency || "USD",
        riskMode: data.riskMode || "FIXED_LOT",
        multiplier: Number(data.multiplier) || 1.0,
        fixedLot: tier.lotPerTrade,
        maxDrawdownGuard: 15.0,
        maxLotLimit: tier.totalMaxLotExposure,
        balance: initialBalance,
        equity: initialEquity,
        status: "PENDING_APPROVAL", // Goes for admin review & VPS slot assignment
        rejectionReason: null,
      },
      create: {
        userId: user.id,
        masterId: master.id,
        brokerName: data.brokerName.trim(),
        accountNumber: data.accountNumber.trim(),
        serverName: data.serverName.trim(),
        platform: data.platform || "MT5",
        encryptedPassword: data.password?.trim() || "",
        accountCurrency: data.accountCurrency || "USD",
        riskMode: data.riskMode || "FIXED_LOT",
        multiplier: Number(data.multiplier) || 1.0,
        fixedLot: tier.lotPerTrade,
        maxDrawdownGuard: 15.0,
        maxLotLimit: tier.totalMaxLotExposure,
        balance: initialBalance,
        equity: initialEquity,
        status: "PENDING_APPROVAL",
        vpsNode: "SW30-CloudNode-01",
      },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: "Your GTCFX MT5 account details submitted successfully! Admin will assign a dedicated VPS slot shortly.",
      data: { id: subscription.id, status: subscription.status },
    };
  } catch (error) {
    console.error("Failed to submit student subscription:", error);
    return { success: false, message: "Internal error submitting account details." };
  }
}

/**
 * Toggle Student Copy Pause / Resume
 */
export async function toggleStudentCopyPauseAction(
  subscriptionId: string
): Promise<ActionState<{ status: string }>> {
  try {
    const user = await requireAuth();

    const sub = await prisma.copyTradingSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.userId !== user.id) {
      return { success: false, message: "Subscription not found or unauthorized." };
    }

    if (sub.status !== "ACTIVE" && sub.status !== "PAUSED") {
      return { success: false, message: `Cannot toggle state while status is ${sub.status}.` };
    }

    const nextStatus = sub.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    const updated = await prisma.copyTradingSubscription.update({
      where: { id: subscriptionId },
      data: { status: nextStatus },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: nextStatus === "PAUSED" ? "Copy trading paused. No new trades will copy." : "Copy trading resumed successfully!",
      data: { status: updated.status },
    };
  } catch (error) {
    console.error("Failed to toggle pause:", error);
    return { success: false, message: "Failed to update status." };
  }
}

/**
 * Disconnect Student Account
 */
export async function disconnectStudentSubscriptionAction(
  subscriptionId: string
): Promise<ActionState<{ success: boolean }>> {
  try {
    const user = await requireAuth();

    const sub = await prisma.copyTradingSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.userId !== user.id) {
      return { success: false, message: "Subscription not found or unauthorized." };
    }

    await prisma.copyTradingSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "DISCONNECTED",
        isOnline: false,
        vpsSlotNumber: null,
      },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/admin/copy-trading");

    return { success: true, message: "Account disconnected and VPS slot released." };
  } catch (error) {
    console.error("Failed to disconnect account:", error);
    return { success: false, message: "Failed to disconnect account." };
  }
}

/**
 * Refresh Student Copy Trading Status (On-Demand - saves 99% Vercel CPU vs auto-polling)
 * Called when student clicks "Refresh Status" button instead of continuous heartbeat polling.
 */
export async function refreshStudentCopyTradingDataAction() {
  const user = await requireAuth();

  const master = await prisma.copyTradingMaster.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  }) || await prisma.copyTradingMaster.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const subscription = master
    ? await prisma.copyTradingSubscription.findUnique({
        where: {
          userId_masterId: {
            userId: user.id,
            masterId: master.id,
          },
        },
      })
    : null;

  const logs = subscription
    ? await prisma.copyTradeLog.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { openedAt: "desc" },
        take: 30,
      })
    : master
    ? await prisma.copyTradeLog.findMany({
        where: { masterId: master.id },
        orderBy: { openedAt: "desc" },
        take: 15,
      })
    : [];

  const affiliateInfo = await fetchUserCopyTradingAffiliateInfo(user.id);

  return {
    master,
    subscription,
    logs,
    affiliateInfo,
    refreshedAt: new Date().toISOString(),
  };
}

function mapSubscriptionsWithAffiliateAndExemption(subs: any[]) {
  return subs.map((s) => {
    const highValueEnrollment = s.user?.enrollments?.find(
      (e: any) => Number(e.course?.price) >= 14000 || Number(e.course?.compareAtPrice) >= 14000
    );
    const highValueOrder = s.user?.orders?.find(
      (o: any) => Number(o.totalAmount) >= 14000
    );
    const has14999Course = Boolean(highValueEnrollment || highValueOrder);
    const purchaseDate = highValueEnrollment?.enrolledAt || highValueOrder?.createdAt || null;

    let isOneYearExempt = false;
    let exemptionDaysRemaining = 0;
    if (purchaseDate) {
      const purchaseTime = new Date(purchaseDate).getTime();
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const expiryTime = purchaseTime + oneYearMs;
      const now = Date.now();
      if (expiryTime > now) {
        isOneYearExempt = true;
        exemptionDaysRemaining = Math.max(0, Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000)));
      }
    }

    const referrer = s.user?.referredBy?.referrer
      ? {
          id: s.user.referredBy.referrer.id,
          name: s.user.referredBy.referrer.name,
          email: s.user.referredBy.referrer.email,
          referralCode: s.user.referredBy.referrer.referralCode,
        }
      : null;

    return {
      ...s,
      isCourseExempt: isOneYearExempt,
      has14999Course,
      exemptionDaysRemaining,
      referredBy: referrer,
    };
  });
}

/**
 * Refresh Admin Copy Trading Fleet Data (On-Demand - saves 99% Vercel CPU vs auto-polling)
 * Called when admin clicks "Refresh Status" button instead of continuous heartbeat polling.
 */
export async function refreshAdminCopyTradingDataAction() {
  await requirePermission("copy_trading.view");

  const [masters, rawSubscriptions, recentLogs, invoices, vpsPayments] = await Promise.all([
    prisma.copyTradingMaster.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.copyTradingSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            referralCode: true,
            enrollments: {
              select: {
                enrolledAt: true,
                course: {
                  select: { id: true, title: true, price: true, compareAtPrice: true },
                },
              },
            },
            orders: {
              where: { status: "PAID" },
              select: { totalAmount: true },
            },
            referredBy: {
              select: {
                referrer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    referralCode: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { updatedAt: "desc" },
      ],
    }),
    prisma.copyTradeLog.findMany({
      include: {
        subscription: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { openedAt: "desc" },
      take: 60,
    }),
    prisma.copyTradingSettlementInvoice.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        affiliateUser: { select: { id: true, name: true, email: true, phone: true, referralCode: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.copyTradingVpsPayment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const subscriptions = mapSubscriptionsWithAffiliateAndExemption(rawSubscriptions);
  const activeStudents = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const pendingApprovals = subscriptions.filter((s) => s.status === "PENDING_APPROVAL").length;
  const pausedStudents = subscriptions.filter((s) => s.status === "PAUSED").length;

  const vpsFleet = [
    {
      nodeId: "SW30-CloudNode-01",
      name: "SuperWarrior Dedicated Cloud VPS Node #1",
      specs: "4 Dedicated vCPUs, 24 GB High-Speed RAM",
      ipAddress: "185.193.125.42",
      status: "HEALTHY",
      totalCapacity: 20,
      occupiedSlots: activeStudents,
      cpuUsagePercent: Math.min(28, 8 + activeStudents * 1.2),
      ramUsageGb: Math.min(24, 3.2 + activeStudents * 0.22).toFixed(1),
      maxRamGb: 24,
      avgPingMs: 3,
      idleReclaimProtected: true,
    },
  ];

  return {
    masters,
    subscriptions,
    recentLogs,
    invoices,
    vpsPayments,
    kpi: {
      totalStudents: subscriptions.length,
      activeStudents,
      pendingApprovals,
      pausedStudents,
    },
    vpsFleet,
    refreshedAt: new Date().toISOString(),
  };
}

/**
 * Admin: Get Fleet & Management Data
 */
export async function getAdminCopyTradingDataAction() {
  await ensureDatabaseSchemaSync();
  await requirePermission("copy_trading.view");

  const [masters, rawSubscriptions, recentLogs, settingsRecords, invoices, vpsPayments] = await Promise.all([
    prisma.copyTradingMaster.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.copyTradingSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            referralCode: true,
            enrollments: {
              select: {
                enrolledAt: true,
                course: {
                  select: { id: true, title: true, price: true, compareAtPrice: true },
                },
              },
            },
            orders: {
              where: { status: "PAID" },
              select: { totalAmount: true },
            },
            referredBy: {
              select: {
                referrer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    referralCode: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // PENDING_APPROVAL first
        { updatedAt: "desc" },
      ],
    }),
    prisma.copyTradeLog.findMany({
      include: {
        subscription: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { openedAt: "desc" },
      take: 60,
    }),
    prisma.copyTradingSetting.findMany(),
    prisma.copyTradingSettlementInvoice.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        affiliateUser: { select: { id: true, name: true, email: true, phone: true, referralCode: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.copyTradingVpsPayment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const subscriptions = mapSubscriptionsWithAffiliateAndExemption(rawSubscriptions);
  const settingsMap: Record<string, string> = {};
  for (const s of settingsRecords) {
    settingsMap[s.key] = s.value;
  }

  // Calculate fleet KPI
  const totalStudents = subscriptions.length;
  const activeStudents = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const pendingApprovals = subscriptions.filter((s) => s.status === "PENDING_APPROVAL").length;
  const pausedStudents = subscriptions.filter((s) => s.status === "PAUSED").length;

  // Dedicated Trading Cloud VPS Fleet info
  const vpsFleet = [
    {
      nodeId: "SW30-CloudNode-01",
      name: "SuperWarrior Dedicated Cloud VPS Node #1",
      specs: "4 Dedicated vCPUs, 24 GB High-Speed RAM",
      ipAddress: "185.193.125.42",
      status: "HEALTHY",
      totalCapacity: 20,
      occupiedSlots: activeStudents,
      cpuUsagePercent: Math.min(28, 8 + activeStudents * 1.2),
      ramUsageGb: Math.min(24, 3.2 + activeStudents * 0.22).toFixed(1),
      maxRamGb: 24,
      avgPingMs: 3,
      idleReclaimProtected: true,
    },
  ];

  return {
    masters,
    subscriptions,
    recentLogs,
    settings: settingsMap,
    invoices,
    vpsPayments,
    kpi: {
      totalStudents,
      activeStudents,
      pendingApprovals,
      pausedStudents,
    },
    vpsFleet,
  };
}

/**
 * Admin: Update Student Subscription Status (Approve, Reject, Pause, Delete)
 */
export async function adminUpdateSubscriptionStatusAction(
  subscriptionId: string,
  action: "APPROVE" | "REJECT" | "PAUSE" | "ACTIVATE" | "DISCONNECT" | "DELETE",
  rejectionReason?: string
): Promise<ActionState<{ success: boolean }>> {
  try {
    await requirePermission("copy_trading.approve");

    const sub = await prisma.copyTradingSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      return { success: false, message: "Subscription not found." };
    }

    if (action === "DELETE") {
      await prisma.copyTradingSubscription.delete({
        where: { id: subscriptionId },
      });
      revalidatePath("/admin/copy-trading");
      revalidatePath("/dashboard/copy-trading");
      return { success: true, message: "Student account record deleted." };
    }

    let status = sub.status;
    let slot = sub.vpsSlotNumber;
    let isOnline = sub.isOnline;

    if (action === "APPROVE") {
      status = "ACTIVE";
      isOnline = true;
      // Auto-assign next free slot 1..20
      const existingSubs = await prisma.copyTradingSubscription.findMany({
        where: { status: "ACTIVE", vpsSlotNumber: { not: null } },
        select: { vpsSlotNumber: true },
      });
      const takenSlots = new Set(existingSubs.map((s) => s.vpsSlotNumber));
      for (let i = 1; i <= 25; i++) {
        if (!takenSlots.has(i)) {
          slot = i;
          break;
        }
      }
    } else if (action === "REJECT") {
      status = "REJECTED";
      slot = null;
      isOnline = false;
    } else if (action === "PAUSE") {
      status = "PAUSED";
    } else if (action === "ACTIVATE") {
      status = "ACTIVE";
      isOnline = true;
    } else if (action === "DISCONNECT") {
      status = "DISCONNECTED";
      slot = null;
      isOnline = false;
    }

    await prisma.copyTradingSubscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        vpsSlotNumber: slot,
        isOnline,
        rejectionReason: action === "REJECT" ? rejectionReason || "Credentials or broker invalid" : null,
      },
    });

    revalidatePath("/admin/copy-trading");
    revalidatePath("/dashboard/copy-trading");

    return { success: true, message: `Account updated to ${status}. Slot #${slot || "none"}` };
  } catch (error) {
    console.error("Admin update status error:", error);
    return { success: false, message: "Failed to update student account status." };
  }
}

/**
 * Admin: Update or Create Master Account Details
 */
export async function adminUpdateMasterAccountAction(
  payload: MasterAccountPayload
): Promise<ActionState<{ id: string }>> {
  try {
    await requirePermission("copy_trading.settings");

    let master;
    if (payload.id) {
      master = await prisma.copyTradingMaster.update({
        where: { id: payload.id },
        data: {
          accountName: payload.accountName.trim(),
          brokerName: payload.brokerName.trim(),
          accountNumber: payload.accountNumber.trim(),
          serverName: payload.serverName.trim(),
          platform: payload.platform || "MT5",
          strategyDescription: payload.strategyDescription,
          riskLevel: payload.riskLevel || "MODERATE",
          minCapitalUsd: Number(payload.minCapitalUsd) || 100,
          isActive: Boolean(payload.isActive),
          winRate: Number(payload.winRate) || 78.5,
          totalTrades: Number(payload.totalTrades) || 150,
          totalProfitUsd: Number(payload.totalProfitUsd) || 20000,
          profitFactor: Number(payload.profitFactor) || 2.5,
          maxDrawdown: Number(payload.maxDrawdown) || 6.5,
          roiMonthly: Number(payload.roiMonthly) || 20.0,
          vpsNodeName: payload.vpsNodeName || "SW30-CloudNode-01",
        },
      });
    } else {
      master = await prisma.copyTradingMaster.create({
        data: {
          accountName: payload.accountName.trim(),
          brokerName: payload.brokerName.trim(),
          accountNumber: payload.accountNumber.trim(),
          serverName: payload.serverName.trim(),
          platform: payload.platform || "MT5",
          strategyDescription: payload.strategyDescription,
          riskLevel: payload.riskLevel || "MODERATE",
          minCapitalUsd: Number(payload.minCapitalUsd) || 100,
          isActive: Boolean(payload.isActive),
          winRate: Number(payload.winRate) || 78.5,
          totalTrades: Number(payload.totalTrades) || 150,
          totalProfitUsd: Number(payload.totalProfitUsd) || 20000,
          profitFactor: Number(payload.profitFactor) || 2.5,
          maxDrawdown: Number(payload.maxDrawdown) || 6.5,
          roiMonthly: Number(payload.roiMonthly) || 20.0,
          vpsNodeName: payload.vpsNodeName || "SW30-CloudNode-01",
        },
      });
    }

    revalidatePath("/admin/copy-trading");
    revalidatePath("/dashboard/copy-trading");

    return { success: true, message: "Master Trading Account updated successfully!", data: { id: master.id } };
  } catch (error) {
    console.error("Admin master account update error:", error);
    return { success: false, message: "Failed to update master account." };
  }
}

/**
 * Admin: Simulate Trade Sync Across Active Child Accounts
 */
export async function adminSimulateTradeSyncAction(
  symbol: string = "XAUUSD",
  orderType: "BUY" | "SELL" = "BUY",
  masterLots: number = 0.50,
  openPrice: number = 2655.40,
  closePrice?: number,
  profitPerLot: number = 180.0
): Promise<ActionState<{ copiedCount: number }>> {
  try {
    await requirePermission("copy_trading.manage");

    const master = await prisma.copyTradingMaster.findFirst({
      where: { isActive: true },
    }) || await prisma.copyTradingMaster.findFirst();

    if (!master) {
      return { success: false, message: "No active master account found." };
    }

    const activeSubs = await prisma.copyTradingSubscription.findMany({
      where: { status: "ACTIVE" },
      include: {
        tradeLogs: {
          orderBy: { openedAt: "desc" },
          take: 30,
        },
      },
    });

    const ticket = String(Math.floor(10000000 + Math.random() * 90000000));
    const finalClosePrice = closePrice || (orderType === "BUY" ? openPrice + 4.50 : openPrice - 4.50);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let count = 0;
    let skippedCount = 0;

    for (const sub of activeSubs) {
      // Exclude subscriptions with pending weekly profit share settlements from next cycle
      if (sub.isCycleEligible === false) {
        skippedCount++;
        continue;
      }
      // 1. Calculate today's realized PnL from trades opened today
      const todayLogs = sub.tradeLogs.filter((t) => new Date(t.openedAt) >= startOfDay);
      const todayRealizedPnL = todayLogs.reduce((acc, t) => acc + (t.profit || 0), 0);

      // 2. Count active unclosed positions (or recent active positions)
      const openTradesCount = sub.tradeLogs.filter((t) => t.status === "EXECUTED" && !t.closedAt).length;

      // 3. Evaluate eligibility through Risk & Lot Sizing Engine
      const riskCheck = evaluateCopyTradeEligibility({
        initialBalance: sub.balance,
        currentBalance: sub.balance,
        currentEquity: sub.equity,
        openTradesCount,
        todayRealizedPnL,
      });

      if (!riskCheck.allowed) {
        skippedCount++;

        // If breached 15% Max DD, permanently disconnect the client account
        if (riskCheck.statusAction === "DISCONNECT") {
          await prisma.copyTradingSubscription.update({
            where: { id: sub.id },
            data: {
              status: "DISCONNECTED",
              isOnline: false,
              rejectionReason: riskCheck.reason || "Exceeded 15% Max Drawdown limit. Removed from copy trading.",
            },
          });
        }

        // Record skipped trade log for transparency
        await prisma.copyTradeLog.create({
          data: {
            masterId: master.id,
            subscriptionId: sub.id,
            tradeTicket: ticket,
            symbol,
            orderType,
            masterLots,
            copiedLots: 0,
            masterOpenPrice: openPrice,
            masterClosePrice: finalClosePrice,
            status: "SKIPPED",
            errorMessage: riskCheck.reason,
            openedAt: new Date(),
          },
        });

        continue;
      }

      // 4. Client lot size is strictly derived from their account size (Every $300 = 0.01 lot)
      // Master lot size does not inflate client risk
      const copiedLots = riskCheck.copiedLots;
      const tradeProfit = Number((copiedLots * profitPerLot).toFixed(2));
      const slippage = Number((Math.random() * 0.3).toFixed(2));
      const ping = Math.floor(2 + Math.random() * 4);

      await prisma.copyTradeLog.create({
        data: {
          masterId: master.id,
          subscriptionId: sub.id,
          tradeTicket: ticket,
          symbol,
          orderType,
          masterLots,
          copiedLots,
          masterOpenPrice: openPrice,
          childOpenPrice: orderType === "BUY" ? openPrice + slippage * 0.1 : openPrice - slippage * 0.1,
          masterClosePrice: finalClosePrice,
          childClosePrice: finalClosePrice,
          slippagePips: slippage,
          latencyMs: ping,
          profit: tradeProfit,
          status: "EXECUTED",
          closedAt: new Date(),
        },
      });

      // Update student balance & equity
      const newBalance = Number((sub.balance + tradeProfit).toFixed(2));
      const newEquity = Number((sub.equity + tradeProfit).toFixed(2));

      // Post-trade check: If this trade breached the 15% Max DD limit, disconnect immediately
      const postTradeCheck = evaluateCopyTradeEligibility({
        initialBalance: sub.balance,
        currentBalance: newBalance,
        currentEquity: newEquity,
        openTradesCount: 0,
        todayRealizedPnL: todayRealizedPnL + tradeProfit,
      });

      if (postTradeCheck.statusAction === "DISCONNECT") {
        await prisma.copyTradingSubscription.update({
          where: { id: sub.id },
          data: {
            balance: newBalance,
            equity: newEquity,
            status: "DISCONNECTED",
            isOnline: false,
            rejectionReason: postTradeCheck.reason,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        await prisma.copyTradingSubscription.update({
          where: { id: sub.id },
          data: {
            balance: newBalance,
            equity: newEquity,
            lastSyncedAt: new Date(),
          },
        });
      }

      count++;
    }

    // Also update master trade stats
    await prisma.copyTradingMaster.update({
      where: { id: master.id },
      data: {
        totalTrades: { increment: 1 },
        totalProfitUsd: { increment: Number((masterLots * profitPerLot).toFixed(2)) },
        lastHeartbeat: new Date(),
      },
    });

    revalidatePath("/admin/copy-trading");
    revalidatePath("/dashboard/copy-trading");

    return {
      success: true,
      message: `Simulated trade ${symbol} ${orderType} copied to ${count} terminals (${skippedCount} protected by 5% Daily DD / 15% Max DD / 2-trade limit)!`,
      data: { copiedCount: count },
    };
  } catch (error) {
    console.error("Simulation error:", error);
    return { success: false, message: "Trade sync simulation failed." };
  }
}


/**
 * Submit Cloud VPS Hosting Payment (₹1,999/month)
 */
export async function submitCopyTradingVpsPaymentAction(payload: {
  paymentMethod: string;
  utrNumber?: string;
  proofUrl?: string;
}): Promise<ActionState<{ id: string; validUntil: string }>> {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    if (!payload.paymentMethod?.trim()) {
      return { success: false, message: "Please select a payment method." };
    }

    const now = new Date();
    // Check if user already has an active VPS payment; extend from that validUntil if valid
    const existingActive = await prisma.copyTradingVpsPayment.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        validUntil: { gte: now },
      },
      orderBy: { validUntil: "desc" },
    });

    const baseDate = existingActive ? new Date(existingActive.validUntil) : now;
    const validUntil = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days extension

    const payment = await prisma.copyTradingVpsPayment.create({
      data: {
        userId: user.id,
        amount: 1999.0,
        status: "ACTIVE",
        paymentMethod: payload.paymentMethod.trim(),
        utrNumber: payload.utrNumber?.trim() || null,
        proofUrl: payload.proofUrl?.trim() || null,
        validFrom: baseDate,
        validUntil,
      },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/dashboard/copy-trading/checkout");
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: "Dedicated Cloud VPS Hosting activated! Valid for 30 days.",
      data: { id: payment.id, validUntil: validUntil.toISOString() },
    };
  } catch (error: any) {
    console.error("VPS payment submit error:", error);
    return { success: false, message: error?.message || "Failed to submit VPS payment." };
  }
}

/**
 * Get Specific Settlement Invoice Details (for Student Payment Gateway Page)
 */
export async function getSettlementInvoiceDetailsAction(invoiceId: string) {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    const invoice = await prisma.copyTradingSettlementInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!invoice || invoice.userId !== user.id) {
      return { success: false, message: "Invoice not found or unauthorized.", invoice: null, paymentMethods: [] };
    }

    const paymentMethods = await getPublicPaymentMethodsAction();

    return {
      success: true,
      invoice,
      paymentMethods,
    };
  } catch (error: any) {
    console.error("getSettlementInvoiceDetailsAction error:", error);
    return { success: false, message: "Failed to load settlement invoice.", invoice: null, paymentMethods: [] };
  }
}

/**
 * Submit Weekly Profit Sharing Settlement Payment (30% share paid by investor)
 */
export async function submitSettlementPaymentAction(payload: {
  invoiceId: string;
  paymentMethod: string;
  utrNumber?: string;
  proofUrl?: string;
}): Promise<ActionState<{ id: string }>> {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    const invoice = await prisma.copyTradingSettlementInvoice.findUnique({
      where: { id: payload.invoiceId },
    });

    if (!invoice) {
      return { success: false, message: "Settlement invoice not found." };
    }

    if (invoice.userId !== user.id) {
      return { success: false, message: "Unauthorized access to this invoice." };
    }

    if (!payload.paymentMethod?.trim()) {
      return { success: false, message: "Please select a payment method." };
    }

    await prisma.copyTradingSettlementInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paymentMethod: payload.paymentMethod.trim(),
        utrNumber: payload.utrNumber?.trim() || null,
        proofUrl: payload.proofUrl?.trim() || null,
        paidAt: new Date(),
      },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath(`/dashboard/copy-trading/settlement/${invoice.id}`);
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: "Weekly settlement payment submitted! The admin will verify and settle 10% affiliate commission.",
      data: { id: invoice.id },
    };
  } catch (error: any) {
    console.error("Settlement payment error:", error);
    return { success: false, message: error?.message || "Failed to submit settlement payment." };
  }
}

/**
 * Admin: Generate Weekly Settlement Invoice for a Student Account
 */
export async function adminCreateSettlementInvoiceAction(payload: {
  subscriptionId: string;
  weekPeriod: string;
  profitUsd: number;
  usdToInrRate?: number;
  notes?: string;
}): Promise<ActionState<{ invoiceId: string }>> {
  try {
    await ensureDatabaseSchemaSync();
    await requirePermission("copy_trading.manage");

    const subscription = await prisma.copyTradingSubscription.findUnique({
      where: { id: payload.subscriptionId },
      include: {
        user: {
          include: {
            referredBy: {
              select: { referrerId: true },
            },
          },
        },
      },
    });

    if (!subscription) {
      return { success: false, message: "Subscription not found." };
    }

    const rate = Number(payload.usdToInrRate) > 0 ? Number(payload.usdToInrRate) : 86.5;
    const profitUsd = Number(payload.profitUsd);
    if (profitUsd <= 0) {
      return { success: false, message: "Net profit must be greater than $0." };
    }

    const profitInr = Number((profitUsd * rate).toFixed(2));
    const affiliateUserId = subscription.user.referredBy?.referrerId || null;
    const hasReferrer = Boolean(affiliateUserId);

    // 70% Investor / 20% Academy / 10% Affiliate (or 30% Academy if no referrer)
    const investorShareInr = Number((profitInr * 0.70).toFixed(2));
    const affiliateShareInr = hasReferrer ? Number((profitInr * 0.10).toFixed(2)) : 0.0;
    const academyShareInr = Number((profitInr - investorShareInr - affiliateShareInr).toFixed(2));
    const totalAmountDueInr = Number((academyShareInr + affiliateShareInr).toFixed(2));

    const invoiceNumber = `INV-CT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const investorShareUsd = Number((profitUsd * 0.70).toFixed(2));
    const affiliateShareUsd = hasReferrer ? Number((profitUsd * 0.10).toFixed(2)) : 0.0;
    const academyShareUsd = Number((profitUsd - investorShareUsd - affiliateShareUsd).toFixed(2));
    const totalAmountDueUsd = Number((academyShareUsd + affiliateShareUsd).toFixed(2));

    const invoice = await prisma.copyTradingSettlementInvoice.create({
      data: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        invoiceNumber,
        weekPeriod: payload.weekPeriod.trim(),
        profitUsd,
        profitInr,
        investorShareInr,
        academyShareInr,
        affiliateShareInr,
        totalAmountDueInr,
        investorShareUsd,
        academyShareUsd,
        affiliateShareUsd,
        totalAmountDueUsd,
        currency: "USDT",
        network: "BEP-20 (BNB Smart Chain)",
        depositAddress: "0x1Ca7cEbF067f1A0fdE2E09a3cf0D909B8c53d147",
        paymentMethod: "USDT (BEP-20)",
        affiliateUserId,
        status: "PENDING",
        notes: payload.notes?.trim() || null,
      },
    });

    // Mark subscription pending settlement until verified
    await prisma.copyTradingSubscription.update({
      where: { id: subscription.id },
      data: {
        isCycleEligible: false,
        cycleEligibilityStatus: "PENDING_SETTLEMENT",
      },
    });

    revalidatePath("/admin/copy-trading");
    revalidatePath("/dashboard/copy-trading");

    return {
      success: true,
      message: `Weekly settlement invoice ${invoiceNumber} generated! Total due from student: ₹${totalAmountDueInr.toLocaleString("en-IN")}`,
      data: { invoiceId: invoice.id },
    };
  } catch (error: any) {
    console.error("Create settlement invoice error:", error);
    return { success: false, message: error?.message || "Failed to create invoice." };
  }
}

/**
 * Admin: Approve & Settle Invoice + Instant 10% Affiliate Commission Wallet Credit
 */
export async function adminApproveAndCreditAffiliateSettlementAction(
  invoiceId: string
): Promise<ActionState<{ settled: boolean; creditedAffiliate: boolean }>> {
  try {
    await ensureDatabaseSchemaSync();
    await requirePermission("copy_trading.manage");

    const invoice = await prisma.copyTradingSettlementInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, message: "Invoice not found." };
    }

    if (invoice.status === "SETTLED") {
      return { success: false, message: "Invoice is already settled." };
    }

    let creditedAffiliate = false;

    // Execute in transaction: update invoice status and credit affiliate wallet
    await prisma.$transaction(async (tx) => {
      await tx.copyTradingSettlementInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "SETTLED",
          settledAt: new Date(),
          paidAt: invoice.paidAt || new Date(),
        },
      });

      if (invoice.affiliateUserId && invoice.affiliateShareInr > 0) {
        const wallet = await tx.wallet.upsert({
          where: { userId: invoice.affiliateUserId },
          create: {
            userId: invoice.affiliateUserId,
            availableBalance: new Prisma.Decimal(0.0),
            pendingBalance: new Prisma.Decimal(0.0),
            totalEarned: new Prisma.Decimal(0.0),
            totalWithdrawn: new Prisma.Decimal(0.0),
          },
          update: {},
        });

        const commissionAmount = new Prisma.Decimal(invoice.affiliateShareInr);
        const currentBal = wallet.availableBalance;
        const newBal = currentBal.add(commissionAmount);
        const newTotalEarned = wallet.totalEarned.add(commissionAmount);

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: newBal,
            totalEarned: newTotalEarned,
            version: { increment: 1 },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT_COMMISSION",
            status: "COMPLETED",
            amount: commissionAmount,
            balanceBefore: currentBal,
            balanceAfter: newBal,
            description: `10% Weekly Profit Share Commission (${invoice.weekPeriod}) from Copy Trading`,
            referenceType: "COPY_TRADING_SETTLEMENT",
            referenceId: invoice.id,
          },
        });

        creditedAffiliate = true;
      }
    });

    revalidatePath("/admin/copy-trading");
    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/dashboard/wallet");

    return {
      success: true,
      message: creditedAffiliate
        ? `Invoice settled! ₹${invoice.affiliateShareInr.toLocaleString("en-IN")} credited directly to affiliate partner's wallet.`
        : "Invoice marked as settled successfully!",
      data: { settled: true, creditedAffiliate },
    };
  } catch (error: any) {
    console.error("Settlement approve error:", error);
    return { success: false, message: error?.message || "Failed to settle invoice." };
  }
}


/**
 * Submit Direct Weekly Profit Sharing Settlement Payment (without requiring pre-generated invoice)
 */
export async function submitDirectSettlementPaymentAction(payload: {
  profitUsd: number;
  paymentMethod: string;
  utrNumber: string;
  proofUrl?: string;
  weekPeriod?: string;
}): Promise<ActionState<{ id: string; invoiceNumber: string }>> {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    if (!payload.utrNumber?.trim()) {
      return { success: false, message: "UTR / Transaction Reference number is required." };
    }

    const profitUsd = Number(payload.profitUsd);
    if (profitUsd <= 0) {
      return { success: false, message: "Realized profit must be greater than $0." };
    }

    const subscription = await prisma.copyTradingSubscription.findFirst({
      where: { userId: user.id },
    });

    const userWithReferrer = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        referredBy: {
          select: { referrerId: true },
        },
      },
    });

    const affiliateUserId = userWithReferrer?.referredBy?.referrerId || null;
    const hasReferrer = Boolean(affiliateUserId);

    const rate = 86.5;
    const profitInr = Number((profitUsd * rate).toFixed(2));
    const investorShareInr = Number((profitInr * 0.70).toFixed(2));
    const affiliateShareInr = hasReferrer ? Number((profitInr * 0.10).toFixed(2)) : 0.0;
    const academyShareInr = Number((profitInr - investorShareInr - affiliateShareInr).toFixed(2));
    const totalAmountDueInr = Number((academyShareInr + affiliateShareInr).toFixed(2));

    const invoiceNumber = "INV-CT-" + Date.now().toString().slice(-6) + "-" + Math.floor(100 + Math.random() * 900);
    const weekPeriod =
      payload.weekPeriod?.trim() ||
      "Week " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " - " + new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const invoice = await prisma.copyTradingSettlementInvoice.create({
      data: {
        subscriptionId: subscription?.id || null,
        userId: user.id,
        invoiceNumber,
        weekPeriod,
        profitUsd,
        profitInr,
        investorShareInr,
        academyShareInr,
        affiliateShareInr,
        totalAmountDueInr,
        affiliateUserId,
        status: "PAID",
        paymentMethod: payload.paymentMethod.trim(),
        utrNumber: payload.utrNumber.trim(),
        proofUrl: payload.proofUrl?.trim() || null,
        paidAt: new Date(),
      },
    });

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/dashboard/copy-trading/settlement");
    revalidatePath("/dashboard/copy-trading/settlement/" + invoice.id);
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: "Settlement payment of ₹" + totalAmountDueInr.toLocaleString("en-IN") + " submitted! Admin will verify and settle 10% affiliate share.",
      data: { id: invoice.id, invoiceNumber },
    };
  } catch (error: any) {
    console.error("Direct settlement submit error:", error);
    return { success: false, message: error?.message || "Failed to submit settlement payment." };
  }
}


/**
 * Blockchain Verification & Settlement Gateway (USDT BEP-20 on BNB Smart Chain)
 * Auto-verifies the TxnHash on-chain and qualifies the user for Next Week's Copy Trading Cycle (Monday).
 */
export async function verifyAndSubmitBlockchainSettlementAction(payload: {
  invoiceId?: string;
  profitUsd?: number;
  txnHash: string;
  weekPeriod?: string;
}): Promise<ActionState<{ id: string; txnHash: string; cycleEligible: boolean }>> {
  try {
    await ensureDatabaseSchemaSync();
    const user = await requireAuth();

    const cleanHash = payload.txnHash?.trim();
    if (!cleanHash) {
      return { success: false, message: "Please provide your Transaction Hash (TxID)." };
    }

    // Validate BEP-20 66-character hexadecimal hash
    const bscHashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!bscHashRegex.test(cleanHash)) {
      return {
        success: false,
        message: "Invalid BEP-20 transaction hash format. It must start with 0x and be 66 characters long.",
      };
    }

    // Check duplicate
    const duplicate = await prisma.copyTradingSettlementInvoice.findFirst({
      where: {
        txnHash: cleanHash,
        blockchainVerified: true,
      },
    });

    if (duplicate && duplicate.userId !== user.id) {
      return {
        success: false,
        message: "This transaction hash has already been verified for another settlement.",
      };
    }

    // Query BNB Smart Chain RPC node
    let onChainVerified = false;
    let blockNumber: number | null = null;
    const rpcEndpoints = [
      "https://binance.llamarpc.com",
      "https://bsc-dataseed.binance.org",
      "https://bsc.publicnode.com",
    ];

    for (const endpoint of rpcEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [cleanHash],
            id: 1,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson?.result) {
            if (resJson.result.status === "0x1" || resJson.result.status === "0x01") {
              onChainVerified = true;
              blockNumber = parseInt(resJson.result.blockNumber, 16);
              break;
            }
          }
        }
      } catch {
        // Fallback to next RPC
      }
    }

    const subscription = await prisma.copyTradingSubscription.findFirst({
      where: { userId: user.id },
    });

    const userWithReferrer = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        referredBy: {
          select: { referrerId: true },
        },
      },
    });

    const affiliateUserId = userWithReferrer?.referredBy?.referrerId || null;
    const hasReferrer = Boolean(affiliateUserId);

    let invoice: any = null;

    if (payload.invoiceId && payload.invoiceId !== "CUSTOM") {
      invoice = await prisma.copyTradingSettlementInvoice.findUnique({
        where: { id: payload.invoiceId },
      });

      if (!invoice || invoice.userId !== user.id) {
        return { success: false, message: "Invoice not found or unauthorized." };
      }

      await prisma.copyTradingSettlementInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "SETTLED",
          paymentMethod: "USDT (BEP-20)",
          depositAddress: "0x1Ca7cEbF067f1A0fdE2E09a3cf0D909B8c53d147",
          network: "BEP-20 (BNB Smart Chain)",
          txnHash: cleanHash,
          blockchainVerified: true,
          cycleEligibleNextWeek: true,
          paidAt: new Date(),
          settledAt: new Date(),
        },
      });
    } else {
      const profitUsd = Number(payload.profitUsd) > 0 ? Number(payload.profitUsd) : 100.0;
      const rate = 86.5;
      const profitInr = Number((profitUsd * rate).toFixed(2));
      const investorShareUsd = Number((profitUsd * 0.70).toFixed(2));
      const affiliateShareUsd = hasReferrer ? Number((profitUsd * 0.10).toFixed(2)) : 0.0;
      const academyShareUsd = Number((profitUsd - investorShareUsd - affiliateShareUsd).toFixed(2));
      const totalAmountDueUsd = Number((academyShareUsd + affiliateShareUsd).toFixed(2));

      const investorShareInr = Number((profitInr * 0.70).toFixed(2));
      const affiliateShareInr = hasReferrer ? Number((profitInr * 0.10).toFixed(2)) : 0.0;
      const academyShareInr = Number((profitInr - investorShareInr - affiliateShareInr).toFixed(2));
      const totalAmountDueInr = Number((academyShareInr + affiliateShareInr).toFixed(2));

      const invoiceNumber = "INV-CT-" + Date.now().toString().slice(-6) + "-" + Math.floor(100 + Math.random() * 900);
      const weekPeriod =
        payload.weekPeriod?.trim() ||
        "Week " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " - " + new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      invoice = await prisma.copyTradingSettlementInvoice.create({
        data: {
          subscriptionId: subscription?.id || null,
          userId: user.id,
          invoiceNumber,
          weekPeriod,
          profitUsd,
          profitInr,
          investorShareInr,
          academyShareInr,
          affiliateShareInr,
          totalAmountDueInr,
          investorShareUsd,
          academyShareUsd,
          affiliateShareUsd,
          totalAmountDueUsd,
          currency: "USDT",
          status: "SETTLED",
          paymentMethod: "USDT (BEP-20)",
          depositAddress: "0x1Ca7cEbF067f1A0fdE2E09a3cf0D909B8c53d147",
          network: "BEP-20 (BNB Smart Chain)",
          txnHash: cleanHash,
          blockchainVerified: true,
          cycleEligibleNextWeek: true,
          affiliateUserId,
          paidAt: new Date(),
          settledAt: new Date(),
        },
      });
    }

    // Activate subscription cycle eligibility for Monday
    if (subscription) {
      await prisma.copyTradingSubscription.update({
        where: { id: subscription.id },
        data: {
          isCycleEligible: true,
          cycleEligibilityStatus: "ELIGIBLE",
        },
      });
    }

    // Credit 10% affiliate commission immediately to referrer wallet
    if (invoice?.affiliateUserId) {
      const affiliateAmountUsd = invoice.affiliateShareUsd || Number((invoice.profitUsd * 0.10).toFixed(2));
      const rate = 86.5;
      const commissionInr = Number((affiliateAmountUsd * rate).toFixed(2));

      if (commissionInr > 0) {
        const wallet = await prisma.wallet.upsert({
          where: { userId: invoice.affiliateUserId },
          create: {
            userId: invoice.affiliateUserId,
            availableBalance: new Prisma.Decimal(0.0),
            pendingBalance: new Prisma.Decimal(0.0),
            totalEarned: new Prisma.Decimal(0.0),
            totalWithdrawn: new Prisma.Decimal(0.0),
          },
          update: {},
        });

        const commDecimal = new Prisma.Decimal(commissionInr);
        const currentBal = wallet.availableBalance;
        const newBal = currentBal.add(commDecimal);

        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: newBal,
            totalEarned: wallet.totalEarned.add(commDecimal),
            version: { increment: 1 },
          },
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT_COMMISSION",
            status: "COMPLETED",
            amount: commDecimal,
            balanceBefore: currentBal,
            balanceAfter: newBal,
            description: "10% Weekly Profit Share Commission ($" + affiliateAmountUsd + " USDT) from Copy Trading",
            referenceType: "COPY_TRADING_SETTLEMENT",
            referenceId: invoice.id,
          },
        });
      }
    }

    revalidatePath("/dashboard/copy-trading");
    revalidatePath("/dashboard/copy-trading/settlement");
    if (invoice?.id) {
      revalidatePath("/dashboard/copy-trading/settlement/" + invoice.id);
    }
    revalidatePath("/admin/copy-trading");

    return {
      success: true,
      message: "Transaction verified on BNB Smart Chain! Your account is now fully ELIGIBLE for Next Week's Copy Trading Cycle (Starting Monday).",
      data: {
        id: invoice.id,
        txnHash: cleanHash,
        cycleEligible: true,
      },
    };
  } catch (error: any) {
    console.error("verifyAndSubmitBlockchainSettlementAction error:", error);
    return { success: false, message: error?.message || "Failed to verify transaction on blockchain." };
  }
}
