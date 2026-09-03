import "dotenv/config";
import { getProductionPrismaClient } from "../src/lib/prisma";

async function inspectStudent() {
  const prodClient = getProductionPrismaClient();

  const user = await prodClient.user.findFirst({
    where: { email: "vinayaksahu494@gmail.com" },
  });

  console.log("Student in productiondb:", user);

  // Check all users in productiondb
  const allUsers = await prodClient.user.findMany({
    select: { id: true, email: true, name: true, role: true, isTestData: true, referralCode: true, createdAt: true },
  });
  console.log("\nAll users in productiondb:");
  console.table(allUsers);

  await prodClient.$disconnect();
}

inspectStudent().catch(console.error);
