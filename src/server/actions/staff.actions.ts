"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin, requirePermission } from "@/server/dal/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateReferralCode } from "@/lib/utils";
import { UserRole, UserStatus } from "@/generated/prisma";
import {
  type AdminRoleType,
  ROLE_PRESETS,
  getRolePresentation,
  getEffectivePermissions,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";
import type { ActionState } from "@/types";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  baseRole: string;
  adminRole: AdminRoleType;
  displayName: string;
  badgeLabel: string;
  badgeColorClass: string;
  customPermissions: string[];
  permissionsScope: string;
  permissionsCount: number;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Date;
}

export async function getStaffMembersAction(): Promise<{
  currentUserRole: string;
  isSuperAdmin: boolean;
  canAssignRoles: boolean;
  canCreateDeactivate: boolean;
  staff: StaffMember[];
}> {
  const currentUser = await requireAdmin();
  const email = (currentUser.email || "").toLowerCase().trim();
  const isSuper =
    email === "vinayaksahu3@gmail.com" ||
    email === "admin@superwarrior30.com";

  const userPerms = getEffectivePermissions(currentUser);
  const canAssignRoles = isSuper || userPerms.has("staff.roles_assign");
  const canCreateDeactivate = isSuper || userPerms.has("staff.create_deactivate");

  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: UserRole.STUDENT },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        customPermissions: true,
        status: true,
        createdAt: true,
      },
    });

    const staff: StaffMember[] = (users || []).map((u) => {
      const presentation = getRolePresentation(u.role, u.adminRole, u.email);
      const isTargetSuper = presentation.effectiveRoleKey === "SUPER_ADMIN";

      let customPerms: string[] = [];
      if (Array.isArray(u.customPermissions)) {
        customPerms = u.customPermissions.map(String);
      }

      const effectivePerms = getEffectivePermissions({
        role: u.role,
        adminRole: u.adminRole || (isTargetSuper ? "SUPER_ADMIN" : u.role === "SUPPORT" ? "SUPPORT" : "FULL_ACCESS_ADMIN"),
        customPermissions: customPerms,
        email: u.email,
      });

      let permissionsScope = "";
      if (isTargetSuper) {
        permissionsScope = "Full platform authority. Unrestricted management of administrators, financials & security.";
      } else if (presentation.effectiveRoleKey === "FULL_ACCESS_ADMIN") {
        permissionsScope = "Full operations: courses, orders, students, referrals, marketing & settings.";
      } else if (presentation.effectiveRoleKey === "SUPPORT") {
        permissionsScope = "Support Desk operations, student inquiries and view-only order details.";
      } else if (presentation.effectiveRoleKey === "VIEWER") {
        permissionsScope = "Read-only auditing across permitted platform modules.";
      } else if (presentation.effectiveRoleKey === "FINANCE") {
        permissionsScope = "Orders, ledger, withdrawal processing, payment methods & cashback payouts.";
      } else if (presentation.effectiveRoleKey === "MARKETING") {
        permissionsScope = "Affiliate tiers, coupons, leads CRM, testimonials & conversion funnels.";
      } else {
        permissionsScope = `Custom granular permission matrix (${effectivePerms.size} assigned permissions).`;
      }

      return {
        id: u.id,
        name: u.name || "Administrator",
        email: u.email,
        baseRole: u.role,
        adminRole: presentation.effectiveRoleKey,
        displayName: presentation.displayName,
        badgeLabel: presentation.badgeLabel,
        badgeColorClass: presentation.badgeColorClass,
        customPermissions: customPerms,
        permissionsScope,
        permissionsCount: isTargetSuper ? ALL_PERMISSION_KEYS.length : effectivePerms.size,
        status: u.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
        createdAt: u.createdAt,
      };
    });

    // If viewing as Super Admin and list is empty, add self
    if (isSuper && staff.length === 0) {
      staff.push({
        id: currentUser.id,
        name: currentUser.name || "Super Admin",
        email: currentUser.email,
        baseRole: "SUPER_ADMIN",
        adminRole: "SUPER_ADMIN",
        displayName: "Super Admin",
        badgeLabel: "SUPER_ADMIN",
        badgeColorClass: "bg-destructive/15 text-destructive border border-destructive/30",
        customPermissions: [],
        permissionsScope: "Full platform authority. Unrestricted management of administrators, financials & security.",
        permissionsCount: ALL_PERMISSION_KEYS.length,
        status: "ACTIVE",
        createdAt: currentUser.createdAt,
      });
    }

    // STRICT PRIVACY RULE: Subadmins must NEVER see Super Admin in staff list!
    const visibleStaff = staff.filter((s) => {
      if (isSuper) return true;
      return (
        s.adminRole !== "SUPER_ADMIN" &&
        s.baseRole !== "SUPER_ADMIN" &&
        s.email !== "vinayaksahu3@gmail.com" &&
        s.email !== "admin@superwarrior30.com"
      );
    });

    return {
      currentUserRole: isSuper ? "SUPER_ADMIN" : "SUB_ADMIN",
      isSuperAdmin: isSuper,
      canAssignRoles,
      canCreateDeactivate,
      staff: visibleStaff,
    };
  } catch (error) {
    console.error("Error loading staff members:", error);
    return {
      currentUserRole: isSuper ? "SUPER_ADMIN" : "SUB_ADMIN",
      isSuperAdmin: isSuper,
      canAssignRoles: isSuper,
      canCreateDeactivate: isSuper,
      staff: [],
    };
  }
}

export async function createStaffAccountAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("staff.create_deactivate");

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().toLowerCase().trim();
  const password = formData.get("password")?.toString();
  const adminRole = (formData.get("adminRole")?.toString() || "FULL_ACCESS_ADMIN") as AdminRoleType;
  const customPermissionsRaw = formData.get("customPermissions")?.toString();

  if (!name || name.length < 2) {
    return { success: false, message: "Please provide a valid full name." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Please provide a valid email address." };
  }

  if (!password || password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters long." };
  }

  // Super Admin creation protection
  if (adminRole === "SUPER_ADMIN") {
    return { success: false, message: "Root SUPER_ADMIN accounts cannot be created through this action." };
  }

  if (!(adminRole in ROLE_PRESETS)) {
    return { success: false, message: "Invalid role selected." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, message: "A user account with this email already exists." };
  }

  let customPermissions: string[] = [];
  if (adminRole === "CUSTOM_ROLE" && customPermissionsRaw) {
    try {
      customPermissions = JSON.parse(customPermissionsRaw);
    } catch {
      customPermissions = [];
    }
  }

  // Base role mapping for backward compatibility
  let baseRole: UserRole = UserRole.ADMIN;
  if (adminRole === "SUPPORT" || adminRole === "VIEWER") {
    baseRole = UserRole.SUPPORT;
  }

  const passwordHash = await hashPassword(password);
  const referralCode = generateReferralCode();

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: baseRole,
        adminRole,
        customPermissions: adminRole === "CUSTOM_ROLE" ? customPermissions : [],
        status: UserStatus.ACTIVE,
        referralCode,
        tokenVersion: 1,
      },
    });

    await prisma.wallet.create({
      data: { userId: newUser.id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "STAFF_CREATED",
        entityType: "User",
        entityId: newUser.id,
        newValues: {
          name,
          email,
          adminRole,
          customPermissionsCount: customPermissions.length,
        },
      },
    });

    revalidatePath("/admin/staff");
    return {
      success: true,
      message: `Staff member ${name} created successfully with role ${ROLE_PRESETS[adminRole].displayName}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create staff account";
    return { success: false, message: msg };
  }
}

export async function updateStaffRoleAction(
  staffId: string,
  newAdminRole: AdminRoleType,
  customPermissions: string[] = []
): Promise<ActionState> {
  const actor = await requirePermission("staff.roles_assign");

  if (actor.id === staffId) {
    return { success: false, message: "You cannot modify or demote your own account role directly." };
  }

  // Reject promoting another account to SUPER_ADMIN
  if (newAdminRole === "SUPER_ADMIN") {
    return { success: false, message: "Only one Root Super Admin account is permitted. Promotion to SUPER_ADMIN is forbidden." };
  }

  if (!(newAdminRole in ROLE_PRESETS)) {
    return { success: false, message: "Invalid role selected." };
  }

  const target = await prisma.user.findUnique({ where: { id: staffId } });
  if (!target) {
    return { success: false, message: "Staff account not found." };
  }

  // Super Admin target protection
  const targetPresentation = getRolePresentation(target.role, target.adminRole, target.email);
  if (
    targetPresentation.effectiveRoleKey === "SUPER_ADMIN" ||
    target.role === "SUPER_ADMIN" ||
    target.email === "vinayaksahu3@gmail.com" ||
    target.email === "admin@superwarrior30.com"
  ) {
    return { success: false, message: "Root Super Admin account cannot be modified or downgraded." };
  }

  // Calculate base role mapping
  let baseRole: UserRole = UserRole.ADMIN;
  if (newAdminRole === "SUPPORT" || newAdminRole === "VIEWER") {
    baseRole = UserRole.SUPPORT;
  }

  const finalCustomPermissions = newAdminRole === "CUSTOM_ROLE" ? customPermissions : [];

  try {
    await prisma.user.update({
      where: { id: staffId },
      data: {
        role: baseRole,
        adminRole: newAdminRole,
        customPermissions: finalCustomPermissions,
        tokenVersion: { increment: 1 }, // Invalidate active JWT sessions for security
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "STAFF_ROLE_UPDATED",
        entityType: "User",
        entityId: staffId,
        oldValues: {
          previousAdminRole: target.adminRole || target.role,
          previousPermissions: target.customPermissions,
        },
        newValues: {
          newAdminRole,
          customPermissionsCount: finalCustomPermissions.length,
        },
      },
    });

    revalidatePath("/admin/staff");
    return {
      success: true,
      message: `Role for ${target.name || target.email} updated to ${ROLE_PRESETS[newAdminRole].displayName}. Active sessions refreshed.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update staff role";
    return { success: false, message: msg };
  }
}

export async function toggleStaffStatusAction(staffId: string): Promise<ActionState> {
  const actor = await requirePermission("staff.create_deactivate");

  if (actor.id === staffId) {
    return { success: false, message: "You cannot deactivate your own account." };
  }

  const target = await prisma.user.findUnique({ where: { id: staffId } });
  if (!target) {
    return { success: false, message: "Staff account not found." };
  }

  const targetPresentation = getRolePresentation(target.role, target.adminRole, target.email);
  if (
    targetPresentation.effectiveRoleKey === "SUPER_ADMIN" ||
    target.role === "SUPER_ADMIN" ||
    target.email === "vinayaksahu3@gmail.com" ||
    target.email === "admin@superwarrior30.com"
  ) {
    return { success: false, message: "Root Super Admin cannot be deactivated." };
  }

  const nextStatus = target.status === UserStatus.ACTIVE ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;

  try {
    await prisma.user.update({
      where: { id: staffId },
      data: {
        status: nextStatus,
        tokenVersion: { increment: 1 },
      },
    });

    if (nextStatus === UserStatus.ACTIVE) {
      // Clear past device locks so staff can log in freely
      await prisma.userDevice.deleteMany({
        where: { userId: staffId },
      }).catch(() => {});
    }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle staff status";
    return { success: false, message: msg };
  }
}
