"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth, isSuperAdminUser } from "@/server/dal/auth";
import {
  resolveCurrentEnvironment,
  signEnvToken,
  ENV_COOKIE_NAME,
  type AppEnvironment,
} from "@/lib/env-context";
import { prisma } from "@/lib/prisma";

/**
 * Server action to switch the Super Admin's session environment between LIVE and TEST.
 * Strictly enforced server-side for SUPER_ADMIN role only.
 */
export async function switchEnvironmentAction(targetEnv: AppEnvironment): Promise<{
  success: boolean;
  environment?: AppEnvironment;
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
      const token = await signEnvToken({
        env: "TEST",
        userId: user.id,
        email: user.email,
      });

      cookieStore.set(ENV_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
      });
    } else {
      cookieStore.delete(ENV_COOKIE_NAME);
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
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to switch environment.",
    };
  }
}

/**
 * Returns current environment and authorization status for UI indicators
 */
export async function getCurrentEnvironmentAction(): Promise<{
  environment: AppEnvironment;
  isSuperAdmin: boolean;
}> {
  try {
    const user = await requireAuth();
    const isSuper = isSuperAdminUser(user);
    const env = await resolveCurrentEnvironment();

    return {
      environment: isSuper ? env : "LIVE",
      isSuperAdmin: isSuper,
    };
  } catch {
    return {
      environment: "LIVE",
      isSuperAdmin: false,
    };
  }
}
