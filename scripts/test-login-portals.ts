import crypto from "crypto";

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

  if (normalizedPortal === "SUPER_ADMIN") {
    const isSuper =
      user.role === "SUPER_ADMIN" ||
      user.email === "vinayaksahu3@gmail.com" ||
      user.email === "admin@superwarrior30.com";

    if (!isSuper) {
      return {
        allowed: false,
        error: "Access denied. Only Super Admin accounts are authorized to sign in through this portal.",
      };
    }
  } else if (normalizedPortal === "ADMIN") {
    const isAdminStaff =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "SUPPORT" ||
      user.email === "vinayaksahu3@gmail.com" ||
      user.email === "admin@superwarrior30.com";

    if (!isAdminStaff) {
      return {
        allowed: false,
        error: "Access denied. Only authorized administrators and staff can sign in through this portal.",
      };
    }
  }

  return { allowed: true };
}

console.log("==================================================");
console.log("🚀 TESTING SEPARATE LOGIN PORTALS RBAC LOGIC");
console.log("==================================================");

// Test 1: Super Admin on /superadminlogin
const superAdminUser = { role: "SUPER_ADMIN", email: "vinayaksahu3@gmail.com" };
const test1 = evaluatePortalAccess("SUPER_ADMIN", superAdminUser);
assert(test1.allowed === true, "Super Admin is ALLOWED on /superadminlogin");

// Test 2: Student on /superadminlogin
const studentUser = { role: "STUDENT", email: "student@example.com" };
const test2 = evaluatePortalAccess("SUPER_ADMIN", studentUser);
assert(test2.allowed === false, "Student is REJECTED on /superadminlogin");
assert(test2.error?.includes("Only Super Admin") === true, "Student receives proper unauthorized message on /superadminlogin");

// Test 3: Sub-Admin on /superadminlogin
const subAdminUser = { role: "ADMIN", email: "staff@superwarrior30.com" };
const test3 = evaluatePortalAccess("SUPER_ADMIN", subAdminUser);
assert(test3.allowed === false, "Regular Sub-Admin is REJECTED on /superadminlogin");

// Test 4: Sub-Admin on /adminlogin
const test4 = evaluatePortalAccess("ADMIN", subAdminUser);
assert(test4.allowed === true, "Sub-Admin is ALLOWED on /adminlogin");

// Test 5: Support Staff on /adminlogin
const supportUser = { role: "SUPPORT", email: "support@superwarrior30.com" };
const test5 = evaluatePortalAccess("ADMIN", supportUser);
assert(test5.allowed === true, "Support staff is ALLOWED on /adminlogin");

// Test 6: Super Admin on /adminlogin
const test6 = evaluatePortalAccess("ADMIN", superAdminUser);
assert(test6.allowed === true, "Super Admin is ALLOWED on /adminlogin");

// Test 7: Student on /adminlogin
const test7 = evaluatePortalAccess("ADMIN", studentUser);
assert(test7.allowed === false, "Student is REJECTED on /adminlogin");
assert(test7.error?.includes("Only authorized administrators") === true, "Student receives proper unauthorized message on /adminlogin");

// Test 8: Student on normal /login
const test8 = evaluatePortalAccess("STUDENT", studentUser);
assert(test8.allowed === true, "Student is ALLOWED on normal /login");

// Test 9: Super Admin on normal /login
const test9 = evaluatePortalAccess("STUDENT", superAdminUser);
assert(test9.allowed === true, "Super Admin is ALLOWED on normal /login");

console.log("\n==================================================");
console.log(`📊 PORTAL RBAC SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
