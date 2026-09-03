import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveCurrentEnvironment, getSyncEnvironmentContext, type AppEnvironment } from "./env-context";

// Global singletons to prevent multiple connection pools during dev/HMR
const globalForPrisma = globalThis as unknown as {
  productionPrisma: PrismaClient | undefined;
  testPrisma: PrismaClient | undefined;
};

/**
 * Normalizes connection string:
 * - Replaces sslmode=require with sslmode=verify-full
 */
export function normalizeConnectionString(url: string | undefined): string {
  if (!url) return "";
  let normalized = url.trim();
  if (normalized.includes("sslmode=require")) {
    normalized = normalized.replace("sslmode=require", "sslmode=verify-full");
  }
  return normalized;
}

/**
 * Retrieves the configured production database URL.
 */
export function getProductionDatabaseUrl(): string {
  return (
    process.env.DATABASE_PRODUCTION_URL ||
    process.env.PRODUCTION_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

/**
 * Retrieves the configured test database URL.
 * STRICT ISOLATION RULE: NEVER falls back to DATABASE_URL or production database.
 */
export function getTestDatabaseUrl(): string {
  return (
    process.env.DATABASE_TESTING_URL ||
    process.env.TEST_DATABASE_URL ||
    ""
  ).trim();
}

/**
 * Checks if the test database connection string is properly configured.
 */
export function isTestDatabaseConfigured(): boolean {
  return Boolean(getTestDatabaseUrl());
}

/**
 * Checks if the production database connection string is properly configured.
 */
export function isProductionDatabaseConfigured(): boolean {
  return Boolean(getProductionDatabaseUrl());
}

function createFailingPrismaClient(envName: AppEnvironment): PrismaClient {
  const reqVar =
    envName === "TEST"
      ? "TEST_DATABASE_URL (or DATABASE_TESTING_URL)"
      : "DATABASE_URL (or DATABASE_PRODUCTION_URL)";
  const errorMessage = `[CRITICAL DATABASE CONFIGURATION ERROR] Database connection URL for environment '${envName}' is not configured. Expected environment variable '${reqVar}'. Automatic fallback across database environments is strictly prohibited for security and data integrity.`;

  const modelHandler = new Proxy({}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally" || typeof prop === "symbol") {
        return undefined;
      }
      return () => {
        throw new Error(errorMessage);
      };
    },
  });

  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally" || typeof prop === "symbol") {
        return undefined;
      }
      if (typeof prop === "string" && prop.startsWith("$")) {
        return () => {
          throw new Error(errorMessage);
        };
      }
      return modelHandler;
    },
  });
}

/**
 * Creates a PrismaClient connected to the designated connection string.
 * If the connection string is missing, returns a failing proxy that throws a clear, loud error.
 */
function createPrismaClientForUrl(rawUrl: string | undefined, envName: AppEnvironment): PrismaClient {
  const connectionString = normalizeConnectionString(rawUrl);

  if (!connectionString) {
    return createFailingPrismaClient(envName);
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Returns or initializes the Production (LIVE) Prisma Client singleton.
 */
export function getProductionPrismaClient(): PrismaClient {
  if (globalForPrisma.productionPrisma) {
    return globalForPrisma.productionPrisma;
  }

  const prodUrl = getProductionDatabaseUrl();
  const client = createPrismaClientForUrl(prodUrl, "LIVE");
  globalForPrisma.productionPrisma = client;
  return client;
}

/**
 * Returns or initializes the Test (TESTING) Prisma Client singleton.
 * STRICT: Only uses dedicated test database connection strings.
 */
export function getTestPrismaClient(): PrismaClient {
  if (globalForPrisma.testPrisma) {
    return globalForPrisma.testPrisma;
  }

  const testUrl = getTestDatabaseUrl();
  const client = createPrismaClientForUrl(testUrl, "TEST");
  globalForPrisma.testPrisma = client;
  return client;
}

/**
 * Returns the PrismaClient for an explicit environment (LIVE or TEST).
 */
export function getPrismaClient(env: AppEnvironment = "LIVE"): PrismaClient {
  if (env === "TEST") {
    return getTestPrismaClient();
  }
  return getProductionPrismaClient();
}

/**
 * Single Authoritative Database Context
 */
export interface DatabaseContext {
  mode: AppEnvironment;
  target: "PRODUCTION" | "TEST";
  client: PrismaClient;
  isTestConfigured: boolean;
  isProductionConfigured: boolean;
}

/**
 * Resolves the authoritative database context for the active session.
 */
export async function getDatabaseContext(): Promise<DatabaseContext> {
  const mode = await resolveCurrentEnvironment();
  const client = getPrismaClient(mode);
  return {
    mode,
    target: mode === "TEST" ? "TEST" : "PRODUCTION",
    client,
    isTestConfigured: isTestDatabaseConfigured(),
    isProductionConfigured: isProductionDatabaseConfigured(),
  };
}

/**
 * Resolves the appropriate database client for the current request / session context.
 */
export async function getDatabaseForSession(): Promise<PrismaClient> {
  const env = await resolveCurrentEnvironment();
  return getPrismaClient(env);
}

/**
 * Synchronous client resolution using AsyncLocalStorage if available, otherwise defaulting to LIVE.
 */
export function getSyncDatabaseClient(): PrismaClient {
  const syncEnv = getSyncEnvironmentContext();
  return getPrismaClient(syncEnv || "LIVE");
}

/**
 * Safe database identity verification diagnostic helper.
 * Executes SELECT current_database(), current_user to verify physical isolation without exposing credentials.
 */
export async function verifyDatabaseIdentity(env: AppEnvironment): Promise<{
  environment: AppEnvironment;
  isConfigured: boolean;
  databaseName?: string;
  databaseUser?: string;
  isSamePhysicalAsOther?: boolean;
  error?: string;
}> {
  try {
    const isConfigured = env === "TEST" ? isTestDatabaseConfigured() : isProductionDatabaseConfigured();
    if (!isConfigured) {
      return {
        environment: env,
        isConfigured: false,
        error: `Database connection string for '${env}' is not set.`,
      };
    }

    const prodUrl = normalizeConnectionString(getProductionDatabaseUrl());
    const testUrl = normalizeConnectionString(getTestDatabaseUrl());
    const isSameConnectionString = Boolean(prodUrl && testUrl && prodUrl === testUrl);

    const client = getPrismaClient(env);
    const result = await client.$queryRawUnsafe<Array<{ current_database: string; current_user: string }>>(
      "SELECT current_database(), current_user"
    );

    const row = result?.[0];
    return {
      environment: env,
      isConfigured: true,
      databaseName: row?.current_database,
      databaseUser: row?.current_user,
      isSamePhysicalAsOther: isSameConnectionString,
    };
  } catch (err: any) {
    return {
      environment: env,
      isConfigured: false,
      error: err?.message || "Failed to query database identity.",
    };
  }
}

/**
 * Dynamic Environment-Aware Prisma Proxy
 * 
 * Transparently dispatches all model operations (prisma.user, prisma.order, prisma.course,
 * prisma.module, prisma.lesson, prisma.coupon, prisma.siteSetting, etc.) and top-level client
 * methods (prisma.$transaction, prisma.$queryRaw, etc.) to the authoritative database client
 * for the requesting session.
 * 
 * ALL models are strictly isolated. There are NO whitelists or exceptions.
 */
function createDynamicPrismaProxy(): PrismaClient {
  const modelProxyCache = new Map<string | symbol, any>();

  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      // Handle inspection, promise checks, or symbols safely
      if (prop === "then" || prop === "catch" || prop === "finally" || typeof prop === "symbol") {
        return Reflect.get(getSyncDatabaseClient(), prop, receiver);
      }

      // Direct client methods ($transaction, $queryRaw, $executeRawUnsafe, $disconnect, etc.)
      if (typeof prop === "string" && prop.startsWith("$")) {
        return async (...args: any[]) => {
          const activeClient = await getDatabaseForSession();
          const method = (activeClient as any)[prop];
          if (typeof method === "function") {
            return method.apply(activeClient, args);
          }
          return method;
        };
      }

      // Check model cache
      if (modelProxyCache.has(prop)) {
        return modelProxyCache.get(prop);
      }

      const modelName = String(prop);

      // Model delegate wrapper (prisma.user, prisma.course, prisma.wallet, prisma.siteSetting, etc.)
      const modelProxy = new Proxy({}, {
        get(_modelTarget, methodProp) {
          return async (...methodArgs: any[]) => {
            const activeClient = await getDatabaseForSession();
            const model = (activeClient as any)[modelName];
            if (!model) {
              throw new Error(`[Database Error] Model '${modelName}' not found on PrismaClient.`);
            }
            const modelMethod = model[methodProp];
            if (typeof modelMethod !== "function") {
              return modelMethod;
            }
            return modelMethod.apply(model, methodArgs);
          };
        },
      });

      modelProxyCache.set(prop, modelProxy);
      return modelProxy;
    },
  });
}

// Universal dynamic proxy export used across all server actions, DAL, and routes
export const prisma = createDynamicPrismaProxy();

