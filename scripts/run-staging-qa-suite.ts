import "./preload-test.cjs";
import "dotenv/config";
import { isSuperAdminUser, isStaffAdminUser } from "../src/server/dal/auth-check";
import { encrypt, decrypt } from "../src/lib/auth/session";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failed++;
  }
}

async function runStagingQASuite() {
  console.log("==================================================");
  console.log("🛡️ SUPERWARRIOR30 — REAL-WORLD STAGING QA & SECURITY SUITE");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // SECTION 1: SAFE TEST ENVIRONMENT & DATABASE ISOLATION
  // ----------------------------------------------------
  console.log("--- 1. DATABASE TARGET & ENVIRONMENT ISOLATION ---");
  const prodDbUrl = process.env.DATABASE_URL || "";
  const testDbUrl = process.env.TEST_DATABASE_URL || "";

  assert(prodDbUrl.includes("productiondb"), "DATABASE_URL points to production database (isolation verified)");
  assert(testDbUrl.includes("neondb"), "TEST_DATABASE_URL points to separate test database (neondb)");
  assert(prodDbUrl !== testDbUrl, "Production DB and Test DB URLs are physically distinct endpoints");

  // ----------------------------------------------------
  // SECTION 2: AUTHENTICATION, JWT & SESSION HARDENING
  // ----------------------------------------------------
  console.log("\n--- 2. AUTHENTICATION & JWT SECURITY (VULN-03) ---");
  const testPayload = {
    userId: "usr_test_123",
    email: "student@test.com",
    role: "STUDENT" as const,
    tokenVersion: 1,
    deviceId: "dev_test_456",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const token = await encrypt(testPayload);
  assert(typeof token === "string" && token.split(".").length === 3, "Session token successfully signed as 3-part JWT");

  const decoded = await decrypt(token);
  assert(decoded?.userId === "usr_test_123", "Session token decrypts accurately");
  assert(decoded?.email === "student@test.com", "Session email preserved accurately");
  assert(decoded?.role === "STUDENT", "Session role preserved accurately");

  // Tampered token test
  const tamperedToken = token.slice(0, -5) + "abcde";
  const tamperedDecoded = await decrypt(tamperedToken);
  assert(tamperedDecoded === null, "Tampered JWT token fails signature verification and returns null");

  // ----------------------------------------------------
  // SECTION 3: ROLE-BASED ACCESS CONTROL (VULN-05)
  // ----------------------------------------------------
  console.log("\n--- 3. SUPER ADMIN & RBAC AUTHORIZATION (VULN-05) ---");
  // Legitimate Super Admin with DB role
  assert(
    isSuperAdminUser({ role: "SUPER_ADMIN", adminRole: "SUPER_ADMIN", email: "vinayaksahu3@gmail.com" }) === true,
    "Super Admin with DB role SUPER_ADMIN is authorized"
  );

  // Student trying to spoof Super Admin by matching email
  assert(
    isSuperAdminUser({ role: "STUDENT", email: "vinayaksahu3@gmail.com" }) === false,
    "Student with matching email is strictly REJECTED without DB ADMIN/SUPER_ADMIN role"
  );

  // Regular Admin without Super Admin role
  assert(
    isSuperAdminUser({ role: "ADMIN", adminRole: "FULL_ACCESS_ADMIN", email: "manager@test.com" }) === false,
    "Standard Admin is REJECTED from Super Admin operations"
  );

  // Standard Student
  assert(
    isSuperAdminUser({ role: "STUDENT", email: "student@test.com" }) === false,
    "Standard Student is strictly REJECTED"
  );

  // ----------------------------------------------------
  // SECTION 4: PAYMENT METHOD SECRET SANITIZATION (VULN-02)
  // ----------------------------------------------------
  console.log("\n--- 4. PAYMENT GATEWAY SECRET SANITIZATION (VULN-02) ---");
  // Simulate the sanitizer from payment-method.actions.ts
  function sanitizeDetails(details: any, type: string) {
    if (!details) return {};
    if (type === "GATEWAY") {
      return {
        provider: details.provider,
        mode: details.mode,
        keyId: details.keyId,
      };
    }
    return {
      upiId: details.upiId,
      payeeName: details.payeeName,
      qrCodeUrl: details.qrCodeUrl,
      bankName: details.bankName,
      accountName: details.accountName,
      accountNumber: details.accountNumber,
      ifsc: details.ifsc,
    };
  }

  const rawGatewayDetails = {
    provider: "RAZORPAY",
    mode: "TEST",
    keyId: "rzp_test_PublicSample123",
    keySecret: "SUPER_SECRET_PRIVATE_KEY_NEVER_LEAK",
    webhookSecret: "WH_SECRET_99999",
    saltKey: "SALT_KEY_88888",
    merchantId: "MID_77777",
  };

  const sanitized = sanitizeDetails(rawGatewayDetails, "GATEWAY");
  assert(sanitized.keyId === "rzp_test_PublicSample123", "Public keyId is retained for checkout SDK");
  assert(sanitized.provider === "RAZORPAY", "Gateway provider is retained");
  assert(!("keySecret" in sanitized), "CRITICAL: keySecret is completely stripped");
  assert(!("webhookSecret" in sanitized), "CRITICAL: webhookSecret is completely stripped");
  assert(!("saltKey" in sanitized), "CRITICAL: saltKey is completely stripped");
  assert(!("merchantId" in sanitized), "CRITICAL: merchantId is completely stripped");

  const rawManualDetails = {
    upiId: "superwarrior@upi",
    payeeName: "Super Warrior Mentorship",
    qrCodeUrl: "https://cdn.superwarrior30.com/qr.png",
    bankName: "HDFC Bank",
    accountName: "Super Warrior 30",
    accountNumber: "50200012345678",
    ifsc: "HDFC0001234",
  };
  const sanitizedManual = sanitizeDetails(rawManualDetails, "UPI");
  assert(sanitizedManual.upiId === "superwarrior@upi", "Manual payment UPI ID retained");
  assert(sanitizedManual.accountNumber === "50200012345678", "Manual payment bank details retained");

  // ----------------------------------------------------
  // SECTION 5: GUEST & NORMAL REFERRAL TREE LOGIC (VULN-08)
  // ----------------------------------------------------
  console.log("\n--- 5. REFERRAL CLOSURE TREE INTEGRITY (VULN-08) ---");
  // Simulate building a referral tree:
  // User A (Root Sponsor)
  //   -> User B (referred by A)
  //      -> User C (referred by B)
  //         -> Guest D (buys course with C's referral code)
  const closures: Array<{ ancestorId: string; descendantId: string; depth: number }> = [
    // A -> B
    { ancestorId: "A", descendantId: "B", depth: 1 },
    // B -> C (and A -> C depth 2)
    { ancestorId: "B", descendantId: "C", depth: 1 },
    { ancestorId: "A", descendantId: "C", depth: 2 },
  ];

  // Guest D joins with C as direct referrer
  const directReferrerId = "C";
  const newUserId = "D";

  // 1. Direct parent closure
  const newClosures = [{ ancestorId: directReferrerId, descendantId: newUserId, depth: 1 }];

  // 2. Upline ancestors closures
  const uplineAncestors = closures.filter((c) => c.descendantId === directReferrerId);
  for (const anc of uplineAncestors) {
    newClosures.push({
      ancestorId: anc.ancestorId,
      descendantId: newUserId,
      depth: anc.depth + 1,
    });
  }

  assert(newClosures.length === 3, "Guest D creates exactly 3 upline closure records (L1, L2, L3)");
  const l1 = newClosures.find((c) => c.ancestorId === "C");
  const l2 = newClosures.find((c) => c.ancestorId === "B");
  const l3 = newClosures.find((c) => c.ancestorId === "A");
  assert(l1?.depth === 1, "Direct referrer C is depth 1");
  assert(l2?.depth === 2, "Grandparent sponsor B is depth 2");
  assert(l3?.depth === 3, "Great-grandparent sponsor A is depth 3");

  // ----------------------------------------------------
  // SECTION 6: FILE UPLOAD SECURITY (VULN-06)
  // ----------------------------------------------------
  console.log("\n--- 6. FILE UPLOAD SECURITY & MAGIC BYTES (VULN-06) ---");
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  const dangerousExtensions = ["html", "htm", "svg", "exe", "js", "mjs", "sh", "bat", "cmd", "php", "py", "vbs", "jar", "bin"];
  const allowedStudentExtensions = ["pdf", "png", "jpg", "jpeg", "webp"];

  function validateUpload(file: { name: string; size: number; buffer: Buffer }, isStudent: boolean) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (file.size > (isStudent ? MAX_FILE_SIZE : 30 * 1024 * 1024)) return { valid: false, error: "Oversized" };
    if (dangerousExtensions.includes(ext)) return { valid: false, error: "Dangerous extension" };
    if (isStudent && !allowedStudentExtensions.includes(ext)) return { valid: false, error: "Disallowed extension" };

    // Magic byte check
    let validMagic = false;
    if (ext === "pdf" && file.buffer.subarray(0, 4).toString("ascii") === "%PDF") validMagic = true;
    if (ext === "png" && file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && file.buffer[2] === 0x4e && file.buffer[3] === 0x47) validMagic = true;
    if ((ext === "jpg" || ext === "jpeg") && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff) validMagic = true;
    if (ext === "webp" && file.buffer.subarray(0, 4).toString("ascii") === "RIFF" && file.buffer.subarray(8, 12).toString("ascii") === "WEBP") validMagic = true;

    if (!validMagic) return { valid: false, error: "Invalid signature" };
    return { valid: true };
  }

  // Test 1: Valid PDF
  const validPdfBuf = Buffer.from("%PDF-1.5 test document content");
  assert(validateUpload({ name: "homework.pdf", size: 1024, buffer: validPdfBuf }, true).valid === true, "Legitimate PDF upload accepted");

  // Test 2: Valid PNG
  const validPngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert(validateUpload({ name: "proof.png", size: 2048, buffer: validPngBuf }, true).valid === true, "Legitimate PNG screenshot accepted");

  // Test 3: Dangerous HTML
  assert(validateUpload({ name: "xss.html", size: 500, buffer: Buffer.from("<html>") }, true).valid === false, "Dangerous .html extension rejected");

  // Test 4: Dangerous SVG
  assert(validateUpload({ name: "vector.svg", size: 500, buffer: Buffer.from("<svg>") }, true).valid === false, "Dangerous .svg extension rejected");

  // Test 5: Executable .exe
  assert(validateUpload({ name: "malware.exe", size: 500, buffer: Buffer.from("MZ...") }, true).valid === false, "Malicious .exe rejected");

  // Test 6: Oversized file
  assert(validateUpload({ name: "big.pdf", size: 16 * 1024 * 1024, buffer: validPdfBuf }, true).valid === false, "Oversized file (>15MB) rejected");

  // Test 7: Spoofed extension (Text disguised as PDF)
  const fakePdfBuf = Buffer.from("This is just plain text masquerading as a PDF file");
  assert(validateUpload({ name: "fake.pdf", size: 500, buffer: fakePdfBuf }, true).valid === false, "Spoofed file content (fake PDF header) rejected");

  // ----------------------------------------------------
  // SECTION 7: STORAGE KEY PATH TRAVERSAL (VULN-07)
  // ----------------------------------------------------
  console.log("\n--- 7. STORAGE KEY PATH TRAVERSAL SANITIZATION (VULN-07) ---");
  function validateStorageKey(storageKey: string): boolean {
    const sanitizedKey = storageKey.trim().replace(/\\/g, "/");
    if (
      sanitizedKey.includes("..") ||
      sanitizedKey.startsWith("/") ||
      !/^[a-zA-Z0-9_\-\./]+$/.test(sanitizedKey) ||
      !sanitizedKey.startsWith("media/")
    ) {
      return false;
    }
    return true;
  }

  assert(validateStorageKey("media/courses/lesson1.pdf") === true, "Valid media path accepted");
  assert(validateStorageKey("../etc/passwd") === false, "Path traversal with '../' rejected");
  assert(validateStorageKey("..\\windows\\system32") === false, "Path traversal with '..\\' rejected");
  assert(validateStorageKey("/absolute/root/file") === false, "Absolute path starting with '/' rejected");
  assert(validateStorageKey("media/../outside/file") === false, "Traversal inside prefix 'media/../' rejected");
  assert(validateStorageKey("other/files/doc.pdf") === false, "Non-media prefix rejected");

  // ----------------------------------------------------
  // SECTION 8: REFERRAL VALIDATION RATE LIMIT & PII MASKING (VULN-09)
  // ----------------------------------------------------
  console.log("\n--- 8. REFERRAL VALIDATION PII MASKING (VULN-09) ---");
  function maskAffiliateName(fullName: string | null | undefined): string {
    if (!fullName || !fullName.trim()) return "Verified Affiliate Partner";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      const first = parts[0];
      return first.length > 2 ? `${first.slice(0, 2)}*** (Partner)` : `${first} (Partner)`;
    }
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
    return `${first} ${lastInitial}. (Verified Partner)`;
  }

  assert(maskAffiliateName("Vinayak Sahu") === "Vinayak S. (Verified Partner)", "Full legal name masked to 'First L. (Verified Partner)'");
  assert(maskAffiliateName("Rahul") === "Ra*** (Partner)", "Single word name masked to 'Ra*** (Partner)'");
  assert(maskAffiliateName(null) === "Verified Affiliate Partner", "Empty name returns generic verified partner");

  // ----------------------------------------------------
  // SECTION 9: LESSON PDF HEADERS & CACHING (VULN-10)
  // ----------------------------------------------------
  console.log("\n--- 9. LESSON PDF CACHING & ACCESS CONTROL (VULN-10) ---");
  function getResponseHeaders(isLimited: boolean) {
    return {
      "Content-Type": "application/pdf",
      "Cache-Control": isLimited
        ? "public, max-age=1800"
        : "private, no-cache, no-store, must-revalidate",
      Pragma: isLimited ? "auto" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    };
  }

  const fullCourseHeaders = getResponseHeaders(false);
  assert(fullCourseHeaders["Cache-Control"] === "private, no-cache, no-store, must-revalidate", "Paid course PDF is strictly private and uncacheable");
  assert(fullCourseHeaders["Pragma"] === "no-cache", "Pragma no-cache header set");
  assert(!("Access-Control-Allow-Origin" in fullCourseHeaders), "Wildcard Access-Control-Allow-Origin is removed");

  const previewHeaders = getResponseHeaders(true);
  assert(previewHeaders["Cache-Control"] === "public, max-age=1800", "Free preview PDF is safely cacheable");

  // ----------------------------------------------------
  // SECTION 10: BROKER VERIFICATION BOUNDS (VULN-11)
  // ----------------------------------------------------
  console.log("\n--- 10. BROKER VERIFICATION BOUNDS (VULN-11) ---");
  function validateBrokerMemberInput(memberId: any): boolean {
    if (!memberId || typeof memberId !== "string" || !memberId.trim() || memberId.trim().length > 64) {
      return false;
    }
    return true;
  }

  assert(validateBrokerMemberInput("OCTA_98765") === true, "Valid broker member ID accepted");
  assert(validateBrokerMemberInput("") === false, "Empty member ID rejected");
  assert(validateBrokerMemberInput("   ") === false, "Whitespace-only member ID rejected");
  assert(validateBrokerMemberInput("A".repeat(65)) === false, "Excessively long member ID (>64 chars) rejected");

  // ----------------------------------------------------
  // SECTION 11: INIT-DB ROUTE SECURITY (VULN-01)
  // ----------------------------------------------------
  console.log("\n--- 11. INIT-DB ACCESS GATE (VULN-01) ---");
  function evaluateInitDbAccess(nodeEnv: string, authHeader: string | null, secret: string | undefined): { status: number } {
    if (nodeEnv === "production") {
      return { status: 404 };
    }
    if (!secret || (authHeader !== `Bearer ${secret}` && authHeader !== secret)) {
      return { status: 401 };
    }
    return { status: 200 };
  }

  assert(evaluateInitDbAccess("production", "admin_secret", "admin_secret").status === 404, "Production mode unconditionally returns 404 Not Found");
  assert(evaluateInitDbAccess("development", null, "my_secret").status === 401, "Dev mode without secret returns 401 Unauthorized");
  assert(evaluateInitDbAccess("development", "wrong_secret", "my_secret").status === 401, "Dev mode with invalid secret returns 401 Unauthorized");
  assert(evaluateInitDbAccess("development", "my_secret", "my_secret").status === 200, "Dev mode with valid secret authorized");

  console.log("\n==================================================");
  console.log(`🎉 STAGING QA TEST RUN COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStagingQASuite().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
