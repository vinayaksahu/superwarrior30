"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth, isSuperAdminUser, isStaffAdminUser } from "@/server/dal/auth";
import {
  resolveCurrentEnvironment,
  signEnvToken,
  setStaffTestingActive,
  isStaffTestingActive,
  ENV_COOKIE_NAME,
  STAFF_ENV_COOKIE_NAME,
  type AppEnvironment,
} from "@/lib/env-context";
import { prisma } from "@/lib/prisma";

/**
 * Checks database for global staff testing permission
 */
export async function isStaffTestingAllowedInDb(): Promise<boolean> {
  try {
    const { getProductionPrismaClient } = await import("@/lib/prisma");
    const setting = await getProductionPrismaClient().siteSetting.findUnique({
      where: { key: "test_mode_include_staff" },
    });
    if (setting) {
      const allowed = setting.value === "true";
      setStaffTestingActive(allowed);
      return allowed;
    }
    return isStaffTestingActive();
  } catch {
    return isStaffTestingActive();
  }
}

/**
 * Master server action for Super Admin to switch environment between LIVE and TEST.
 * Supports optional allowStaffTesting flag to grant testing permissions to staff members.
 * Strictly enforced server-side for SUPER_ADMIN role only.
 */
export async function switchEnvironmentAction(
  targetEnv: AppEnvironment,
  allowStaffTesting: boolean = false
): Promise<{
  success: boolean;
  environment?: AppEnvironment;
  staffTestingActive?: boolean;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    if (!isSuperAdminUser(user)) {
      return {
        success: false,
        error: "Access Denied: Only SUPER_ADMIN can switch platform environment.",
      };
    }

    if (targetEnv !== "LIVE" && targetEnv !== "TEST") {
      return {
        success: false,
        error: "Invalid target environment specified.",
      };
    }

    const previousEnv = await resolveCurrentEnvironment();
    const cookieStore = await cookies();

    if (targetEnv === "TEST") {
      setStaffTestingActive(allowStaffTesting);

      const token = await signEnvToken({
        env: "TEST",
        userId: user.id,
        email: user.email,
        allowStaffTesting,
      });

      cookieStore.set(ENV_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
      });

      // Persist setting in database
      try {
        await prisma.siteSetting.upsert({
          where: { key: "test_mode_include_staff" },
          update: { value: allowStaffTesting ? "true" : "false" },
          create: {
            key: "test_mode_include_staff",
            value: allowStaffTesting ? "true" : "false",
            type: "boolean",
          },
        });
      } catch {
        // Non-blocking
      }
    } else {
      setStaffTestingActive(false);
      cookieStore.delete(ENV_COOKIE_NAME);

      try {
        await prisma.siteSetting.upsert({
          where: { key: "test_mode_include_staff" },
          update: { value: "false" },
          create: {
            key: "test_mode_include_staff",
            value: "false",
            type: "boolean",
          },
        });
      } catch {
        // Non-blocking
      }
    }

    // Audit logging for environment switch
    try {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "ENVIRONMENT_SWITCH",
          entityType: "System",
          entityId: "APP_ENVIRONMENT",
          newValues: {
            previousEnvironment: previousEnv,
            newEnvironment: targetEnv,
            allowStaffTesting,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Non-blocking if auditLog table is syncing
    }

    // Revalidate all administrative paths to reflect the target database data
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/students");
    revalidatePath("/admin/withdrawals");
    revalidatePath("/admin/wallet");
    revalidatePath("/admin/support");
    revalidatePath("/admin/settings");

    return {
      success: true,
      environment: targetEnv,
      staffTestingActive: allowStaffTesting,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to switch environment.",
    };
  }
}

/**
 * Super Admin quick-toggle to enable/disable staff testing while already in TEST mode
 */
export async function toggleStaffTestingAction(enabled: boolean): Promise<{
  success: boolean;
  staffTestingActive: boolean;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    if (!isSuperAdminUser(user)) {
      return {
        success: false,
        staffTestingActive: isStaffTestingActive(),
        error: "Access Denied: Only SUPER_ADMIN can toggle staff testing.",
      };
    }

    setStaffTestingActive(enabled);

    const cookieStore = await cookies();
    const token = await signEnvToken({
      env: "TEST",
      userId: user.id,
      email: user.email,
      allowStaffTesting: enabled,
    });

    cookieStore.set(ENV_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    try {
      await prisma.siteSetting.upsert({
        where: { key: "test_mode_include_staff" },
        update: { value: enabled ? "true" : "false" },
        create: {
          key: "test_mode_include_staff",
          value: enabled ? "true" : "false",
          type: "boolean",
        },
      });
    } catch {
      // Non-blocking
    }

    revalidatePath("/admin", "layout");

    return {
      success: true,
      staffTestingActive: enabled,
    };
  } catch (err: any) {
    return {
      success: false,
      staffTestingActive: isStaffTestingActive(),
      error: err?.message || "Failed to update staff testing setting.",
    };
  }
}

/**
 * Staff Admin individual action to toggle testing mode for their own session.
 * Checks database directly so it works seamlessly across serverless instances.
 */
export async function switchStaffEnvironmentAction(targetEnv: AppEnvironment): Promise<{
  success: boolean;
  environment?: AppEnvironment;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    if (!isStaffAdminUser(user)) {
      return {
        success: false,
        error: "Access Denied: Only Staff Admins can use this action.",
      };
    }

    const isAllowed = await isStaffTestingAllowedInDb();
    if (!isAllowed) {
      return {
        success: false,
        error: "Testing Mode is currently disabled for staff by the Super Admin.",
      };
    }

    if (targetEnv !== "LIVE" && targetEnv !== "TEST") {
      return {
        success: false,
        error: "Invalid target environment.",
      };
    }

    const cookieStore = await cookies();
    const token = await signEnvToken({
      env: targetEnv,
      userId: user.id,
      email: user.email,
    });

    cookieStore.set(STAFF_ENV_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    revalidatePath("/admin", "layout");

    return {
      success: true,
      environment: targetEnv,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to switch staff environment.",
    };
  }
}

/**
 * Returns current environment and authorization status for UI indicators
 */
export async function getCurrentEnvironmentAction(): Promise<{
  environment: AppEnvironment;
  isSuperAdmin: boolean;
  isStaffAdmin: boolean;
  staffTestingAllowed: boolean;
}> {
  try {
    const user = await requireAuth();
    const isSuper = isSuperAdminUser(user);
    const isStaff = isStaffAdminUser(user);
    const env = await resolveCurrentEnvironment();
    const staffAllowed = await isStaffTestingAllowedInDb();

    return {
      environment: env,
      isSuperAdmin: isSuper,
      isStaffAdmin: isStaff,
      staffTestingAllowed: staffAllowed,
    };
  } catch {
    return {
      environment: "LIVE",
      isSuperAdmin: false,
      isStaffAdmin: false,
      staffTestingAllowed: false,
    };
  }
}
