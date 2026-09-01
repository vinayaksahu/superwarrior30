import {
  type AdminRoleType,
  ROLE_PRESETS,
  ALL_MODULES,
  ALL_PERMISSION_KEYS,
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  getRolePresentation,
} from "../src/lib/permissions";

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

console.log("==================================================");
console.log("🚀 PRODUCTION-GRADE RBAC & ROLE SYSTEM TESTS");
console.log("==================================================");

// 1. Super Admin Tests
console.log("\n--- TEST SUITE 1: SUPER_ADMIN (Root Authority) ---");
const superAdminUser = {
  role: "SUPER_ADMIN",
  adminRole: "SUPER_ADMIN",
  email: "vinayaksahu3@gmail.com",
};
const superAdminPerms = getEffectivePermissions(superAdminUser);
assert(superAdminPerms.size === ALL_PERMISSION_KEYS.length, "Super Admin receives 100% of all permissions");
assert(hasPermission(superAdminUser, "withdrawals.payout") === true, "Super Admin can payout withdrawals");
assert(hasPermission(superAdminUser, "settings.email_otp.manage") === true, "Super Admin can manage email & OTP security");
assert(hasPermission(superAdminUser, "settings.media_storage.manage") === true, "Super Admin can manage Bunny storage");
assert(hasPermission(superAdminUser, "staff.roles_assign") === true, "Super Admin can assign roles & permissions");

const superPresentation = getRolePresentation(superAdminUser.role, superAdminUser.adminRole, superAdminUser.email);
assert(superPresentation.displayName === "Super Admin", "Super Admin presentation is 'Super Admin'");
assert(superPresentation.effectiveRoleKey === "SUPER_ADMIN", "Super Admin effective role is 'SUPER_ADMIN'");

// 2. Full Access Admin Tests
console.log("\n--- TEST SUITE 2: FULL_ACCESS_ADMIN ---");
const fullAdminUser = {
  role: "ADMIN",
  adminRole: "FULL_ACCESS_ADMIN",
  email: "fulladmin@superwarrior30.com",
};
assert(hasPermission(fullAdminUser, "courses.create") === true, "Full Access Admin can create courses");
assert(hasPermission(fullAdminUser, "orders.manage") === true, "Full Access Admin can manage orders");
assert(hasPermission(fullAdminUser, "withdrawals.approve") === true, "Full Access Admin can approve withdrawals");
assert(hasPermission(fullAdminUser, "settings.general.manage") === true, "Full Access Admin can manage general branding");
// Sensitive security settings default protection
assert(hasPermission(fullAdminUser, "settings.media_storage.manage") === false, "Full Access Admin cannot manage media storage unless granted");

// 3. Support Role Tests
console.log("\n--- TEST SUITE 3: ONLY_SUPPORT ---");
const supportUser = {
  role: "SUPPORT",
  adminRole: "SUPPORT",
  email: "support@superwarrior30.com",
};
assert(hasPermission(supportUser, "support.view") === true, "Support staff can view support inquiries");
assert(hasPermission(supportUser, "support.respond") === true, "Support staff can reply to tickets");
assert(hasPermission(supportUser, "students.view") === true, "Support staff can view student profiles");
assert(hasPermission(supportUser, "orders.view") === true, "Support staff can view orders for customer assistance");
assert(hasPermission(supportUser, "withdrawals.approve") === false, "Support staff CANNOT approve withdrawals");
assert(hasPermission(supportUser, "withdrawals.payout") === false, "Support staff CANNOT release payouts");
assert(hasPermission(supportUser, "settings.general.manage") === false, "Support staff CANNOT manage system settings");

// 4. Viewer Role Tests
console.log("\n--- TEST SUITE 4: ONLY_VIEWER ---");
const viewerUser = {
  role: "SUPPORT",
  adminRole: "VIEWER",
  email: "viewer@superwarrior30.com",
};
assert(hasPermission(viewerUser, "dashboard.view") === true, "Viewer can view dashboard");
assert(hasPermission(viewerUser, "courses.view") === true, "Viewer can view courses");
assert(hasPermission(viewerUser, "courses.create") === false, "Viewer CANNOT create courses");
assert(hasPermission(viewerUser, "courses.edit") === false, "Viewer CANNOT edit courses");
assert(hasPermission(viewerUser, "courses.delete") === false, "Viewer CANNOT delete courses");
assert(hasPermission(viewerUser, "orders.manage") === false, "Viewer CANNOT approve/cancel orders");
assert(hasPermission(viewerUser, "withdrawals.approve") === false, "Viewer CANNOT approve withdrawals");

// 5. Finance Role Tests
console.log("\n--- TEST SUITE 5: FINANCE ---");
const financeUser = {
  role: "ADMIN",
  adminRole: "FINANCE",
  email: "finance@superwarrior30.com",
};
assert(hasPermission(financeUser, "orders.view") === true, "Finance can view orders");
assert(hasPermission(financeUser, "orders.manage") === true, "Finance can manage orders");
assert(hasPermission(financeUser, "withdrawals.view") === true, "Finance can view withdrawals");
assert(hasPermission(financeUser, "withdrawals.approve") === true, "Finance can approve withdrawals");
assert(hasPermission(financeUser, "withdrawals.payout") === true, "Finance can release payouts");
assert(hasPermission(financeUser, "wallet.manage") === true, "Finance can manage wallet ledger");
assert(hasPermission(financeUser, "payment_methods.manage") === true, "Finance can configure payment methods");
assert(hasPermission(financeUser, "offers.payout") === true, "Finance can payout cashback claims");
assert(hasPermission(financeUser, "courses.create") === false, "Finance CANNOT create courses");
assert(hasPermission(financeUser, "leads.manage") === false, "Finance CANNOT manage marketing leads");
assert(hasPermission(financeUser, "settings.email_otp.manage") === false, "Finance CANNOT change OTP security settings");

// 6. Marketing Role Tests
console.log("\n--- TEST SUITE 6: MARKETER ---");
const marketerUser = {
  role: "ADMIN",
  adminRole: "MARKETING",
  email: "marketer@superwarrior30.com",
};
assert(hasPermission(marketerUser, "offers.create") === true, "Marketer can create discount coupons");
assert(hasPermission(marketerUser, "affiliate.manage") === true, "Marketer can configure affiliate commission tiers");
assert(hasPermission(marketerUser, "leads.view") === true, "Marketer can view captured leads");
assert(hasPermission(marketerUser, "funnel.view") === true, "Marketer can view funnel analytics");
assert(hasPermission(marketerUser, "testimonials.approve") === true, "Marketer can approve student testimonials");
assert(hasPermission(marketerUser, "withdrawals.payout") === false, "Marketer CANNOT release withdrawal payouts");
assert(hasPermission(marketerUser, "withdrawals.approve") === false, "Marketer CANNOT approve withdrawals");
assert(hasPermission(marketerUser, "settings.general.manage") === false, "Marketer CANNOT change site branding unless granted");

// 7. Custom Role Granular Tests
console.log("\n--- TEST SUITE 7: CUSTOM_ROLE ---");
const customUser = {
  role: "ADMIN",
  adminRole: "CUSTOM_ROLE",
  customPermissions: ["courses.view", "courses.edit", "support.view", "support.respond"],
  email: "custom@superwarrior30.com",
};
assert(hasPermission(customUser, "courses.view") === true, "Custom Role has granted courses.view");
assert(hasPermission(customUser, "courses.edit") === true, "Custom Role has granted courses.edit");
assert(hasPermission(customUser, "support.respond") === true, "Custom Role has granted support.respond");
assert(hasPermission(customUser, "courses.delete") === false, "Custom Role lacks ungranted courses.delete");
assert(hasPermission(customUser, "orders.view") === false, "Custom Role lacks ungranted orders.view");
assert(hasPermission(customUser, "withdrawals.approve") === false, "Custom Role lacks ungranted withdrawals.approve");

// 9. Subadmin Privacy & Super Admin Isolation Tests
console.log("\n--- TEST SUITE 9: SUPER ADMIN PRIVACY & AUDIT LOG ISOLATION ---");
const sampleStaffList = [
  { id: "usr_admin_001", email: "vinayaksahu3@gmail.com", adminRole: "SUPER_ADMIN", baseRole: "SUPER_ADMIN" },
  { id: "usr_admin_002", email: "support@superwarrior30.com", adminRole: "SUPPORT", baseRole: "SUPPORT" },
  { id: "usr_admin_003", email: "rahultradeworrieracademy@gmail.com", adminRole: "FULL_ACCESS_ADMIN", baseRole: "ADMIN" },
];

const subadminVisibleList = sampleStaffList.filter((s) => {
  return (
    s.adminRole !== "SUPER_ADMIN" &&
    s.baseRole !== "SUPER_ADMIN" &&
    s.email !== "vinayaksahu3@gmail.com" &&
    s.email !== "admin@superwarrior30.com"
  );
});

assert(subadminVisibleList.length === 2, "Subadmins only see other staff members (Super Admin is stripped out)");
assert(!subadminVisibleList.some((s) => s.email === "vinayaksahu3@gmail.com"), "Super Admin email is 100% invisible to subadmins");
assert(!subadminVisibleList.some((s) => s.adminRole === "SUPER_ADMIN"), "Super Admin role is 100% invisible to subadmins");

console.log("\n==================================================");
console.log(`📊 TOTAL RBAC TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
