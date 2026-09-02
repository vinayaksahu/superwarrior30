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
  type AppEnvironment,
} from "@/lib/env-context";
import { prisma } from "@/lib/prisma";

/**
 * Server action to switch the Super Admin's session environment between LIVE and TEST.
 * Supports optional allowStaffTesting flag to include sub-admins/staff in testing.
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
        error: "Access Denied: Only SUPER_ADMIN can switch environments.",
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
 * Returns current environment and authorization status for UI indicators
 */
export async function getCurrentEnvironmentAction(): Promise<{
  environment: AppEnvironment;
  isSuperAdmin: boolean;
  isStaffAdmin: boolean;
  staffTestingActive: boolean;
}> {
  try {
    const user = await requireAuth();
    const isSuper = isSuperAdminUser(user);
    const isStaff = isStaffAdminUser(user);
    const env = await resolveCurrentEnvironment();

    return {
      environment: env,
      isSuperAdmin: isSuper,
      isStaffAdmin: isStaff,
      staffTestingActive: isStaffTestingActive(),
    };
  } catch {
    return {
      environment: "LIVE",
      isSuperAdmin: false,
      isStaffAdmin: false,
      staffTestingActive: false,
    };
  }
}
