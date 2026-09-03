import "dotenv/config";
import { getProductionPrismaClient } from "../src/lib/prisma";

async function cleanProductionTestFlags() {
  console.log("🧹 Clearing test flags from all users and records in productiondb...\n");

  const prodClient = getProductionPrismaClient();

  const userUpdate = await prodClient.user.updateMany({
    data: { isTestData: false },
  });

  const walletUpdate = await prodClient.wallet.updateMany({
    data: { isTestData: false },
  });

  const orderUpdate = await prodClient.order.updateMany({
    data: { isTestData: false },
  });

  const refUpdate = await prodClient.referralRelationship.updateMany({
    data: { isTestData: false },
  });

  console.log(`✅ Updated ${userUpdate.count} users in productiondb (isTestData = false).`);
  console.log(`✅ Updated ${walletUpdate.count} wallets in productiondb.`);
  console.log(`✅ Updated ${orderUpdate.count} orders in productiondb.`);
  console.log(`✅ Updated ${refUpdate.count} referral relationships in productiondb.`);

  const users = await prodClient.user.findMany({
    select: { id: true, email: true, name: true, role: true, isTestData: true },
  });
  console.table(users);

  await prodClient.$disconnect();
}

cleanProductionTestFlags().catch(console.error);
