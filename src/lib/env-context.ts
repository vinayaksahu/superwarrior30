import "server-only";
import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isSuperAdminUser, isStaffAdminUser } from "@/server/dal/auth-check";
import { decrypt, type SessionPayload } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export type AppEnvironment = "LIVE" | "TEST";
export type TestVisibilityScope = "ADMINS_ONLY" | "ADMINS_AND_HOMEPAGE";

export const ENV_COOKIE_NAME = "sw30_admin_env";
export const STAFF_ENV_COOKIE_NAME = "sw30_staff_env";
export const DEFAULT_ENVIRONMENT: AppEnvironment = "LIVE";
export const DEFAULT_VISIBILITY_SCOPE: TestVisibilityScope = "ADMINS_ONLY";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "fallback_dev_secret_key_64_characters_long_min_for_hs256_algo";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

// AsyncLocalStorage to maintain environment context across async execution tree
const environmentStorage = new AsyncLocalStorage<AppEnvironment>();

// In-memory global state for staff testing activation & visibility scope (fast resolution cache)
const globalForEnv = globalThis as unknown as {
  staffTestingActive: boolean | undefined;
  testVisibilityScope: TestVisibilityScope | undefined;
};

export function setStaffTestingActive(active: boolean) {
  globalForEnv.staffTestingActive = active;
}

export function isStaffTestingActive(): boolean {
  return Boolean(globalForEnv.staffTestingActive);
}

export function setCachedTestVisibilityScope(scope: TestVisibilityScope) {
  globalForEnv.testVisibilityScope = scope;
}

export function getCachedTestVisibilityScope(): TestVisibilityScope {
  return globalForEnv.testVisibilityScope || DEFAULT_VISIBILITY_SCOPE;
}

/**
 * Resolves the testing mode visibility scope (ADMINS_ONLY vs ADMINS_AND_HOMEPAGE)
 */
export async function resolveTestVisibilityScope(): Promise<TestVisibilityScope> {
  if (globalForEnv.testVisibilityScope) {
    return globalForEnv.testVisibilityScope;
  }

  try {
    const { getProductionPrismaClient } = await import("@/lib/prisma");
    const setting = await getProductionPrismaClient().siteSetting.findUnique({
      where: { key: "test_mode_visibility_scope" },
    });
    if (setting && (setting.value === "ADMINS_ONLY" || setting.value === "ADMINS_AND_HOMEPAGE")) {
      const scope = setting.value as TestVisibilityScope;
      setCachedTestVisibilityScope(scope);
      return scope;
    }
  } catch {
    // Fail-safe fallback
  }

  return DEFAULT_VISIBILITY_SCOPE;
}

/**
 * Resolves the active data environment specifically for the public homepage.
 * - IF environment is LIVE -> strictly LIVE
 * - IF environment is TEST AND scope is ADMINS_ONLY -> strictly LIVE
 * - IF environment is TEST AND scope is ADMINS_AND_HOMEPAGE -> TEST preview
 */
export async function resolvePublicHomepageEnvironment(): Promise<AppEnvironment> {
  const currentEnv = await resolveCurrentEnvironment();
  if (currentEnv === "LIVE") {
    return "LIVE";
  }

  const visibilityScope = await resolveTestVisibilityScope();
  if (visibilityScope === "ADMINS_AND_HOMEPAGE") {
    return "TEST";
  }

  return "LIVE";
}

export interface EnvTokenPayload {
  env: AppEnvironment;
  userId: string;
  email: string;
  allowStaffTesting?: boolean;
  issuedAt: number;
}

/**
 * Runs a callback within an explicit environment context
 */
export function withEnvironmentContext<T>(env: AppEnvironment, callback: () => T): T {
  return environmentStorage.run(env, callback);
}

/**
 * Encrypts/signs an environment token
 */
export async function signEnvToken(payload: Omit<EnvTokenPayload, "issuedAt">): Promise<string> {
  return new SignJWT({
    env: payload.env,
    userId: payload.userId,
    email: payload.email,
    allowStaffTesting: Boolean(payload.allowStaffTesting),
    issuedAt: Date.now(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encodedKey);
}

/**
 * Decrypts and validates an environment token
 */
export async function verifyEnvToken(token: string): Promise<EnvTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    const env = payload.env as AppEnvironment;
    if (env !== "LIVE" && env !== "TEST") return null;

    return {
      env,
      userId: payload.userId as string,
      email: payload.email as string,
      allowStaffTesting: Boolean(payload.allowStaffTesting),
      issuedAt: (payload.issuedAt as number) || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the active environment for the current request context.
 * Memoized per-request using React.cache.
 * 
 * Hierarchy:
 * 1. AsyncLocalStorage context (if explicitly set via withEnvironmentContext)
 * 2. Super Admin authenticated session + verified signed env cookie (sw30_admin_env)
 * 3. Staff Admin authenticated session + active staff testing authorization (with per-staff toggle override via sw30_staff_env)
 * 4. Default: "LIVE"
 * 
 * Enforces server-side authorization: Standard users / students / public traffic ALWAYS run in LIVE mode.
 */
export const resolveCurrentEnvironment = cache(async (): Promise<AppEnvironment> => {
  // 1. Check AsyncLocalStorage
  const alsEnv = environmentStorage.getStore();
  if (alsEnv) {
    return alsEnv;
  }

  // 2. Read session & cookies
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return DEFAULT_ENVIRONMENT;
    }

    const session: SessionPayload | null = await decrypt(sessionToken);
    if (!session) {
      return DEFAULT_ENVIRONMENT;
    }

    // Check if Super Admin has active TEST cookie
    const isSuper = isSuperAdminUser({
      role: session.role,
      email: session.email,
    });

    if (isSuper) {
      const envToken = cookieStore.get(ENV_COOKIE_NAME)?.value;
      if (envToken) {
        const envPayload = await verifyEnvToken(envToken);
        if (
          envPayload &&
          envPayload.env === "TEST" &&
          session.userId === envPayload.userId &&
          session.email.toLowerCase() === envPayload.email.toLowerCase()
        ) {
          // Sync staff testing status from Super Admin's token if available
          if (envPayload.allowStaffTesting !== undefined) {
            setStaffTestingActive(envPayload.allowStaffTesting);
          }
          return "TEST";
        }
      }
      return DEFAULT_ENVIRONMENT;
    }

    // Check if Staff Admin has access to test mode
    const isStaff = isStaffAdminUser({
      role: session.role,
      email: session.email,
    });

    if (isStaff) {
      // Check database setting directly to ensure serverless cross-instance sync
      let staffAllowed = isStaffTestingActive();
      if (!staffAllowed) {
        try {
          const { getProductionPrismaClient } = await import("@/lib/prisma");
          const setting = await getProductionPrismaClient().siteSetting.findUnique({
            where: { key: "test_mode_include_staff" },
          });
          if (setting) {
            staffAllowed = setting.value === "true";
            setStaffTestingActive(staffAllowed);
          }
        } catch {
          // Fallback to in-memory state
        }
      }

      // If Super Admin has disabled staff testing -> strictly LIVE
      if (!staffAllowed) {
        return DEFAULT_ENVIRONMENT;
      }

      // Super Admin enabled staff testing -> check staff member's personal preference cookie
      const staffEnvToken = cookieStore.get(STAFF_ENV_COOKIE_NAME)?.value;
      if (staffEnvToken) {
        const staffPayload = await verifyEnvToken(staffEnvToken);
        if (staffPayload && staffPayload.userId === session.userId) {
          return staffPayload.env;
        }
      }

      // Default when Super Admin enables staff testing: TEST
      return "TEST";
    }

    return DEFAULT_ENVIRONMENT;
  } catch {
    // If running outside request context (e.g., CLI / background), fallback to DEFAULT_ENVIRONMENT
    return DEFAULT_ENVIRONMENT;
  }
});

/**
 * Helper to get current synchronous environment if stored in ALS, otherwise returns undefined
 */
export function getSyncEnvironmentContext(): AppEnvironment | undefined {
  return environmentStorage.getStore();
}
