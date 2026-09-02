import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isSuperAdminUser } from "@/server/dal/auth-check";
import { decrypt, type SessionPayload } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export type AppEnvironment = "LIVE" | "TEST";

export const ENV_COOKIE_NAME = "sw30_admin_env";
export const DEFAULT_ENVIRONMENT: AppEnvironment = "LIVE";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "fallback_dev_secret_key_64_characters_long_min_for_hs256_algo";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

// AsyncLocalStorage to maintain environment context across async execution tree
const environmentStorage = new AsyncLocalStorage<AppEnvironment>();

export interface EnvTokenPayload {
  env: AppEnvironment;
  userId: string;
  email: string;
  issuedAt: number;
}

/**
 * Runs a callback within an explicit environment context
 */
export function withEnvironmentContext<T>(env: AppEnvironment, callback: () => T): T {
  return environmentStorage.run(env, callback);
}

/**
 * Encrypts/signs an environment token for the Super Admin
 */
export async function signEnvToken(payload: Omit<EnvTokenPayload, "issuedAt">): Promise<string> {
  return new SignJWT({
    env: payload.env,
    userId: payload.userId,
    email: payload.email,
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
 * 3. Default: "LIVE"
 * 
 * Enforces server-side authorization: If a non-super-admin user attempts to send
 * a TEST environment cookie, it is rejected and strictly resolved as LIVE.
 */
export async function resolveCurrentEnvironment(): Promise<AppEnvironment> {
  // 1. Check AsyncLocalStorage
  const alsEnv = environmentStorage.getStore();
  if (alsEnv) {
    return alsEnv;
  }

  // 2. Read cookies
  try {
    const cookieStore = await cookies();
    const envToken = cookieStore.get(ENV_COOKIE_NAME)?.value;
    if (!envToken) {
      return DEFAULT_ENVIRONMENT;
    }

    const envPayload = await verifyEnvToken(envToken);
    if (!envPayload || envPayload.env !== "TEST") {
      return DEFAULT_ENVIRONMENT;
    }

    // Verify authenticated session matches Super Admin
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return DEFAULT_ENVIRONMENT;
    }

    const session: SessionPayload | null = await decrypt(sessionToken);
    if (!session) {
      return DEFAULT_ENVIRONMENT;
    }

    // Strictly enforce Super Admin identity server-side
    const isSuper = isSuperAdminUser({
      role: session.role,
      email: session.email,
    });

    if (isSuper && session.userId === envPayload.userId && session.email.toLowerCase() === envPayload.email.toLowerCase()) {
      return "TEST";
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
