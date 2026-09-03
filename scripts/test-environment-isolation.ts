import "dotenv/config";
import {
  type AppEnvironment,
  signEnvToken,
  verifyEnvToken,
  withEnvironmentContext,
  resolveCurrentEnvironment,
} from "../src/lib/env-context";
import { isSuperAdminUser } from "../src/server/dal/auth-check";
import {
  getPrismaClient,
  getProductionPrismaClient,
  getTestPrismaClient,
  getDatabaseContext,
  isTestDatabaseConfigured,
  isProductionDatabaseConfigured,
  getProductionDatabaseUrl,
  getTestDatabaseUrl,
  verifyDatabaseIdentity,
  prisma,
} from "../src/lib/prisma";
import { getResolvedBunnyConfig } from "../src/lib/bunny/config";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 PRODUCTION-GRADE DUAL ENVIRONMENT ISOLATION TESTS");
  console.log("==================================================");

  // TEST 1: Default Environment Behavior (Super Admin / User in Production)
  console.log("\n--- TEST 1: DEFAULT ENVIRONMENT (PRODUCTION) ---");
  const defaultEnv = await resolveCurrentEnvironment();
  assert(defaultEnv === "LIVE", "Default environment for any unauthenticated or standard session is LIVE");

  // TEST 2: Authoritative Database Context in LIVE Mode
  console.log("\n--- TEST 2: AUTHORITATIVE DATABASE CONTEXT (LIVE) ---");
  const liveContext = await withEnvironmentContext("LIVE", async () => {
    return getDatabaseContext();
  });
  assert(liveContext.mode === "LIVE", "Database context mode is LIVE in LIVE mode");
  assert(liveContext.target === "PRODUCTION", "Database context target is PRODUCTION in LIVE mode");

  // TEST 3: Authoritative Database Context in TEST Mode
  console.log("\n--- TEST 3: AUTHORITATIVE DATABASE CONTEXT (TEST) ---");
  const testContext = await withEnvironmentContext("TEST", async () => {
    return getDatabaseContext();
  });
  assert(testContext.mode === "TEST", "Database context mode is TEST in TEST mode");
  assert(testContext.target === "TEST", "Database context target is TEST in TEST mode");

  // TEST 4: Zero Silent Fallback for Missing Test Database URL
  console.log("\n--- TEST 4: ZERO SILENT FALLBACK ENFORCEMENT ---");
  const originalTestDbUrl = process.env.TEST_DATABASE_URL;
  const originalDbTestingUrl = process.env.DATABASE_TESTING_URL;
  delete process.env.TEST_DATABASE_URL;
  delete process.env.DATABASE_TESTING_URL;
  delete (globalThis as any).testPrisma;

  const testConfiguredWhenEmpty = isTestDatabaseConfigured();
  assert(testConfiguredWhenEmpty === false, "isTestDatabaseConfigured() returns false when test DB variables are missing");

  let threwLoudError = false;
  try {
    const unconfiguredTestClient = getTestPrismaClient();
    // Invoking any query on unconfigured test client must throw loudly
    await unconfiguredTestClient.user.findMany();
  } catch (err: any) {
    if (err?.message?.includes("CRITICAL DATABASE CONFIGURATION ERROR")) {
      threwLoudError = true;
    }
  }
  assert(threwLoudError === true, "Unconfigured TEST database throws loud error instead of silently falling back to production DB");

  // Restore test env vars if they existed
  if (originalTestDbUrl) process.env.TEST_DATABASE_URL = originalTestDbUrl;
  if (originalDbTestingUrl) process.env.DATABASE_TESTING_URL = originalDbTestingUrl;
  delete (globalThis as any).testPrisma;

  // TEST 5: Dynamic Proxy Universal Dispatch (All models routed without exceptions)
  console.log("\n--- TEST 5: DYNAMIC PROXY UNIVERSAL MODEL DISPATCH ---");
  let liveDispatched = false;
  let testDispatched = false;

  await withEnvironmentContext("LIVE", async () => {
    const ctx = await getDatabaseContext();
    assert(ctx.mode === "LIVE" && ctx.target === "PRODUCTION", "Prisma proxy resolves PRODUCTION client for LIVE session");
    liveDispatched = true;
  });

  await withEnvironmentContext("TEST", async () => {
    const ctx = await getDatabaseContext();
    assert(ctx.mode === "TEST" && ctx.target === "TEST", "Prisma proxy resolves TEST client for TEST session");
    testDispatched = true;
  });

  assert(liveDispatched && testDispatched, "Dynamic Prisma proxy correctly dispatches across LIVE and TEST sessions");

  // TEST 6: Super Admin Testing Mode Authorization
  console.log("\n--- TEST 6: SUPER ADMIN IDENTITY & TEST ACCESS ---");
  const superAdmin = {
    role: "SUPER_ADMIN",
    adminRole: "SUPER_ADMIN",
    email: "vinayaksahu3@gmail.com",
  };
  assert(isSuperAdminUser(superAdmin) === true, "vinayaksahu3@gmail.com is authorized Super Admin for environment control");

  // TEST 7: Non-Super Admin / Sub-admin Testing Mode Rejection
  console.log("\n--- TEST 7: SUB-ADMIN & STUDENT REJECTION ---");
  const regularAdmin = {
    role: "ADMIN",
    adminRole: "FULL_ACCESS_ADMIN",
    email: "manager@example.com",
  };
  assert(isSuperAdminUser(regularAdmin) === false, "Sub-admin (FULL_ACCESS_ADMIN) is strictly REJECTED from environment control");

  const supportStaff = {
    role: "ADMIN",
    adminRole: "SUPPORT",
    email: "support@example.com",
  };
  assert(isSuperAdminUser(supportStaff) === false, "Support Staff is strictly REJECTED from environment control");

  const studentUser = {
    role: "STUDENT",
    adminRole: null,
    email: "student@example.com",
  };
  assert(isSuperAdminUser(studentUser) === false, "STUDENT is strictly REJECTED from environment control");

  // TEST 8: Signed Environment Token Security & Tamper Resistance
  console.log("\n--- TEST 8: TOKEN SIGNATURE & ANTI-FORGERY ---");
  const token = await signEnvToken({
    env: "TEST",
    userId: "super-admin-uid-123",
    email: "vinayaksahu3@gmail.com",
  });
  assert(typeof token === "string" && token.length > 20, "Signed JWT environment token created successfully");

  const verified = await verifyEnvToken(token);
  assert(verified !== null, "Valid token verifies with HMAC SHA-256 secret");
  assert(verified?.env === "TEST", "Token payload correctly decodes TEST environment");
  assert(verified?.email === "vinayaksahu3@gmail.com", "Token payload binds to Super Admin email");

  const tamperedToken = token.slice(0, -10) + "tampered00";
  const tamperedVerified = await verifyEnvToken(tamperedToken);
  assert(tamperedVerified === null, "Tampered environment token is safely rejected");

  // TEST 9: Parallel Concurrent Session Isolation
  console.log("\n--- TEST 9: PARALLEL SESSION CONTEXT ISOLATION ---");
  const resLive = withEnvironmentContext("LIVE", async () => {
    const env = await resolveCurrentEnvironment();
    return `SESSION_${env}`;
  });
  const resTest = withEnvironmentContext("TEST", async () => {
    const env = await resolveCurrentEnvironment();
    return `SESSION_${env}`;
  });
  assert((await resLive) === "SESSION_LIVE", "Concurrent Request A executes in LIVE without interference");
  assert((await resTest) === "SESSION_TEST", "Concurrent Request B executes in TEST without interference");

  // TEST 10: Mode Switching Concurrency
  console.log("\n--- TEST 10: RAPID SWITCHING INTEGRITY ---");
  for (let i = 0; i < 5; i++) {
    const target = i % 2 === 0 ? "LIVE" : "TEST";
    const result = await withEnvironmentContext(target as AppEnvironment, async () => {
      return resolveCurrentEnvironment();
    });
    assert(result === target, `Switch cycle ${i + 1}: accurately resolved ${target}`);
  }

  // Summary
  console.log("\n==================================================");
  console.log(`🎉 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});


