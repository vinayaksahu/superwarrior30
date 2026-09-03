import "dotenv/config";
import { getProductionPrismaClient, getTestPrismaClient } from "../src/lib/prisma";

async function inspectSupportUsers() {
  console.log("🔍 Inspecting Support users across databases...\n");

  const prodClient = getProductionPrismaClient();
  const testClient = getTestPrismaClient();

  const prodUsers = await prodClient.user.findMany({
    select: { id: true, email: true, name: true, role: true, adminRole: true, customPermissions: true, status: true },
  });

  const testUsers = await testClient.user.findMany({
    select: { id: true, email: true, name: true, role: true, adminRole: true, customPermissions: true, status: true },
  });

  console.log("🟢 PRODUCTION DB USERS:");
  console.table(prodUsers);

  console.log("\n🟡 TEST DB USERS:");
  console.table(testUsers);

  await prodClient.$disconnect();
  await testClient.$disconnect();
}

inspectSupportUsers().catch(console.error);
