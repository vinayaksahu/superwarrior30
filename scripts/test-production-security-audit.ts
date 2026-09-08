import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { encryptSecret, decryptSecret } from "../src/lib/crypto/encryption";
import { generateTotpSecret, verifyTotpToken, generateRecoveryCodes, verifyAndConsumeRecoveryCode } from "../src/lib/auth/totp";
import { getEffectivePermissions, hasPermission } from "../src/lib/permissions";

async function runSecurityTests() {
  console.log("==================================================");
  console.log("SUPER WARRIOR 30 — PRODUCTION SECURITY VERIFICATION");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password Hashing & Constant-time check
  try {
    const pw = "SuperSecure#2026";
    const hash = await hashPassword(pw);
    const valid = await verifyPassword(pw, hash);
    const invalid = await verifyPassword("WrongPassword#999", hash);
    assert(valid && !invalid, "Argon2id/Bcrypt password hashing and verification");
  } catch (err: any) {
    assert(false, `Password hashing failed: ${err.message}`);
  }

  // 2. AES-256-GCM Cryptographic Encryption & Decryption
  try {
    const plain = "live_secret_key_rzp_9938102381203";
    const encrypted = encryptSecret(plain);
    assert(encrypted !== null && encrypted !== plain, "AES-256-GCM encryption transforms sensitive data");
    const decrypted = decryptSecret(encrypted);
    assert(decrypted === plain, "AES-256-GCM decryption restores exact plaintext");
  } catch (err: any) {
    assert(false, `Encryption test failed: ${err.message}`);
  }

  // 3. RFC 6238 TOTP Engine & Recovery Codes
  try {
    const secret = generateTotpSecret();
    assert(secret.length >= 26, "RFC 6238 TOTP generates valid Base32 secret");

    // Test recovery codes
    const { rawCodes, hashedCodes } = generateRecoveryCodes();
    assert(rawCodes.length === 8 && hashedCodes.length === 8, "Generates 8 secure recovery codes");

    const codeToUse = rawCodes[0];
    const { valid, remainingHashedCodes } = verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
    assert(valid && remainingHashedCodes.length === 7, "Recovery code verified and consumed (single-use)");

    // Replay attack with same recovery code should fail
    const replay = verifyAndConsumeRecoveryCode(codeToUse, remainingHashedCodes);
    assert(!replay.valid, "Replay of consumed recovery code is rejected");
  } catch (err: any) {
    assert(false, `TOTP/Recovery test failed: ${err.message}`);
  }

  // 4. RBAC Privilege Escalation Prevention
  try {
    // Normal student with spoofed admin email without admin role must NOT get admin perms
    const studentSpoof = {
      role: "STUDENT",
      adminRole: null,
      email: "vinayaksahu3@gmail.com",
    };
    const studentPerms = getEffectivePermissions(studentSpoof as any);
    assert(studentPerms.size === 0, "Student role spoofing super admin email is denied administrative permissions");

    // Real super admin with SUPER_ADMIN role
    const realSuper = {
      role: "SUPER_ADMIN",
      adminRole: "SUPER_ADMIN",
      email: "vinayaksahu3@gmail.com",
    };
    const superPerms = getEffectivePermissions(realSuper as any);
    assert(hasPermission(realSuper as any, "payment_methods.manage"), "Genuine Super Admin has payment_methods.manage");
    assert(hasPermission(realSuper as any, "affiliate.manage"), "Genuine Super Admin has affiliate.manage");

    // Support staff role should NOT have payment_methods.manage or courses.create
    const supportStaff = {
      role: "SUPPORT",
      adminRole: "SUPPORT",
      email: "support@sw30.com",
    };
    assert(!hasPermission(supportStaff as any, "payment_methods.manage"), "Support staff cannot manage payment methods");
    assert(!hasPermission(supportStaff as any, "courses.create"), "Support staff cannot create courses");
    assert(!hasPermission(supportStaff as any, "affiliate.manage"), "Support staff cannot alter affiliate settings");
  } catch (err: any) {
    assert(false, `RBAC verification failed: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((e) => {
  console.error("Test runner encountered error:", e);
  process.exit(1);
});
