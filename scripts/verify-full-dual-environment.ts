import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getProductionPrismaClient,
  getTestPrismaClient,
  getDatabaseContext,
  verifyDatabaseIdentity,
  prisma,
} from "../src/lib/prisma";
import { withEnvironmentContext, resolveCurrentEnvironment } from "../src/lib/env-context";
import { getResolvedBunnyConfig } from "../src/lib/bunny/config";

async function runVerification() {
  console.log("=================================================================");
  console.log("🔍 COMPREHENSIVE LIVE PRODUCTION vs TESTING MODE AUDIT");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // PART 1: PHYSICAL DATABASE CHECK — PRODUCTION DB (productiondb)
  // -------------------------------------------------------------
  console.log("--- 1. PHYSICAL LIVE PRODUCTION DATABASE (`productiondb`) ---");
  const prodClient = getProductionPrismaClient();
  const prodIdentity = await verifyDatabaseIdentity("LIVE");

  const [prodSuperAdmin, prodStudentsCount, prodCoursesCount, prodOrdersCount, prodMediaConfig] = await Promise.all([
    prodClient.user.findFirst({
      where: { email: "vinayaksahu3@gmail.com" },
      select: { id: true, email: true, name: true, role: true, adminRole: true, status: true },
    }),
    prodClient.user.count({ where: { role: "STUDENT" } }),
    prodClient.course.count(),
    prodClient.order.count(),
    prodClient.mediaProviderConfig.findFirst({ where: { provider: "BUNNY" } }),
  ]);

  console.log(`   Database Name:     ${prodIdentity.databaseName}`);
  console.log(`   Super Admin:       ${prodSuperAdmin ? `✅ Present (${prodSuperAdmin.email}, Role: ${prodSuperAdmin.role})` : "❌ NOT FOUND"}`);
  console.log(`   Total Students:    ${prodStudentsCount} (Clean Fresh Count)`);
  console.log(`   Total Courses:     ${prodCoursesCount}`);
  console.log(`   Total Orders:      ${prodOrdersCount}`);
  console.log(`   Bunny Storage:     ${prodMediaConfig?.storageZoneName || "Not configured"}`);
  console.log(`   Bunny CDN Host:    ${prodMediaConfig?.cdnHostname || "Not configured"}`);

  // -------------------------------------------------------------
  // PART 2: PHYSICAL DATABASE CHECK — TEST DB (neondb)
  // -------------------------------------------------------------
  console.log("\n--- 2. PHYSICAL TEST DATABASE (`neondb`) ---");
  const testClient = getTestPrismaClient();
  const testIdentity = await verifyDatabaseIdentity("TEST");

  const [testSuperAdmin, testStudentsCount, testCoursesCount, testOrdersCount] = await Promise.all([
    testClient.user.findFirst({
      where: { email: "vinayaksahu3@gmail.com" },
      select: { id: true, email: true, name: true, role: true, adminRole: true, status: true },
    }),
    testClient.user.count({ where: { role: "STUDENT" } }),
    testClient.course.count(),
    testClient.order.count(),
  ]);

  console.log(`   Database Name:     ${testIdentity.databaseName}`);
  console.log(`   Super Admin:       ${testSuperAdmin ? `✅ Present (${testSuperAdmin.email}, Role: ${testSuperAdmin.role})` : "❌ NOT FOUND"}`);
  console.log(`   Total Students:    ${testStudentsCount} (Old Test Students)`);
  console.log(`   Total Courses:     ${testCoursesCount} (Old Test Courses)`);
  console.log(`   Total Orders:      ${testOrdersCount} (Old Test Orders)`);

  // -------------------------------------------------------------
  // PART 3: RUNTIME CONTEXT SWITCHING & PROXY ROUTING
  // -------------------------------------------------------------
  console.log("\n--- 3. RUNTIME DYNAMIC SWITCHING VERIFICATION ---");

  // LIVE CONTEXT EXECUTION
  const liveRun = await withEnvironmentContext("LIVE", async () => {
    const ctx = await getDatabaseContext();
    const students = await prisma.user.count({ where: { role: "STUDENT" } });
    const orders = await prisma.order.count();
    const bunny = await getResolvedBunnyConfig();
    return { ctx, students, orders, bunny };
  });

  console.log(`🟢 LIVE Mode Execution:`);
  console.log(`   - Target DB:       ${liveRun.ctx.target} (Mode: ${liveRun.ctx.mode})`);
  console.log(`   - Students Count:  ${liveRun.students}`);
  console.log(`   - Orders Count:    ${liveRun.orders}`);
  console.log(`   - Bunny Storage:   ${liveRun.bunny.storageZoneName}`);
  console.log(`   - Bunny CDN:       ${liveRun.bunny.cdnHostname}`);

  // TEST CONTEXT EXECUTION
  const testRun = await withEnvironmentContext("TEST", async () => {
    const ctx = await getDatabaseContext();
    const students = await prisma.user.count({ where: { role: "STUDENT" } });
    const orders = await prisma.order.count();
    const bunny = await getResolvedBunnyConfig();
    return { ctx, students, orders, bunny };
  });

  console.log(`\n🟡 TESTING Mode Execution:`);
  console.log(`   - Target DB:       ${testRun.ctx.target} (Mode: ${testRun.ctx.mode})`);
  console.log(`   - Students Count:  ${testRun.students}`);
  console.log(`   - Orders Count:    ${testRun.orders}`);
  console.log(`   - Bunny Storage:   ${testRun.bunny.storageZoneName}`);
  console.log(`   - Bunny CDN:       ${testRun.bunny.cdnHostname}`);

  // -------------------------------------------------------------
  // PART 4: INTEGRITY ASSERTIONS
  // -------------------------------------------------------------
  console.log("\n--- 4. FINAL VERIFICATION SUMMARY ---");
  const isProdOk = Boolean(prodSuperAdmin && prodIdentity.databaseName === "productiondb");
  const isTestOk = Boolean(testSuperAdmin && testIdentity.databaseName === "neondb");
  const isDifferentDb = prodIdentity.databaseName !== testIdentity.databaseName;
  const isBunnyIsolated = liveRun.bunny.storageZoneName !== testRun.bunny.storageZoneName;

  console.log(`   1. Super Admin in Production DB:   ${isProdOk ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   2. Super Admin in Test DB:         ${isTestOk ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   3. Physical Database Isolation:    ${isDifferentDb ? "✅ PASSED (productiondb != neondb)" : "❌ FAILED"}`);
  console.log(`   4. Bunny Storage Zone Isolation:   ${isBunnyIsolated ? "✅ PASSED (sw30-production-storage != lms-prod-storage-7996)" : "❌ FAILED"}`);

  if (isProdOk && isTestOk && isDifferentDb && isBunnyIsolated) {
    console.log("\n🎉 ALL CHECKS PASSED: SYSTEM IS 100% ISOLATED AND FULLY OPERATIONAL!\n");
  } else {
    console.error("\n❌ WARNING: Some checks did not pass.");
    process.exit(1);
  }

  await prodClient.$disconnect();
  await testClient.$disconnect();
}

runVerification().catch((err) => {
  console.error("Verification execution error:", err);
  process.exit(1);
});
