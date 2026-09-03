import "dotenv/config";
import { getProductionPrismaClient, getTestPrismaClient } from "../src/lib/prisma";

async function inspectStaffUser() {
  const prodClient = getProductionPrismaClient();
  const testClient = getTestPrismaClient();

  const email = "rahultradeworrieracademy@gmail.com";

  const prodUser = await prodClient.user.findFirst({
    where: { email },
  });

  const testUser = await testClient.user.findFirst({
    where: { email },
  });

  console.log("🟢 PRODUCTION DB:");
  console.log({
    id: prodUser?.id,
    email: prodUser?.email,
    role: prodUser?.role,
    adminRole: prodUser?.adminRole,
    passwordHash: prodUser?.passwordHash?.slice(0, 15) + "...",
    status: prodUser?.status,
  });

  console.log("\n🟡 TEST DB:");
  console.log({
    id: testUser?.id,
    email: testUser?.email,
    role: testUser?.role,
    adminRole: testUser?.adminRole,
    passwordHash: testUser?.passwordHash?.slice(0, 15) + "...",
    status: testUser?.status,
  });

  if (testUser && prodUser && testUser.passwordHash !== prodUser.passwordHash) {
    console.log("⚠️ Password hash differs between Test DB and Production DB!");
  }

  await prodClient.$disconnect();
  await testClient.$disconnect();
}

inspectStaffUser().catch(console.error);
