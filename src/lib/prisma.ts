import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveCurrentEnvironment, getSyncEnvironmentContext, type AppEnvironment } from "./env-context";

// Global singletons to prevent multiple connection pools during dev/HMR
const globalForPrisma = globalThis as unknown as {
  productionPrisma: PrismaClient | undefined;
  testPrisma: PrismaClient | undefined;
};

export function normalizeConnectionString(url: string | undefined): string {
  if (!url) return "";
  if (url.includes("sslmode=require")) {
    return url.replace("sslmode=require", "sslmode=verify-full");
  }
  return url;
}

/**
 * Creates a PrismaClient connected to the designated connection string
 */
function createPrismaClientForUrl(rawUrl: string | undefined, envName: string): PrismaClient {
  const connectionString = normalizeConnectionString(rawUrl);
  if (!connectionString) {
    // Fail-safe error placeholder client if URL is missing
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          `[CRITICAL DATABASE ERROR] Database connection URL for environment '${envName}' is not configured.`
        );
      },
    });
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
 * Returns or initializes the Production (LIVE) Prisma Client singleton
 */
export function getProductionPrismaClient(): PrismaClient {
  if (globalForPrisma.productionPrisma) {
    return globalForPrisma.productionPrisma;
  }

  const prodUrl =
    process.env.PRODUCTION_DATABASE_URL ||
    process.env.DATABASE_URL;

  const client = createPrismaClientForUrl(prodUrl, "LIVE");

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.productionPrisma = client;
  }
  return client;
}

/**
 * Returns or initializes the Test (TESTING) Prisma Client singleton
 */
export function getTestPrismaClient(): PrismaClient {
  if (globalForPrisma.testPrisma) {
    return globalForPrisma.testPrisma;
  }

  const testUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL;

  const client = createPrismaClientForUrl(testUrl, "TEST");

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.testPrisma = client;
  }
  return client;
}

/**
 * Returns the PrismaClient for an explicit environment
 */
export function getPrismaClient(env: AppEnvironment = "LIVE"): PrismaClient {
  if (env === "TEST") {
    return getTestPrismaClient();
  }
  return getProductionPrismaClient();
}

/**
 * Resolves the appropriate database client for the current request / session context.
 * Fail-safe: NEVER falls back between production and test if connection fails.
 */
export async function getDatabaseForSession(): Promise<PrismaClient> {
  const env = await resolveCurrentEnvironment();
  return getPrismaClient(env);
}

/**
 * Synchronous client resolution using AsyncLocalStorage if available, otherwise defaulting to LIVE
 */
export function getSyncDatabaseClient(): PrismaClient {
  const syncEnv = getSyncEnvironmentContext();
  return getPrismaClient(syncEnv || "LIVE");
}

/**
 * Dynamic Environment-Aware Prisma Proxy
 * 
 * Transparently wraps all model operations (prisma.user.*, prisma.order.*, etc.)
 * and client methods (prisma.$transaction, prisma.$queryRaw, etc.) to dispatch to
 * the correct database (LIVE vs TEST) based on the requesting session.
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

      // Model delegate wrapper (prisma.user, prisma.course, prisma.wallet, etc.)
      const modelProxy = new Proxy({}, {
        get(_modelTarget, methodProp) {
          return async (...methodArgs: any[]) => {
            const activeClient = await getDatabaseForSession();
            const model = (activeClient as any)[prop];
            if (!model) {
              throw new Error(`[Database Error] Model '${String(prop)}' not found on PrismaClient.`);
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
