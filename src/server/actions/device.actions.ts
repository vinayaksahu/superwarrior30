"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminWrite, requireAuth } from "@/server/dal/auth";
import { PAGINATION } from "@/lib/constants";
import type { ActionState } from "@/types";

// ==========================================
// ADMIN: GET DEVICES LIST
// ==========================================

export async function getAdminDevicesAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  search = "",
  status = "all", // "all" | "active" | "revoked" | "blocked_students"
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
} = {}) {
  await requireAdmin();

  const where: Record<string, unknown> = {};

  if (status === "active") {
    where.isActive = true;
    where.revokedAt = null;
  } else if (status === "revoked") {
    where.revokedAt = { not: null };
  } else if (status === "blocked_students") {
    where.user = { status: "BLOCKED" };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { deviceName: { contains: q, mode: "insensitive" } },
      { browser: { contains: q, mode: "insensitive" } },
      { operatingSystem: { contains: q, mode: "insensitive" } },
      { lastIpAddress: { contains: q, mode: "insensitive" } },
    ];
  }

  const [devices, total, totalBlockedStudents, totalActiveDevices] = await Promise.all([
    prisma.userDevice.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    }),
    prisma.userDevice.count({ where }),
    prisma.user.count({ where: { status: "BLOCKED" } }),
    prisma.userDevice.count({ where: { isActive: true, revokedAt: null } }),
  ]);

  return {
    data: devices,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats: {
      totalBlockedStudents,
      totalActiveDevices,
    },
  };
}

// ==========================================
// ADMIN: GET STUDENT DEVICES
// ==========================================

export async function getStudentDevicesAction(studentId: string) {
  await requireAdmin();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      tokenVersion: true,
      createdAt: true,
      devices: {
        orderBy: { lastSeenAt: "desc" },
      },
    },
  });

  if (!student) throw new Error("Student not found.");

  return student;
}

// ==========================================
// ADMIN: REVOKE SPECIFIC DEVICE
// ==========================================

export async function revokeDeviceAction(deviceId: string): Promise<ActionState> {
  const admin = await requireAdminWrite();

  const device = await prisma.userDevice.findUnique({
    where: { id: deviceId },
    include: { user: true },
  });

  if (!device) return { success: false, message: "Device not found." };

  await prisma.userDevice.update({
    where: { id: deviceId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: admin.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "DEVICE_REVOKED",
      entityType: "UserDevice",
      entityId: device.id,
      newValues: {
        studentId: device.userId,
        studentEmail: device.user.email,
        deviceName: device.deviceName,
        browser: device.browser,
        ipAddress: device.lastIpAddress,
      },
    },
  });

  revalidatePath("/admin/devices");
  revalidatePath("/admin/students");
  return { success: true, message: `Device "${device.deviceName || "Unknown"}" revoked successfully.` };
}

// ==========================================
// ADMIN: REVOKE ALL DEVICES FOR STUDENT
// ==========================================

export async function revokeAllStudentDevicesAction(studentId: string): Promise<ActionState> {
  const admin = await requireAdminWrite();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { devices: true },
  });

  if (!student) return { success: false, message: "Student not found." };

  await prisma.$transaction(async (tx) => {
    // 1. Mark all devices as inactive and revoked
    await tx.userDevice.updateMany({
      where: { userId: studentId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: admin.id,
      },
    });

    // 2. Increment tokenVersion to immediately kill all active JWT sessions
    await tx.user.update({
      where: { id: studentId },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "ALL_DEVICES_REVOKED",
        entityType: "User",
        entityId: studentId,
        newValues: {
          studentEmail: student.email,
          revokedDevicesCount: student.devices.length,
        },
      },
    });
  });

  revalidatePath("/admin/devices");
  revalidatePath("/admin/students");
  return { success: true, message: `All active sessions and devices revoked for ${student.email}.` };
}

// ==========================================
// ADMIN: UNBLOCK STUDENT ACCOUNT
// ==========================================

export async function unblockStudentAccountAction(
  studentId: string,
  resetDeviceHistory: boolean = false
): Promise<ActionState> {
  const admin = await requireAdminWrite();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { devices: true },
  });

  if (!student) return { success: false, message: "Student not found." };

  await prisma.$transaction(async (tx) => {
    // 1. Change user status back to ACTIVE and increment tokenVersion for security
    await tx.user.update({
      where: { id: studentId },
      data: {
        status: "ACTIVE",
        tokenVersion: { increment: 1 },
      },
    });

    // 2. Handle device history reset
    if (resetDeviceHistory) {
      // Clear past device records so student starts with a clean 2-device allowance
      await tx.userDevice.deleteMany({
        where: { userId: studentId },
      });
    } else {
      // Keep historical records but deactivate all active sessions
      await tx.userDevice.updateMany({
        where: { userId: studentId },
        data: {
          isActive: false,
        },
      });
    }

    // 3. Record Audit Log
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "ACCOUNT_UNBLOCKED",
        entityType: "User",
        entityId: studentId,
        newValues: {
          studentEmail: student.email,
          resetDeviceHistory,
          previousStatus: student.status,
        },
      },
    });
  });

  revalidatePath("/admin/devices");
  revalidatePath("/admin/students");
  return {
    success: true,
    message: `Student account ${student.email} has been unblocked. Student can now log in.`,
  };
}

// ==========================================
// STUDENT: GET CURRENT STUDENT'S RECOGNIZED DEVICES
// ==========================================

export async function getStudentMyDevicesAction() {
  const user = await requireAuth();

  const devices = await prisma.userDevice.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      deviceName: true,
      browser: true,
      operatingSystem: true,
      firstSeenAt: true,
      lastSeenAt: true,
      lastLoginAt: true,
      isActive: true,
      revokedAt: true,
    },
  });

  return {
    devices,
    maxAllowedDevices: 2,
    registeredCount: devices.length,
    accountStatus: user.status,
  };
}
