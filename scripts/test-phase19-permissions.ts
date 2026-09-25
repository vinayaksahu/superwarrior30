/**
 * Test Suite: Phase 19 - Granular Admin Permissions Enforcement
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import {
  ALL_MODULES,
  ROLE_PRESETS,
  hasPermission,
  getEffectivePermissions,
} from "../src/lib/permissions";

async function runPhase19Tests() {
  console.log("================================================================================");
  console.log("PHASE 19 TEST SUITE: GRANULAR ADMIN PERMISSIONS ENFORCEMENT");
  console.log("================================================================================\n");

  // TEST 1: Module and Permissions Definition
  console.log("[TEST 1] Verifying youtube_live_trades module definition in ALL_MODULES...");
  const moduleDef = ALL_MODULES.find((m) => m.id === "youtube_live_trades");

  if (!moduleDef) {
    throw new Error("Test 1 Failed: youtube_live_trades module definition not found in ALL_MODULES");
  }

  const expectedPermissions = [
    "youtube_live_trades.view",
    "youtube_live_trades.analyze",
    "youtube_live_trades.generate_clip",
    "youtube_live_trades.delete",
    "youtube_live_trades.settings",
    "youtube_live_trades.manage",
  ];

  for (const perm of expectedPermissions) {
    const found = moduleDef.permissions.find((p) => p.key === perm);
    if (!found) {
      throw new Error(`Test 1 Failed: Permission ${perm} missing from module definition`);
    }
  }

  console.log(`[PASS] Test 1: Module defined with all ${expectedPermissions.length} granular permissions\n`);

  // TEST 2: Role Preset Inclusions
  console.log("[TEST 2] Verifying permissions in FULL_ACCESS_ADMIN role preset...");
  const fullAccessPerms = ROLE_PRESETS.FULL_ACCESS_ADMIN.defaultPermissions;

  for (const perm of expectedPermissions) {
    if (!fullAccessPerms.includes(perm)) {
      throw new Error(`Test 2 Failed: FULL_ACCESS_ADMIN preset is missing permission: ${perm}`);
    }
  }

  console.log(`[PASS] Test 2: FULL_ACCESS_ADMIN contains all ${expectedPermissions.length} trade permissions\n`);

  // TEST 3: Access Control Logic (SUPER_ADMIN, FULL_ACCESS_ADMIN, VIEWER)
  console.log("[TEST 3] Testing permission evaluation for various roles...");

  // Super Admin has wildcard access to everything
  const superAdminUser = {
    role: "ADMIN",
    adminRole: "SUPER_ADMIN" as const,
    customPermissions: [],
  };

  const fullAdminUser = {
    role: "ADMIN",
    adminRole: "FULL_ACCESS_ADMIN" as const,
    customPermissions: [],
  };

  const viewerUser = {
    role: "ADMIN",
    adminRole: "VIEWER" as const,
    customPermissions: [],
  };

  // Super Admin can do all
  if (!hasPermission(superAdminUser, "youtube_live_trades.generate_clip")) {
    throw new Error("Test 3 Failed: Super Admin should have generate_clip access");
  }
  if (!hasPermission(superAdminUser, "youtube_live_trades.delete")) {
    throw new Error("Test 3 Failed: Super Admin should have delete access");
  }

  // Full Access Admin can do all
  if (!hasPermission(fullAdminUser, "youtube_live_trades.generate_clip")) {
    throw new Error("Test 3 Failed: Full Access Admin should have generate_clip access");
  }

  // Viewer should be blocked from destructive/creative actions
  if (hasPermission(viewerUser, "youtube_live_trades.delete")) {
    throw new Error("Test 3 Failed: Viewer role must NOT have delete permission");
  }
  if (hasPermission(viewerUser, "youtube_live_trades.generate_clip")) {
    throw new Error("Test 3 Failed: Viewer role must NOT have generate_clip permission");
  }

  console.log("[PASS] Test 3: Access control logic strictly enforced across roles\n");

  console.log("================================================================================");
  console.log("ALL PHASE 19 TESTS PASSED SUCCESSFULLY! (Granular Permissions Enforcement)");
  console.log("================================================================================");
}

runPhase19Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
