import "dotenv/config";
import { getProductionPrismaClient, getTestPrismaClient } from "../src/lib/prisma";

async function checkCourseStatus() {
  const prodClient = getProductionPrismaClient();
  const testClient = getTestPrismaClient();

  const prodCourses = await prodClient.course.findMany({
    select: { id: true, title: true, slug: true, status: true, price: true, updatedAt: true },
  });

  const testCourses = await testClient.course.findMany({
    select: { id: true, title: true, slug: true, status: true, price: true, updatedAt: true },
  });

  console.log("🟢 PRODUCTION DB COURSES:");
  console.table(prodCourses);

  console.log("\n🟡 TEST DB COURSES:");
  console.table(testCourses);

  await prodClient.$disconnect();
  await testClient.$disconnect();
}

checkCourseStatus().catch(console.error);
