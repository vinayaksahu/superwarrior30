import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  console.log("🚀 Initializing Clean Production Database...");
  console.log(`Target: ${connectionString.split("@")[1] || "productiondb"}\n`);

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // 1. Create / Ensure Super Admin User
  const defaultPassword = await hash("SuperAdmin@2026", 12);
  const superAdminEmail = "vinayaksahu3@gmail.com";

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      role: "SUPER_ADMIN",
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: superAdminEmail,
      name: "Vinayak Sahu",
      passwordHash: defaultPassword,
      role: "SUPER_ADMIN",
      adminRole: "SUPER_ADMIN",
      referralCode: "SUPERADMIN",
      status: "ACTIVE",
      isTestData: false,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      isTestData: false,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email} (${superAdmin.role})`);

  // 2. Create Default Referral Commission Levels (Level 1: 10%, Level 2: 5%, Level 3: 3%)
  const levels = [
    { level: 1, commissionRate: 0.10, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
    { level: 2, commissionRate: 0.05, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
    { level: 3, commissionRate: 0.03, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
  ];

  for (const lvl of levels) {
    await prisma.referralLevel.upsert({
      where: { level: lvl.level },
      update: {
        commissionRate: lvl.commissionRate,
        isEnabled: lvl.isEnabled,
      },
      create: lvl,
    });
  }
  console.log(`✅ Commission tiers configured: L1=10%, L2=5%, L3=3%`);

  // 3. Core System Site Settings
  const defaultSettings = [
    { key: "site_name", value: "Super Warrior 30", type: "string" },
    { key: "site_tagline", value: "Premium Trading & Financial Mastery", type: "string" },
    { key: "currency", value: "INR", type: "string" },
    { key: "referral_enabled", value: "true", type: "boolean" },
    { key: "commission_holding_days", value: "0", type: "number" },
    { key: "min_withdrawal_amount", value: "500", type: "number" },
    { key: "contact_email", value: "support@superwarrior30.com", type: "string" },
    { key: "test_mode_visibility_scope", value: "ADMINS_ONLY", type: "string" },
  ];

  for (const setting of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
      },
    });
  }
  console.log(`✅ Core site settings initialized`);

  // Verify Counts in Fresh Production DB
  const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
  const orderCount = await prisma.order.count();
  console.log("\n---------------------------------------------");
  console.log(`📊 FRESH PRODUCTION DB VERIFICATION:`);
  console.log(`   Total Students: ${studentCount}`);
  console.log(`   Total Orders:   ${orderCount}`);
  console.log(`   Super Admin:    ${superAdmin.email}`);
  console.log("---------------------------------------------\n");
  console.log("🎉 Clean Production Database is 100% READY!");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Initialization error:", err);
  process.exit(1);
});
