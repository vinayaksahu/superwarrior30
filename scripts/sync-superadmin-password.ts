import "dotenv/config";
import { getProductionPrismaClient, getTestPrismaClient } from "../src/lib/prisma";

async function syncSuperAdminPassword() {
  console.log("🔐 Syncing Super Admin password from Test DB to Production DB...");

  const testClient = getTestPrismaClient();
  const prodClient = getProductionPrismaClient();

  const testSuper = await testClient.user.findFirst({
    where: { email: "vinayaksahu3@gmail.com" },
    select: { email: true, passwordHash: true, name: true, phone: true, role: true, adminRole: true },
  });

  if (!testSuper) {
    throw new Error("Super Admin vinayaksahu3@gmail.com not found in Test DB.");
  }

  console.log(`✅ Found Super Admin in Test DB (${testSuper.email}).`);

  // Update in Production DB with the exact same passwordHash
  const updatedProd = await prodClient.user.update({
    where: { email: "vinayaksahu3@gmail.com" },
    data: {
      passwordHash: testSuper.passwordHash,
      name: testSuper.name || "Vinayak Sahu",
      phone: testSuper.phone,
      role: "SUPER_ADMIN",
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`🎉 Successfully synced password for ${updatedProd.email} to Production DB!`);

  await testClient.$disconnect();
  await prodClient.$disconnect();
}

syncSuperAdminPassword().catch((err) => {
  console.error("❌ Error syncing password:", err);
  process.exit(1);
});
