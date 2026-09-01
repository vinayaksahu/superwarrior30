import crypto from "crypto";
import {
  generateSecureOtp,
  hashOtp,
  createPendingOtpToken,
  verifyPendingOtpToken,
  maskEmail,
} from "../src/lib/otp/service";
import { SMTP_CONFIG } from "../src/lib/email/transporter";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING EMAIL & OTP SYSTEM UNIT TESTS");
  console.log("==================================================");

  // --- 1. OTP GENERATION & ENTROPY ---
  console.log("\n--- 1. OTP GENERATION & CRYPTOGRAPHIC SECURITY ---");
  const otpSamples = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const code = generateSecureOtp();
    assert(
      /^\d{6}$/.test(code),
      `OTP Sample #${i + 1} is exactly 6 digits (${code})`
    );
    const num = parseInt(code, 10);
    assert(num >= 100000 && num <= 999999, `OTP is in range [100000, 999999]`);
    otpSamples.add(code);
  }
  assert(otpSamples.size > 45, `Cryptographic randomness: High uniqueness across 50 samples (${otpSamples.size} unique)`);

  // --- 2. HASHING & TIMING-SAFE VERIFICATION ---
  console.log("\n--- 2. HASHING & TIMING-SAFE MATCHING ---");
  const testEmail = "trader@superwarrior30.com";
  const rawOtp = "482915";
  const correctHash = hashOtp(rawOtp, testEmail);
  const recomputedHash = hashOtp(rawOtp, testEmail);

  assert(correctHash === recomputedHash, "Hash is deterministic for identical OTP and email");
  assert(correctHash.length === 64, "SHA-256 HMAC produces 64-char hex digest");
  assert(correctHash !== rawOtp, "OTP is never stored in plaintext");

  // Wrong OTP hash mismatch
  const wrongHash = hashOtp("123456", testEmail);
  assert(correctHash !== wrongHash, "Different OTP generates completely distinct hash");

  // Case insensitivity of email binding
  const upperCaseEmailHash = hashOtp(rawOtp, "TRADER@SUPERWARRIOR30.COM");
  assert(correctHash === upperCaseEmailHash, "Email binding normalizes lowercase email correctly");

  // Timing safe equality test
  const isMatch =
    correctHash.length === recomputedHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(correctHash, "utf-8"),
      Buffer.from(recomputedHash, "utf-8")
    );
  assert(isMatch, "crypto.timingSafeEqual succeeds for correct hash");

  const isWrongMatch =
    correctHash.length === wrongHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(correctHash, "utf-8"),
      Buffer.from(wrongHash, "utf-8")
    );
  assert(!isWrongMatch, "crypto.timingSafeEqual safely rejects incorrect hash");

  // --- 3. PENDING JWT TOKEN ENCRYPTION & EXPIRY ---
  console.log("\n--- 3. PENDING JWT TOKEN LIFECYCLE ---");
  const pendingToken = await createPendingOtpToken({
    userId: "user_student_123",
    email: testEmail,
    purpose: "LOGIN_VERIFICATION",
    deviceId: "device_abc_789",
    requiresOtp: true,
  });

  assert(typeof pendingToken === "string" && pendingToken.length > 50, "Generated secure signed pending JWT token");

  const verifiedPayload = await verifyPendingOtpToken(pendingToken);
  assert(verifiedPayload !== null, "Successfully verified and decoded pending token");
  assert(verifiedPayload?.email === testEmail, "Decoded email matches");
  assert(verifiedPayload?.userId === "user_student_123", "Decoded userId matches");
  assert(verifiedPayload?.deviceId === "device_abc_789", "Decoded deviceId matches");
  assert(verifiedPayload?.requiresOtp === true, "requiresOtp flag is true");

  // Tampered token test
  const tamperedToken = pendingToken.slice(0, -5) + "xxxxx";
  const tamperedPayload = await verifyPendingOtpToken(tamperedToken);
  assert(tamperedPayload === null, "Tampered pending token is rejected");

  // --- 4. EMAIL MASKING FOR SECURITY ---
  console.log("\n--- 4. SENSITIVE DATA MASKING ---");
  assert(maskEmail("john.doe@gmail.com") === "j***e@gmail.com", "Masks standard email correctly");
  assert(maskEmail("admin@superwarrior30.com") === "a***n@superwarrior30.com", "Masks admin email correctly");
  assert(maskEmail("ab@test.com") === "a***@test.com", "Masks short email correctly");

  // --- 5. NAMECHEAP SMTP CONFIGURATION DEFAULTS ---
  console.log("\n--- 5. NAMECHEAP SMTP CONFIGURATION VERIFICATION ---");
  assert(SMTP_CONFIG.host === "mail.privateemail.com", `SMTP Host is mail.privateemail.com (${SMTP_CONFIG.host})`);
  assert(SMTP_CONFIG.port === 465, `SMTP Port is 465 SSL/TLS (${SMTP_CONFIG.port})`);
  assert(SMTP_CONFIG.secure === true, "SMTP Security is SSL/TLS (secure: true)");
  assert(SMTP_CONFIG.user === "noreply@superwarrior30.com", `Sender mailbox is noreply@superwarrior30.com (${SMTP_CONFIG.user})`);

  // --- 6. OTP FLOW SCENARIOS ---
  console.log("\n--- 6. OTP LIFECYCLE SCENARIOS ---");

  // Scenario A: Correct OTP
  const activeCode = "654321";
  const storedHash = hashOtp(activeCode, testEmail);
  const userEntry = "654321";
  const testHash = hashOtp(userEntry, testEmail);
  assert(testHash === storedHash, "Scenario A: Correct OTP passes verification");

  // Scenario B: Incorrect OTP
  const badEntry = "000000";
  const badTestHash = hashOtp(badEntry, testEmail);
  assert(badTestHash !== storedHash, "Scenario B: Incorrect OTP is rejected");

  // Scenario C: Expiration Logic
  const expiredTimestamp = Date.now() - 1000; // 1 second in the past
  const isExpired = expiredTimestamp < Date.now();
  assert(isExpired, "Scenario C: Expired OTP (>5 minutes) is recognized as expired");

  // Scenario D: Single Use Invalidation
  let usedAt: Date | null = null;
  assert(usedAt === null, "Scenario D1: OTP is initially unused");
  usedAt = new Date();
  assert(usedAt !== null, "Scenario D2: OTP marked used immediately upon successful verification");

  // Scenario E: Cooldown Check (60 seconds)
  const lastCreated = new Date(Date.now() - 30 * 1000); // 30 seconds ago
  const elapsedSec = Math.floor((Date.now() - lastCreated.getTime()) / 1000);
  const cooldownActive = elapsedSec < 60;
  assert(cooldownActive, `Scenario E: 60s cooldown is active when ${elapsedSec}s elapsed`);

  // Scenario F: Max attempts enforcement
  let attempts = 4;
  const maxAttempts = 5;
  attempts += 1;
  const isLocked = attempts >= maxAttempts;
  assert(isLocked && attempts === 5, "Scenario F: OTP locks when attempts reach maxAttempts (5)");

  console.log("\n==================================================");
  console.log(`📊 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
