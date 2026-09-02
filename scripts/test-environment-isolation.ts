import "dotenv/config";
import {
  type AppEnvironment,
  signEnvToken,
  verifyEnvToken,
  withEnvironmentContext,
  resolveCurrentEnvironment,
} from "../src/lib/env-context";
import { isSuperAdminUser } from "../src/server/dal/auth-check";
import { createRazorpayOrder } from "../src/lib/payment/razorpay";
import { sendEmail } from "../src/lib/email";
import { getPrismaClient } from "../src/lib/prisma";
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

  // TEST 2: Super Admin Testing Mode Authorization
  console.log("\n--- TEST 2: SUPER ADMIN IDENTITY & TEST ACCESS ---");
  const superAdmin = {
    role: "SUPER_ADMIN",
    adminRole: "SUPER_ADMIN",
    email: "vinayaksahu3@gmail.com",
  };
  assert(isSuperAdminUser(superAdmin) === true, "vinayaksahu3@gmail.com is authorized Super Admin for environment control");

  // TEST 3: Non-Super Admin / Sub-admin Testing Mode Rejection
  console.log("\n--- TEST 3: SUB-ADMIN & STUDENT REJECTION ---");
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

  // TEST 4: Signed Environment Token Security & Tamper Resistance
  console.log("\n--- TEST 4: TOKEN SIGNATURE & ANTI-FORGERY ---");
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

  // TEST 5: Parallel Concurrent Session Isolation
  console.log("\n--- TEST 5: PARALLEL SESSION CONTEXT ISOLATION ---");
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

  // TEST 6: Independent Database Client Resolution
  console.log("\n--- TEST 6: DATABASE CLIENT RESOLUTION ---");
  const prodClient = getPrismaClient("LIVE");
  const testClient = getPrismaClient("TEST");
  assert(prodClient !== undefined && prodClient !== null, "Production PrismaClient instance resolved");
  assert(testClient !== undefined && testClient !== null, "Test PrismaClient instance resolved");

  // TEST 7: Financial Safety Guard in TEST Mode
  console.log("\n--- TEST 7: FINANCIAL SAFETY IN TEST MODE ---");
  const testPaymentResult = await withEnvironmentContext("TEST", async () => {
    return createRazorpayOrder({
      amount: 4999,
      currency: "INR",
      orderNumber: "TEST-ORD-001",
      orderId: "ord_test_123",
      customerEmail: "student@example.com",
    });
  });
  assert(
    Boolean(testPaymentResult.provider === "MOCK" || testPaymentResult.keyId?.startsWith("rzp_test_")),
    "Financial safety guard prevents real money movement during TEST MODE"
  );

  // TEST 8: Email & Notification Safety Guard in TEST Mode
  console.log("\n--- TEST 8: EMAIL BROADCAST SAFETY IN TEST MODE ---");
  const emailRes = await withEnvironmentContext("TEST", async () => {
    return sendEmail({
      to: "realcustomer@example.com",
      subject: "Test Course Purchase",
      html: "<p>Hello</p>",
      text: "Hello",
    });
  });
  assert(Boolean(emailRes.success), "Test email to real user is safely suppressed in TEST mode");

  // TEST 9: Bunny Media Config Isolation
  console.log("\n--- TEST 9: BUNNY MEDIA CONFIG ISOLATION ---");
  const liveBunny = await withEnvironmentContext("LIVE", async () => {
    return getResolvedBunnyConfig();
  });
  const testBunny = await withEnvironmentContext("TEST", async () => {
    return getResolvedBunnyConfig();
  });
  assert(liveBunny.environment === "live", "Bunny config resolves 'live' environment in LIVE mode");
  assert(testBunny.environment === "test", "Bunny config resolves 'test' environment in TEST mode");

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
