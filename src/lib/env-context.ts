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
  // 1. Check if an admin has an active environment token with a chosen scope
  try {
    const cookieStore = await cookies();
    const envToken = cookieStore.get(ENV_COOKIE_NAME)?.value;
    if (envToken) {
      const payload = await verifyEnvToken(envToken);
      if (payload?.visibilityScope) {
        setCachedTestVisibilityScope(payload.visibilityScope);
        return payload.visibilityScope;
      }
    }
  } catch {
    // Ignore in non-request contexts
  }

  // 2. Check process memory cache
  if (globalForEnv.testVisibilityScope) {
    return globalForEnv.testVisibilityScope;
  }

  // 3. Check database siteSetting
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
 * - IF scope is ADMINS_ONLY -> strictly LIVE in all cases.
 * - IF scope is ADMINS_AND_HOMEPAGE:
 *     - If admin/staff session is in TEST mode -> TEST preview
 *     - If global test_mode_active is "true" in database -> TEST preview
 *     - Otherwise -> LIVE
 */
export async function resolvePublicHomepageEnvironment(): Promise<AppEnvironment> {
  const alsEnv = environmentStorage.getStore();
  if (alsEnv) {
    return alsEnv;
  }

  const visibilityScope = await resolveTestVisibilityScope();
  if (visibilityScope !== "ADMINS_AND_HOMEPAGE") {
    return "LIVE";
  }

  const currentEnv = await resolveCurrentEnvironment();
  if (currentEnv === "TEST") {
    return "TEST";
  }

  try {
    const { getProductionPrismaClient } = await import("@/lib/prisma");
    const activeSetting = await getProductionPrismaClient().siteSetting.findUnique({
      where: { key: "test_mode_active" },
    });
    if (activeSetting && activeSetting.value === "true") {
      return "TEST";
    }
  } catch {
    // Fail-safe
  }

  return "LIVE";
}

export interface EnvTokenPayload {
  env: AppEnvironment;
  userId: string;
  email: string;
  allowStaffTesting?: boolean;
  visibilityScope?: TestVisibilityScope;
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
    visibilityScope: payload.visibilityScope || "ADMINS_ONLY",
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

    const visibilityScope =
      payload.visibilityScope === "ADMINS_AND_HOMEPAGE" || payload.visibilityScope === "ADMINS_ONLY"
        ? (payload.visibilityScope as TestVisibilityScope)
        : undefined;

    return {
      env,
      userId: payload.userId as string,
      email: payload.email as string,
      allowStaffTesting: Boolean(payload.allowStaffTesting),
      visibilityScope,
      issuedAt: (payload.issuedAt as number) || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the active environment for the current request context.
 * 
 * Hierarchy:
 * 1. AsyncLocalStorage context (if explicitly set via withEnvironmentContext)
 * 2. Super Admin authenticated session + verified signed env cookie (sw30_admin_env)
 * 3. Staff Admin authenticated session + active staff testing authorization (with per-staff toggle override via sw30_staff_env)
 * 4. Default: "LIVE"
 * 
 * Enforces server-side authorization: Standard users / students / public traffic ALWAYS run in LIVE mode.
 */
export async function resolveCurrentEnvironment(): Promise<AppEnvironment> {
  // 1. Check AsyncLocalStorage first (for explicit overrides e.g. public homepage test scope)
  const alsEnv = environmentStorage.getStore();
  if (alsEnv) {
    return alsEnv;
  }

  // 2. Read session & cookies
  try {
    const cookieStore = await cookies();

    // Check if Super Admin test token is active in cookies
    const envToken = cookieStore.get(ENV_COOKIE_NAME)?.value;
    if (envToken) {
      const envPayload = await verifyEnvToken(envToken);
      if (envPayload && envPayload.env === "TEST") {
        if (envPayload.allowStaffTesting !== undefined) {
          setStaffTestingActive(envPayload.allowStaffTesting);
        }
        return "TEST";
      }
    }

    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      const session: SessionPayload | null = await decrypt(sessionToken);
      if (session) {
        // 1. If session explicitly contains isTestData
        if (session.isTestData) {
          return "TEST";
        }

        // 2. Check if Super Admin
        const isSuper = isSuperAdminUser({
          role: session.role,
          email: session.email,
        });

        if (isSuper) {
          if (envToken) {
            const envPayload = await verifyEnvToken(envToken);
            if (envPayload && envPayload.env === "TEST") {
              return "TEST";
            }
          }
          return DEFAULT_ENVIRONMENT;
        }

        // 3. Check if Staff Admin has access to test mode
        const isStaff = isStaffAdminUser({
          role: session.role,
          email: session.email,
        });

        if (isStaff) {
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

          if (!staffAllowed) {
            return DEFAULT_ENVIRONMENT;
          }

          const staffEnvToken = cookieStore.get(STAFF_ENV_COOKIE_NAME)?.value;
          if (staffEnvToken) {
            const staffPayload = await verifyEnvToken(staffEnvToken);
            if (staffPayload && staffPayload.userId === session.userId) {
              return staffPayload.env;
            }
          }

          return "TEST";
        }

        // 4. Check if student account belongs to Testing environment
        if (session.userId) {
          try {
            const { getTestPrismaClient } = await import("@/lib/prisma");
            const testUser = await getTestPrismaClient().user.findUnique({
              where: { id: session.userId },
              select: { id: true, isTestData: true },
            });
            if (testUser && testUser.isTestData) {
              return "TEST";
            }
          } catch {
            // Fallback
          }
        }
      }
    }

    // 3. Check if Public Testing Scope is active (Scope: Admins + Homepage)
    const visibilityScope = await resolveTestVisibilityScope();
    if (visibilityScope === "ADMINS_AND_HOMEPAGE") {
      try {
        const { getProductionPrismaClient } = await import("@/lib/prisma");
        const setting = await getProductionPrismaClient().siteSetting.findUnique({
          where: { key: "test_mode_active" },
        });
        if (setting && setting.value === "true") {
          return "TEST";
        }
      } catch {
        // Fallback
      }
    }

    return DEFAULT_ENVIRONMENT;
  } catch {
    // If running outside request context (e.g., CLI / background), fallback to DEFAULT_ENVIRONMENT
    return DEFAULT_ENVIRONMENT;
  }
}

/**
 * Helper to get current synchronous environment if stored in ALS, otherwise returns undefined
 */
export function getSyncEnvironmentContext(): AppEnvironment | undefined {
  return environmentStorage.getStore();
}
