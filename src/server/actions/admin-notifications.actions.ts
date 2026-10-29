"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";

export type AdminNotificationCategory =
  | "ORDER"
  | "WITHDRAWAL"
  | "DEPOSIT"
  | "SUPPORT"
  | "HOMEWORK"
  | "COMMUNITY";

export interface AdminNotificationItem {
  id: string;
  category: AdminNotificationCategory;
  title: string;
  message: string;
  amount?: string;
  statusBadge: string;
  badgeVariant: "amber" | "emerald" | "blue" | "rose" | "purple";
  linkUrl: string;
  createdAt: string; // ISO string
  isUrgent?: boolean;
}

export interface AdminNotificationsPayload {
  success: boolean;
  notifications: AdminNotificationItem[];
  counts: {
    totalPending: number;
    pendingOrders: number;
    pendingWithdrawals: number;
    pendingDeposits: number;
    openTickets: number;
    pendingHomework: number;
    pendingCommunity: number;
  };
  lastCheckedAt: string;
}

export async function getAdminNotificationsAction(): Promise<AdminNotificationsPayload> {
  const emptyPayload: AdminNotificationsPayload = {
    success: false,
    notifications: [],
    counts: {
      totalPending: 0,
      pendingOrders: 0,
      pendingWithdrawals: 0,
      pendingDeposits: 0,
      openTickets: 0,
      pendingHomework: 0,
      pendingCommunity: 0,
    },
    lastCheckedAt: new Date().toISOString(),
  };

  try {
    await requireAdmin();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel fetch across admin action surfaces
    const [
      pendingOrders,
      recentPaidOrders,
      pendingWithdrawals,
      pendingSettlements,
      pendingVpsPayments,
      openTickets,
      pendingHomework,
      pendingCommunityClaims,
    ] = await Promise.all([
      // 1. Pending Orders (e.g., awaiting manual payment verification or checkout)
      prisma.order
        .findMany({
          where: { status: "PENDING" },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            currency: true,
            manualPaymentRef: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            items: { select: { itemTitle: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
        .catch(() => []),

      // 1b. Recently Paid Orders (last 24 hours)
      prisma.order
        .findMany({
          where: {
            status: "PAID",
            paidAt: { gte: last24h },
          },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            currency: true,
            paidAt: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            items: { select: { itemTitle: true } },
          },
          orderBy: { paidAt: "desc" },
          take: 10,
        })
        .catch(() => []),

      // 2. Pending Withdrawals
      prisma.withdrawal
        .findMany({
          where: { status: "PENDING" },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
        .catch(() => []),

      // 3a. Pending Copy Trading Profit Settlements
      prisma.copyTradingSettlementInvoice
        .findMany({
          where: { status: "PENDING" },
          select: {
            id: true,
            invoiceNumber: true,
            profitUsd: true,
            academyShareUsd: true,
            txnHash: true,
            weekPeriod: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),

      // 3b. Pending Copy Trading Handling Fee / VPS Payments
      prisma.copyTradingVpsPayment
        .findMany({
          where: { status: "PENDING" },
          select: {
            id: true,
            amount: true,
            utrNumber: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),

      // 4. Open Support Desk Tickets
      prisma.supportInquiry
        .findMany({
          where: { status: "OPEN" },
          select: {
            id: true,
            subject: true,
            category: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),

      // 5. Pending Homework Submissions
      prisma.homeworkSubmission
        .findMany({
          where: { status: "SUBMITTED" },
          select: {
            id: true,
            createdAt: true,
            homework: { select: { title: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),

      // 6. Pending Community Verification Claims
      prisma.brokerOfferClaim
        .findMany({
          where: { verificationStatus: "PENDING" },
          select: {
            id: true,
            brokerName: true,
            brokerMemberId: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),
    ]);

    const notifications: AdminNotificationItem[] = [];

    // Map Pending Orders
    for (const ord of pendingOrders) {
      const studentName = ord.user?.name || ord.user?.email || "Student";
      const courseTitle = ord.items[0]?.itemTitle || "Course";
      const amountStr = `₹${Number(ord.totalAmount).toLocaleString("en-IN")}`;
      const hasProof = Boolean(ord.manualPaymentRef);

      notifications.push({
        id: `order_pending_${ord.id}`,
        category: "ORDER",
        title: `Order #${ord.orderNumber}`,
        message: `${studentName} • ${courseTitle}${hasProof ? ` • UTR: ${ord.manualPaymentRef}` : " • Payment pending"}`,
        amount: amountStr,
        statusBadge: hasProof ? "Approve UTR" : "Pending Order",
        badgeVariant: hasProof ? "amber" : "blue",
        linkUrl: "/admin/orders",
        createdAt: ord.createdAt.toISOString(),
        isUrgent: hasProof,
      });
    }

    // Map Recent Paid Orders
    for (const ord of recentPaidOrders) {
      const studentName = ord.user?.name || ord.user?.email || "Student";
      const courseTitle = ord.items[0]?.itemTitle || "Course";
      const amountStr = `₹${Number(ord.totalAmount).toLocaleString("en-IN")}`;

      notifications.push({
        id: `order_paid_${ord.id}`,
        category: "ORDER",
        title: `New Enrollment: #${ord.orderNumber}`,
        message: `${studentName} successfully enrolled in ${courseTitle}`,
        amount: amountStr,
        statusBadge: "Paid & Active",
        badgeVariant: "emerald",
        linkUrl: "/admin/orders",
        createdAt: (ord.paidAt || ord.createdAt).toISOString(),
        isUrgent: false,
      });
    }

    // Map Pending Withdrawals
    for (const w of pendingWithdrawals) {
      const studentName = w.user?.name || w.user?.email || "Partner";
      const amountStr = `₹${Number(w.amount).toLocaleString("en-IN")}`;

      notifications.push({
        id: `withdrawal_${w.id}`,
        category: "WITHDRAWAL",
        title: `Withdrawal Request: ${amountStr}`,
        message: `${studentName} requested wallet payout via ${w.paymentMethod.toUpperCase()}`,
        amount: amountStr,
        statusBadge: "Process Payout",
        badgeVariant: "rose",
        linkUrl: "/admin/withdrawals",
        createdAt: w.createdAt.toISOString(),
        isUrgent: true,
      });
    }

    // Map Copy Trading Settlements (Deposits)
    for (const s of pendingSettlements) {
      const hasTx = Boolean(s.txnHash);
      const shareStr = `$${s.academyShareUsd.toFixed(2)}`;

      notifications.push({
        id: `settlement_${s.id}`,
        category: "DEPOSIT",
        title: `Profit Settlement Due: ${shareStr}`,
        message: `Invoice #${s.invoiceNumber} (${s.weekPeriod})${hasTx ? ` • Tx: ${s.txnHash?.slice(0, 10)}...` : " • Awaiting TxHash"}`,
        amount: `$${s.profitUsd.toFixed(2)} Profit`,
        statusBadge: hasTx ? "Verify Blockchain" : "Pending Settlement",
        badgeVariant: "blue",
        linkUrl: "/admin/copy-trading",
        createdAt: s.createdAt.toISOString(),
        isUrgent: hasTx,
      });
    }

    // Map Copy Trading Handling Fee (Deposits)
    for (const v of pendingVpsPayments) {
      const studentName = v.user?.name || v.user?.email || "Student";
      const amountStr = `₹${v.amount.toLocaleString("en-IN")}`;
      const hasUtr = Boolean(v.utrNumber);

      notifications.push({
        id: `vps_payment_${v.id}`,
        category: "DEPOSIT",
        title: `Handling Fee Payment: ${amountStr}`,
        message: `${studentName} submitted copy trading terminal maintenance fee${hasUtr ? ` • UTR: ${v.utrNumber}` : ""}`,
        amount: amountStr,
        statusBadge: hasUtr ? "Approve Fee" : "Pending Fee",
        badgeVariant: "blue",
        linkUrl: "/admin/copy-trading",
        createdAt: v.createdAt.toISOString(),
        isUrgent: hasUtr,
      });
    }

    // Map Open Support Desk Tickets
    for (const t of openTickets) {
      const author = t.name || t.email;

      notifications.push({
        id: `ticket_${t.id}`,
        category: "SUPPORT",
        title: `Support Ticket: ${t.subject}`,
        message: `From ${author} • Category: ${t.category}`,
        statusBadge: "Open Ticket",
        badgeVariant: "purple",
        linkUrl: "/admin/support",
        createdAt: t.createdAt.toISOString(),
        isUrgent: false,
      });
    }

    // Map Homework Submissions
    for (const h of pendingHomework) {
      const studentName = h.user?.name || h.user?.email || "Student";
      const hwTitle = h.homework?.title || "Assignment";

      notifications.push({
        id: `hw_${h.id}`,
        category: "HOMEWORK",
        title: `Homework: ${hwTitle}`,
        message: `${studentName} submitted chart evaluation for review`,
        statusBadge: "Review Needed",
        badgeVariant: "amber",
        linkUrl: "/admin/homework",
        createdAt: h.createdAt.toISOString(),
        isUrgent: false,
      });
    }

    // Map Community Access Requests
    for (const c of pendingCommunityClaims) {
      const studentName = c.user?.name || c.user?.email || "Student";

      notifications.push({
        id: `comm_${c.id}`,
        category: "COMMUNITY",
        title: `VIP Community Request`,
        message: `${studentName} • ${c.brokerName} Member #${c.brokerMemberId}`,
        statusBadge: "Verify Broker ID",
        badgeVariant: "amber",
        linkUrl: "/admin/community",
        createdAt: c.createdAt.toISOString(),
        isUrgent: true,
      });
    }

    // Sort all notifications by creation date descending
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const counts = {
      pendingOrders: pendingOrders.length,
      pendingWithdrawals: pendingWithdrawals.length,
      pendingDeposits: pendingSettlements.length + pendingVpsPayments.length,
      openTickets: openTickets.length,
      pendingHomework: pendingHomework.length,
      pendingCommunity: pendingCommunityClaims.length,
      totalPending:
        pendingOrders.length +
        pendingWithdrawals.length +
        pendingSettlements.length +
        pendingVpsPayments.length +
        openTickets.length +
        pendingHomework.length +
        pendingCommunityClaims.length,
    };

    return {
      success: true,
      notifications,
      counts,
      lastCheckedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[getAdminNotificationsAction] Error:", error);
    return emptyPayload;
  }
}
