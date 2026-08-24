import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...\n");

  // ---- 1. Create Admin User ----
  const adminPassword = await hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@superwarrior30.com" },
    update: {},
    create: {
      email: "admin@superwarrior30.com",
      name: "Super Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      referralCode: "ADMIN001",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create admin wallet
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // ---- 2. Create Sample Students ----
  const studentPassword = await hash("Student@123", 12);

  const studentA = await prisma.user.upsert({
    where: { email: "student.a@example.com" },
    update: {},
    create: {
      email: "student.a@example.com",
      name: "Rahul Sharma",
      passwordHash: studentPassword,
      role: "STUDENT",
      referralCode: "RAHUL001",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: studentA.id },
    update: {},
    create: { userId: studentA.id },
  });

  const studentB = await prisma.user.upsert({
    where: { email: "student.b@example.com" },
    update: {},
    create: {
      email: "student.b@example.com",
      name: "Priya Patel",
      passwordHash: studentPassword,
      role: "STUDENT",
      referralCode: "PRIYA001",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: studentB.id },
    update: {},
    create: { userId: studentB.id },
  });

  // Create referral: A referred B
  await prisma.referralRelationship.upsert({
    where: { referredId: studentB.id },
    update: {},
    create: {
      referrerId: studentA.id,
      referredId: studentB.id,
    },
  });

  // Closure table entry
  const existingClosure = await prisma.referralClosure.findUnique({
    where: {
      ancestorId_descendantId: {
        ancestorId: studentA.id,
        descendantId: studentB.id,
      },
    },
  });
  if (!existingClosure) {
    await prisma.referralClosure.create({
      data: {
        ancestorId: studentA.id,
        descendantId: studentB.id,
        depth: 1,
      },
    });
  }

  console.log(`✅ Students created: ${studentA.name}, ${studentB.name}`);
  console.log(`   Referral chain: ${studentA.name} → ${studentB.name}`);

  // ---- 3. Create Referral Levels ----
  const levels = [
    { level: 1, commissionRate: 0.10, isEnabled: true },
    { level: 2, commissionRate: 0.05, isEnabled: true },
    { level: 3, commissionRate: 0.03, isEnabled: true },
  ];

  for (const lvl of levels) {
    await prisma.referralLevel.upsert({
      where: { level: lvl.level },
      update: { commissionRate: lvl.commissionRate, isEnabled: lvl.isEnabled },
      create: lvl,
    });
  }
  console.log(`✅ Referral levels: ${levels.map((l) => `L${l.level}=${l.commissionRate * 100}%`).join(", ")}`);

  // ---- 4. Create Sample Courses ----
  const courses = [
    {
      title: "Trading Fundamentals Masterclass",
      slug: "trading-fundamentals-masterclass",
      shortDescription: "Master the basics of stock market trading with proven strategies and real-world examples.",
      fullDescription:
        "This comprehensive course covers everything you need to know to start your trading journey. From understanding market structures and reading charts to executing your first trade with confidence.",
      price: 4999,
      compareAtPrice: 9999,
      status: "PUBLISHED" as const,
      isFeatured: true,
      difficulty: "BEGINNER" as const,
      totalDuration: 18000, // 5 hours
    },
    {
      title: "Advanced Technical Analysis",
      slug: "advanced-technical-analysis",
      shortDescription: "Deep dive into chart patterns, indicators, and advanced trading setups.",
      fullDescription:
        "Take your trading to the next level with advanced chart patterns, Fibonacci levels, Elliott Wave theory, and custom indicator strategies used by professional traders.",
      price: 7999,
      compareAtPrice: 14999,
      status: "PUBLISHED" as const,
      isFeatured: true,
      difficulty: "ADVANCED" as const,
      totalDuration: 28800, // 8 hours
    },
    {
      title: "Options Trading Blueprint",
      slug: "options-trading-blueprint",
      shortDescription: "Learn options trading from scratch — strategies, Greeks, and risk management.",
      fullDescription:
        "Understand the world of options trading including calls, puts, spreads, straddles, and how to use the Greeks to manage risk and maximize returns.",
      price: 5999,
      compareAtPrice: 11999,
      status: "DRAFT" as const,
      isFeatured: false,
      difficulty: "INTERMEDIATE" as const,
      totalDuration: 21600, // 6 hours
    },
  ];

  for (const courseData of courses) {
    const course = await prisma.course.upsert({
      where: { slug: courseData.slug },
      update: {},
      create: courseData,
    });

    // Create sample modules and lessons for published courses
    if (courseData.status === "PUBLISHED") {
      const modules = [
        { title: "Introduction", position: 1 },
        { title: "Core Concepts", position: 2 },
        { title: "Practical Application", position: 3 },
      ];

      for (const moduleData of modules) {
        const existingModule = await prisma.module.findUnique({
          where: {
            courseId_position: {
              courseId: course.id,
              position: moduleData.position,
            },
          },
        });

        if (!existingModule) {
          const mod = await prisma.module.create({
            data: {
              courseId: course.id,
              ...moduleData,
            },
          });

          // Create sample lessons
          const lessons = [
            {
              title: `${moduleData.title} - Overview`,
              slug: `${moduleData.title.toLowerCase().replace(/\s/g, "-")}-overview`,
              position: 1,
              contentType: "VIDEO" as const,
              durationSec: 600,
              isFreePreview: moduleData.position === 1,
            },
            {
              title: `${moduleData.title} - Deep Dive`,
              slug: `${moduleData.title.toLowerCase().replace(/\s/g, "-")}-deep-dive`,
              position: 2,
              contentType: "VIDEO" as const,
              durationSec: 1200,
            },
            {
              title: `${moduleData.title} - Resources`,
              slug: `${moduleData.title.toLowerCase().replace(/\s/g, "-")}-resources`,
              position: 3,
              contentType: "PDF" as const,
              durationSec: 0,
            },
          ];

          for (const lessonData of lessons) {
            await prisma.lesson.create({
              data: {
                moduleId: mod.id,
                ...lessonData,
              },
            });
          }
        }
      }
    }

    console.log(`✅ Course: "${course.title}" (${courseData.status})`);
  }

  // ---- 5. Create Site Settings ----
  const settings = [
    { key: "site_name", value: "Super Warrior 30", type: "string" },
    { key: "site_tagline", value: "Premium Trading Education", type: "string" },
    { key: "currency", value: "INR", type: "string" },
    { key: "referral_enabled", value: "true", type: "boolean" },
    { key: "commission_holding_days", value: "0", type: "number" },
    { key: "min_withdrawal_amount", value: "500", type: "number" },
    {
      key: "instructor_name",
      value: "Trading Expert",
      type: "string",
    },
    {
      key: "instructor_bio",
      value: "Professional trader with 10+ years of experience in Indian equity and derivatives markets.",
      type: "string",
    },
    { key: "contact_email", value: "support@superwarrior30.com", type: "string" },
    { key: "contact_phone", value: "+91-9876543210", type: "string" },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`✅ Site settings: ${settings.length} entries`);

  console.log("\n🎉 Seed completed successfully!\n");
  console.log("Login credentials:");
  console.log("  Admin:   admin@superwarrior30.com / Admin@123");
  console.log("  Student: student.a@example.com / Student@123");
  console.log("  Student: student.b@example.com / Student@123");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
