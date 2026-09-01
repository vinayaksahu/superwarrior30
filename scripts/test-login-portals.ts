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

function evaluatePortalAccess(portal: string, user: { role: string; email: string }): { allowed: boolean; error?: string } {
  const normalizedPortal = portal.toUpperCase();

  const isSuper =
    user.role === "SUPER_ADMIN" ||
    user.email === "vinayaksahu3@gmail.com" ||
    user.email === "admin@superwarrior30.com";

  const isAdminStaff =
    isSuper ||
    user.role === "ADMIN" ||
    user.role === "SUPPORT";

  if (normalizedPortal === "SUPER_ADMIN") {
    if (!isSuper) {
      return {
        allowed: false,
        error: "Access denied. Only Super Admin accounts are authorized to sign in through this portal.",
      };
    }
  } else if (normalizedPortal === "ADMIN") {
    if (!isAdminStaff) {
      return {
        allowed: false,
        error: "Access denied. Only authorized administrators and staff can sign in through this portal.",
      };
    }
  } else {
    // Normal user login (/login)
    if (isSuper) {
      return {
        allowed: false,
        error: "Super Admin accounts must sign in using the dedicated Super Admin portal: /superadminlogin",
      };
    }
    if (isAdminStaff) {
      return {
        allowed: false,
        error: "Admin and staff accounts must sign in using the dedicated Admin portal: /adminlogin",
      };
    }
  }

  return { allowed: true };
}

console.log("==================================================");
console.log("🚀 TESTING STRICT SEPARATE LOGIN PORTALS RBAC");
console.log("==================================================");

const superAdminUser = { role: "SUPER_ADMIN", email: "vinayaksahu3@gmail.com" };
const subAdminUser = { role: "ADMIN", email: "staff@superwarrior30.com" };
const supportUser = { role: "SUPPORT", email: "support@superwarrior30.com" };
const studentUser = { role: "STUDENT", email: "student@example.com" };

// 1. /superadminlogin tests
console.log("\n--- PORTAL 1: /superadminlogin ---");
const t1 = evaluatePortalAccess("SUPER_ADMIN", superAdminUser);
assert(t1.allowed === true, "Super Admin is ALLOWED on /superadminlogin");

const t2 = evaluatePortalAccess("SUPER_ADMIN", subAdminUser);
assert(t2.allowed === false, "Sub-Admin is REJECTED on /superadminlogin");

const t3 = evaluatePortalAccess("SUPER_ADMIN", studentUser);
assert(t3.allowed === false, "Student is REJECTED on /superadminlogin");

// 2. /adminlogin tests
console.log("\n--- PORTAL 2: /adminlogin ---");
const t4 = evaluatePortalAccess("ADMIN", superAdminUser);
assert(t4.allowed === true, "Super Admin is ALLOWED on /adminlogin");

const t5 = evaluatePortalAccess("ADMIN", subAdminUser);
assert(t5.allowed === true, "Sub-Admin is ALLOWED on /adminlogin");

const t6 = evaluatePortalAccess("ADMIN", supportUser);
assert(t6.allowed === true, "Support Staff is ALLOWED on /adminlogin");

const t7 = evaluatePortalAccess("ADMIN", studentUser);
assert(t7.allowed === false, "Student is REJECTED on /adminlogin");

// 3. /login tests (Student portal)
console.log("\n--- PORTAL 3: /login (Normal Student Portal) ---");
const t8 = evaluatePortalAccess("STUDENT", studentUser);
assert(t8.allowed === true, "Student is ALLOWED on normal /login");

const t9 = evaluatePortalAccess("STUDENT", superAdminUser);
assert(t9.allowed === false, "Super Admin is REJECTED on normal /login (forced to /superadminlogin)");

const t10 = evaluatePortalAccess("STUDENT", subAdminUser);
assert(t10.allowed === false, "Sub-Admin is REJECTED on normal /login (forced to /adminlogin)");

const t11 = evaluatePortalAccess("STUDENT", supportUser);
assert(t11.allowed === false, "Support staff is REJECTED on normal /login (forced to /adminlogin)");

console.log("\n==================================================");
console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
