import "dotenv/config";
import { getProductionPrismaClient, getTestPrismaClient } from "../src/lib/prisma";

async function syncAllStaff() {
  console.log("🔄 Syncing all Staff and Admin accounts from Test DB to Production DB...\n");

  const prodClient = getProductionPrismaClient();
  const testClient = getTestPrismaClient();

  // Find all staff/admin accounts in Test DB
  const testStaff = await testClient.user.findMany({
    where: {
      OR: [
        { role: "SUPER_ADMIN" },
        { role: "ADMIN" },
        { role: "SUPPORT" },
        { adminRole: { not: null } },
      ],
    },
  });

  console.log(`Found ${testStaff.length} staff accounts in Test DB:`);

  for (const staff of testStaff) {
    console.log(`- Syncing ${staff.email} (${staff.name}, Role: ${staff.role}, AdminRole: ${staff.adminRole})...`);

    await prodClient.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        phone: staff.phone,
        passwordHash: staff.passwordHash,
        role: staff.role,
        adminRole: staff.adminRole,
        customPermissions: staff.customPermissions || [],
        status: staff.status,
      },
      create: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        phone: staff.phone,
        passwordHash: staff.passwordHash,
        role: staff.role,
        adminRole: staff.adminRole,
        customPermissions: staff.customPermissions || [],
        status: staff.status,
        referralCode: staff.referralCode,
        isTestData: false,
      },
    });
  }

  console.log("\n🎉 All staff accounts and passwords successfully synced to Production DB!");

  await prodClient.$disconnect();
  await testClient.$disconnect();
}

syncAllStaff().catch(console.error);
