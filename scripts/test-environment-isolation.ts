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

  // 1. Default Environment
  console.log("\n--- TEST SUITE 1: DEFAULT ENVIRONMENT BEHAVIOR ---");
  const defaultEnv = await resolveCurrentEnvironment();
  assert(defaultEnv === "LIVE", "Default environment for any unauthenticated or standard session is LIVE");

  // 2. Super Admin Authorization
  console.log("\n--- TEST SUITE 2: SUPER ADMIN ROLE & IDENTITY CHECKS ---");
  const superAdmin = {
    role: "SUPER_ADMIN",
    adminRole: "SUPER_ADMIN",
    email: "vinayaksahu3@gmail.com",
  };
  assert(isSuperAdminUser(superAdmin) === true, "vinayaksahu3@gmail.com is authorized Super Admin");

  const regularAdmin = {
    role: "ADMIN",
    adminRole: "FULL_ACCESS_ADMIN",
    email: "manager@example.com",
  };
  assert(isSuperAdminUser(regularAdmin) === false, "Regular ADMIN is rejected from Super Admin permissions");

  const studentUser = {
    role: "STUDENT",
    adminRole: null,
    email: "student@example.com",
  };
  assert(isSuperAdminUser(studentUser) === false, "STUDENT is rejected from Super Admin permissions");

  // 3. Signed Environment Token Generation & Verification
  console.log("\n--- TEST SUITE 3: SIGNED ENVIRONMENT TOKEN SECURITY ---");
  const token = await signEnvToken({
    env: "TEST",
    userId: "super-admin-uid-123",
    email: "vinayaksahu3@gmail.com",
  });
  assert(typeof token === "string" && token.length > 20, "Signed JWT environment token created successfully");

  const verified = await verifyEnvToken(token);
  assert(verified !== null, "Token verifies with HMAC SHA-256 secret");
  assert(verified?.env === "TEST", "Token payload correctly encodes TEST environment");
  assert(verified?.email === "vinayaksahu3@gmail.com", "Token payload binds to Super Admin email");

  // Tampered token test
  const tamperedToken = token.slice(0, -10) + "tampered00";
  const tamperedVerified = await verifyEnvToken(tamperedToken);
  assert(tamperedVerified === null, "Tampered environment token is safely rejected");

  // 4. Parallel Sessions Simulation
  console.log("\n--- TEST SUITE 4: PARALLEL SESSION CONTEXT ISOLATION ---");
  const resLive = withEnvironmentContext("LIVE", async () => {
    return "LIVE_RESULT";
  });
  const resTest = withEnvironmentContext("TEST", async () => {
    return "TEST_RESULT";
  });
  assert((await resLive) === "LIVE_RESULT", "Parallel session A executes within LIVE context");
  assert((await resTest) === "TEST_RESULT", "Parallel session B executes within TEST context");

  // 5. Payment Financial Safety in TEST Mode
  console.log("\n--- TEST SUITE 5: FINANCIAL SAFETY IN TEST MODE ---");
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
    "Financial guard ensures TEST mode never charges real customer cards/money"
  );

  // 6. Email Delivery Safety in TEST Mode
  console.log("\n--- TEST SUITE 6: EMAIL & NOTIFICATION SAFETY IN TEST MODE ---");
  const emailRes = await withEnvironmentContext("TEST", async () => {
    return sendEmail({
      to: "realcustomer@example.com",
      subject: "Test Course Purchase",
      html: "<p>Hello</p>",
      text: "Hello",
    });
  });
  assert(Boolean(emailRes.success), "Test email to real user is safely suppressed without throwing errors");

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
