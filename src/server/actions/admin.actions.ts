"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { PAGINATION } from "@/lib/constants";
import { Prisma } from "@/generated/prisma";
import type { ActionState } from "@/types";

// ==========================================
// 1. ADMIN OVERVIEW DASHBOARD METRICS
// ==========================================

export async function getAdminOverviewAction() {
  await requireAdmin();

  try {
    const [
      totalStudents,
      totalCourses,
      publishedCourses,
      ordersAgg,
      totalRevenueAgg,
      pendingWithdrawalsAgg,
      totalCommissionsAgg,
      recentOrders,
      recentStudents,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.course.count({ where: { deletedAt: null } }),
      prisma.course.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.withdrawal.aggregate({
        where: { status: "PENDING" },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.referralCommissionRecord.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { commissionAmount: true },
      }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { itemTitle: true } },
        },
      }),
      prisma.user.findMany({
        take: 6,
        where: { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { enrollments: true, directReferrals: true } },
        },
      }),
    ]);

    return {
      metrics: {
        totalStudents: totalStudents || 0,
        totalCourses: totalCourses || 0,
        publishedCourses: publishedCourses || 0,
        paidOrdersCount: ordersAgg || 0,
        totalRevenue: Number(totalRevenueAgg?._sum?.totalAmount || 0),
        pendingWithdrawalsCount: pendingWithdrawalsAgg?._count?.id || 0,
        pendingWithdrawalsAmount: Number(pendingWithdrawalsAgg?._sum?.amount || 0),
        totalCommissionsPaidOrPending: Number(totalCommissionsAgg?._sum?.commissionAmount || 0),
      },
      recentOrders: (recentOrders || []).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        studentName: o.user?.name || "Student",
        studentEmail: o.user?.email || "Unknown",
        courseTitle: o.items?.[0]?.itemTitle || "Course",
        totalAmount: Number(o.totalAmount || 0),
        status: o.status,
        createdAt: o.createdAt,
      })),
      recentStudents: (recentStudents || []).map((s) => ({
        id: s.id,
        name: s.name || "Student",
        email: s.email,
        coursesCount: s._count?.enrollments || 0,
        referralsCount: s._count?.directReferrals || 0,
        createdAt: s.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error loading admin overview metrics:", error);
    return {
      metrics: {
        totalStudents: 0,
        totalCourses: 0,
        publishedCourses: 0,
        paidOrdersCount: 0,
        totalRevenue: 0,
        pendingWithdrawalsCount: 0,
        pendingWithdrawalsAmount: 0,
        totalCommissionsPaidOrPending: 0,
      },
      recentOrders: [],
      recentStudents: [],
    };
  }
}

// ==========================================
// 2. ADMIN STUDENTS MANAGEMENT
// ==========================================

export async function getAdminStudentsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  await requireAdmin();

  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { referralCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            enrollments: true,
            directReferrals: true,
            orders: true,
          },
        },
        wallet: {
          select: {
            availableBalance: true,
            totalEarned: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: students.map((s) => ({
      id: s.id,
      name: s.name || "Student",
      email: s.email,
      phone: s.phone,
      referralCode: s.referralCode,
      status: s.status,
      enrollmentsCount: s._count.enrollments,
      directReferralsCount: s._count.directReferrals,
      ordersCount: s._count.orders,
      walletBalance: Number(s.wallet?.availableBalance || 0),
      totalEarned: Number(s.wallet?.totalEarned || 0),
      isTestData: s.isTestData,
      createdAt: s.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ==========================================
// 3. ADMIN AUDIT LOGS
// ==========================================

export async function getAdminAuditLogsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  action,
  search,
}: {
  page?: number;
  pageSize?: number;
  action?: string;
  search?: string;
} = {}) {
  const currentUser = await requireAdmin();
  const isSuper =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.adminRole === "SUPER_ADMIN" ||
    currentUser.email === "vinayaksahu3@gmail.com" ||
    currentUser.email === "admin@superwarrior30.com";

  const conditions: Prisma.AuditLogWhereInput[] = [];

  // PRIVACY ENFORCEMENT: Subadmins must NEVER see Super Admin audit logs
  if (!isSuper) {
    conditions.push({
      actorRole: { not: "SUPER_ADMIN" },
      actorEmail: {
        notIn: ["vinayaksahu3@gmail.com", "admin@superwarrior30.com"],
      },
    });
  }

  if (action && action !== "all") {
    conditions.push({ action });
  }

  if (search) {
    conditions.push({
      OR: [
        { actorEmail: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.AuditLogWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((l) => ({
      id: l.id,
      actorEmail: l.actorEmail || "System",
      actorRole: l.actorRole || "SYSTEM",
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      oldValues: l.oldValues as Record<string, unknown> | null,
      newValues: l.newValues as Record<string, unknown> | null,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ==========================================
// 4. ADMIN PLATFORM SETTINGS
// ==========================================

export async function getAdminSettingsAction() {
  await requireAdmin();

  const settings = await prisma.siteSetting.findMany();
  const settingsMap: Record<string, string> = {};

  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return {
    siteName: settingsMap["site_name"] || "Super Warrior 30",
    supportEmail: settingsMap["support_email"] || "support@superwarrior30.com",
    announcementBanner: settingsMap["announcement_banner"] || "",
    isMaintenanceMode: settingsMap["maintenance_mode"] === "true",
  };
}

export async function saveAdminSettingsAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const siteName = String(formData.get("siteName") || "Super Warrior 30").trim();
  const supportEmail = String(formData.get("supportEmail") || "").trim();
  const announcementBanner = String(formData.get("announcementBanner") || "").trim();
  const isMaintenanceMode = formData.get("isMaintenanceMode") === "true";

  await prisma.$transaction(async (tx) => {
    const keys = [
      { key: "site_name", value: siteName },
      { key: "support_email", value: supportEmail },
      { key: "announcement_banner", value: announcementBanner },
      { key: "maintenance_mode", value: isMaintenanceMode ? "true" : "false" },
    ];

    for (const item of keys) {
      await tx.siteSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "SETTINGS_UPDATED",
        entityType: "SiteSetting",
        entityId: "global",
        newValues: { siteName, supportEmail, isMaintenanceMode },
      },
    });
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: true, message: "Platform settings saved successfully." };
}

// ==========================================
// 5. ADMIN PROFILE & BACKUP HELPERS
// ==========================================

export async function getAdminProfileAction() {
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
}

export async function triggerDatabaseSyncAction() {
  const admin = await requireAdmin();

  try {
    const { ensureDatabaseSchemaSync } = await import("@/lib/db-sync");
    await ensureDatabaseSchemaSync();

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "DATABASE_SCHEMA_SYNC",
        entityType: "System",
        entityId: "postgres",
      },
    });

    return { success: true, message: "Database schema verification & migration completed successfully." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to execute database schema sync." };
  }
}

export async function getDatabaseBackupDataAction() {
  await requireAdmin();

  try {
    const [
      usersCount,
      coursesCount,
      ordersCount,
      settingsCount,
      claimsCount,
      couponsCount,
      auditLogsCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.course.count(),
      prisma.order.count(),
      prisma.siteSetting.count(),
      prisma.brokerOfferClaim.count().catch(() => 0),
      prisma.coupon.count(),
      prisma.auditLog.count(),
    ]);

    return {
      success: true,
      stats: {
        usersCount,
        coursesCount,
        ordersCount,
        settingsCount,
        claimsCount,
        couponsCount,
        auditLogsCount,
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to load database backup metrics." };
  }
}
