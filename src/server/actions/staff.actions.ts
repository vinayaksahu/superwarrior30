"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/server/dal/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateReferralCode } from "@/lib/utils";
import { UserRole, UserStatus } from "@/generated/prisma";
import type { ActionState } from "@/types";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT";
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Date;
  permissionsScope: string;
}

export async function getStaffMembersAction(): Promise<{
  currentUserRole: string;
  staff: StaffMember[];
}> {
  const currentSuperAdmin = await requireSuperAdmin();

  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT] },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const staff: StaffMember[] = users.map((u) => {
    const isRoot = u.role === "SUPER_ADMIN" || u.email === "admin@superwarrior30.com";
    const effectiveRole: "SUPER_ADMIN" | "ADMIN" | "SUPPORT" = isRoot
      ? "SUPER_ADMIN"
      : (u.role as "ADMIN" | "SUPPORT");

    let permissionsScope = "";
    if (effectiveRole === "SUPER_ADMIN") {
      permissionsScope = "Full platform authority. Manages administrators, system settings, financials & payouts.";
    } else if (effectiveRole === "ADMIN") {
      permissionsScope = "General administration with standard operations: courses, students, orders & coupon control.";
    } else {
      permissionsScope = "Read-only access for auditing dashboards, students, orders, and customer support inquiries.";
    }

    return {
      id: u.id,
      name: u.name || "Administrator",
      email: u.email,
      role: effectiveRole,
      status: u.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
      createdAt: u.createdAt,
      permissionsScope,
    };
  });

  const isCurrentSuper =
    currentSuperAdmin.role === "SUPER_ADMIN" ||
    currentSuperAdmin.role === "ADMIN" ||
    currentSuperAdmin.email === "admin@superwarrior30.com";

  return {
    currentUserRole: isCurrentSuper ? "SUPER_ADMIN" : currentSuperAdmin.role,
    staff,
  };
}

export async function createStaffAccountAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().toLowerCase().trim();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() as "ADMIN" | "SUPPORT";

  if (!name || name.length < 2) {
    return { success: false, message: "Please provide a valid full name." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Please provide a valid email address." };
  }

  if (!password || password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters long." };
  }

  if (!["ADMIN", "SUPPORT"].includes(role)) {
    return { success: false, message: "Invalid role selected." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, message: "A user account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const referralCode = generateReferralCode();

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as UserRole,
      status: UserStatus.ACTIVE,
      referralCode,
      tokenVersion: 1,
    },
  });

  // Create wallet for staff
  await prisma.wallet.create({
    data: { userId: newUser.id },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      actorRole: superAdmin.role,
      action: "STAFF_CREATED",
      entityType: "User",
      entityId: newUser.id,
      newValues: { name, email, role },
    },
  });

  revalidatePath("/admin/staff");
  return { success: true, message: `Staff member ${name} created successfully with role ${role}.` };
}

export async function updateStaffRoleAction(
  staffId: string,
  newRole: "ADMIN" | "SUPPORT"
): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();

  if (superAdmin.id === staffId) {
    return { success: false, message: "You cannot demote your own Super Admin root account." };
  }

  const target = await prisma.user.findUnique({ where: { id: staffId } });
  if (!target) {
    return { success: false, message: "Staff account not found." };
  }

  if (target.role === "SUPER_ADMIN") {
    return { success: false, message: "Root Super Admin role cannot be modified." };
  }

  await prisma.user.update({
    where: { id: staffId },
    data: {
      role: newRole as UserRole,
      tokenVersion: { increment: 1 }, // Revoke active sessions
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      actorRole: superAdmin.role,
      action: "STAFF_ROLE_UPDATED",
      entityType: "User",
      entityId: staffId,
      oldValues: { role: target.role },
      newValues: { role: newRole },
    },
  });

  revalidatePath("/admin/staff");
  return { success: true, message: `Role updated to ${newRole}. Active sessions revoked.` };
}

export async function toggleStaffStatusAction(staffId: string): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();

  if (superAdmin.id === staffId) {
    return { success: false, message: "You cannot deactivate your own Super Admin root account." };
  }

  const target = await prisma.user.findUnique({ where: { id: staffId } });
  if (!target) {
    return { success: false, message: "Staff account not found." };
  }

  if (target.role === "SUPER_ADMIN") {
    return { success: false, message: "Root Super Admin cannot be deactivated." };
  }

  const nextStatus = target.status === "ACTIVE" ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;

  await prisma.user.update({
    where: { id: staffId },
    data: {
      status: nextStatus,
      tokenVersion: { increment: 1 },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      actorRole: superAdmin.role,
      action: nextStatus === UserStatus.ACTIVE ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
      entityType: "User",
      entityId: staffId,
      oldValues: { status: target.status },
      newValues: { status: nextStatus },
    },
  });

  revalidatePath("/admin/staff");
  return {
    success: true,
    message: `Account for ${target.name || target.email} is now ${nextStatus.toLowerCase()}.`,
  };
}
