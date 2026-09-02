import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { UserRole } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { isSuperAdminUser, isStaffAdminUser } from "@/server/dal/auth-check";

export { isSuperAdminUser, isStaffAdminUser } from "@/server/dal/auth-check";

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await decrypt(token);
  if (!session?.userId) return null;

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  await ensureDatabaseSchemaSync().catch(() => {});

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        adminRole: true,
        customPermissions: true,
        status: true,
        avatarUrl: true,
        referralCode: true,
        tokenVersion: true,
        createdAt: true,
      },
    });
  } catch {
    // Fallback query if columns are still syncing
    try {
      const basicUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          referralCode: true,
          tokenVersion: true,
          createdAt: true,
        },
      });
      if (basicUser) {
        user = {
          ...basicUser,
          adminRole: basicUser.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : basicUser.role === "SUPPORT" ? "SUPPORT" : "FULL_ACCESS_ADMIN",
          customPermissions: [],
        };
      }
    } catch {
      user = null;
    }
  }

  if (!user || user.status !== "ACTIVE") return null;

  // Session revocation check: if user's tokenVersion was incremented, invalidate session
  if (user.tokenVersion !== session.tokenVersion) return null;

  // Device-level session revocation check (One Active Device enforcement & Revoked Device check)
  if (session.deviceId) {
    const device = await prisma.userDevice.findUnique({
      where: { id: session.deviceId },
      select: {
        id: true,
        userId: true,
        isActive: true,
        revokedAt: true,
      },
    });

    // If device was explicitly revoked or deactivated
    if (device) {
      if (device.userId !== user.id || !device.isActive || device.revokedAt !== null) {
        return null;
      }

      // Async background update of lastSeenAt
      prisma.userDevice
        .update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => {});
    }
  }

  return user;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    // Redirect to API route handler which CAN delete the session cookie.
    // Server Components cannot mutate cookies, so cookies().delete() fails silently here.
    // The API route clears the stale cookie and redirects to /login, breaking the
    // middleware redirect loop (middleware sees valid JWT → /dashboard → requireAuth → /login → repeat).
    redirect("/api/auth/signout");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (!isSuperAdminUser(user)) {
    redirect("/admin");
  }
  return user;
}

export async function requireSuperAdminAction() {
  const user = await requireAuth();
  if (!isSuperAdminUser(user)) {
    throw new Error("Access Denied: Only SUPER_ADMIN can perform this action.");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  const allowedAdminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT];
  if (!allowedAdminRoles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdminWrite() {
  const user = await requireAuth();
  const writeRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  if (!writeRoles.includes(user.role)) {
    throw new Error("Action denied. Your staff account has read-only/support permissions.");
  }
  return user;
}

export async function requirePermission(permission: string) {
  const user = await requireAdmin();
  if (isSuperAdminUser(user)) {
    return user;
  }
  const { hasPermission } = await import("@/lib/permissions");
  if (!hasPermission(user, permission)) {
    throw new Error(`Access Denied: Missing required permission [${permission}].`);
  }
  return user;
}

export async function requireAnyPermission(permissions: string[]) {
  const user = await requireAdmin();
  if (isSuperAdminUser(user)) {
    return user;
  }
  const { hasAnyPermission } = await import("@/lib/permissions");
  if (!hasAnyPermission(user, permissions)) {
    throw new Error(`Access Denied: Missing required permissions.`);
  }
  return user;
}

export async function requireStudent() {
  const user = await requireAuth();
  return user;
}
