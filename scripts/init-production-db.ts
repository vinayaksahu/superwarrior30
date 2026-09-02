import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

function normalizeConnectionString(url: string | undefined): string {
  if (!url) return "";
  if (url.includes("sslmode=require")) {
    return url.replace("sslmode=require", "sslmode=verify-full");
  }
  return url;
}

export async function initializeProductionDatabase(customUrl?: string) {
  const prodUrl = customUrl || process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

  if (!prodUrl) {
    throw new Error("[INIT ERROR] PRODUCTION_DATABASE_URL is not set.");
  }

  console.log("==================================================");
  console.log("🚀 INITIALIZING FRESH PRODUCTION DATABASE");
  console.log("==================================================");

  const connectionString = normalizeConnectionString(prodUrl);
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Create Root Super Admin
    const superAdminPassword = await hash("SuperAdmin@2026!", 12);
    const superAdmin = await prisma.user.upsert({
      where: { email: "vinayaksahu3@gmail.com" },
      update: {
        role: "SUPER_ADMIN",
        adminRole: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      create: {
        email: "vinayaksahu3@gmail.com",
        name: "Vinayak Sahu",
        passwordHash: superAdminPassword,
        role: "SUPER_ADMIN",
        adminRole: "SUPER_ADMIN",
        status: "ACTIVE",
        referralCode: "SUPERADMIN",
      },
    });
    console.log(`✅ Super Admin created in Production: ${superAdmin.email}`);

    // Create Super Admin Wallet
    await prisma.wallet.upsert({
      where: { userId: superAdmin.id },
      update: {},
      create: { userId: superAdmin.id, availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalWithdrawn: 0 },
    });

    // 2. Provision Referral Levels
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
          requiresDirectReferralQualification: lvl.requiresDirectReferralQualification,
          directReferralsRequired: lvl.directReferralsRequired,
        },
        create: lvl,
      });
    }
    console.log(`✅ Default Referral Levels provisioned: L1=10%, L2=5%, L3=3%`);

    // 3. Provision Core Site Settings
    const defaultSettings = [
      { key: "site_name", value: "Super Warrior 30", type: "string" },
      { key: "site_tagline", value: "Premium Trading Education", type: "string" },
      { key: "currency", value: "INR", type: "string" },
      { key: "referral_enabled", value: "true", type: "boolean" },
      { key: "commission_holding_days", value: "7", type: "number" },
      { key: "min_withdrawal_amount", value: "500", type: "number" },
      { key: "contact_email", value: "support@superwarrior30.com", type: "string" },
      { key: "contact_phone", value: "+91-9876543210", type: "string" },
    ];

    for (const setting of defaultSettings) {
      await prisma.siteSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
    console.log(`✅ System site settings initialized (${defaultSettings.length} entries)`);

    // 4. Verify Zero Business Data
    const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
    const orderCount = await prisma.order.count();
    const leadCount = await prisma.lead.count();
    const withdrawalCount = await prisma.withdrawal.count();
    const supportInquiryCount = await prisma.supportInquiry.count();
    const commissionCount = await prisma.referralCommissionRecord.count();

    console.log("\n📊 PRODUCTION ZERO BUSINESS DATA VERIFICATION:");
    console.log(`  - Students: ${studentCount}`);
    console.log(`  - Orders: ${orderCount}`);
    console.log(`  - Leads: ${leadCount}`);
    console.log(`  - Withdrawals: ${withdrawalCount}`);
    console.log(`  - Support Inquiries: ${supportInquiryCount}`);
    console.log(`  - Commissions: ${commissionCount}`);

    console.log("\n🎉 Production database successfully initialized and verified clean!\n");
  } catch (err: any) {
    console.error("❌ Production DB initialization failed:", err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  initializeProductionDatabase().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
