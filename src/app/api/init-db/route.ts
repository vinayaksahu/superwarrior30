import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Create Super Admin User
    const adminPassword = await hashPassword("Admin@123");
    const admin = await prisma.user.upsert({
      where: { email: "admin@superwarrior30.com" },
      update: {},
      create: {
        email: "admin@superwarrior30.com",
        name: "Super Admin",
        passwordHash: adminPassword,
        role: "ADMIN",
        referralCode: "ADMIN001",
        tokenVersion: 1,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id },
    });

    // 2. Create Sample Students
    const studentPassword = await hashPassword("Student@123");
    const studentA = await prisma.user.upsert({
      where: { email: "student.a@example.com" },
      update: {},
      create: {
        email: "student.a@example.com",
        name: "Rahul Sharma",
        passwordHash: studentPassword,
        role: "STUDENT",
        referralCode: "RAHUL001",
        tokenVersion: 1,
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
        tokenVersion: 1,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: studentB.id },
      update: {},
      create: { userId: studentB.id },
    });

    // Referral chain
    await prisma.referralRelationship.upsert({
      where: { referredId: studentB.id },
      update: {},
      create: {
        referrerId: studentA.id,
        referredId: studentB.id,
      },
    });

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

    // 3. Create Referral Levels
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

    // 4. Create Sample Courses
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
        totalDuration: 18000,
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
        totalDuration: 28800,
      },
    ];

    for (const courseData of courses) {
      const course = await prisma.course.upsert({
        where: { slug: courseData.slug },
        update: {},
        create: courseData,
      });

      // Modules & Lessons
      const modules = [
        { title: "Introduction & Setup", position: 1 },
        { title: "Price Action & Strategies", position: 2 },
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

          await prisma.lesson.createMany({
            data: [
              {
                moduleId: mod.id,
                title: `${moduleData.title} - Video Lecture`,
                slug: `${moduleData.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-video`,
                position: 1,
                contentType: "VIDEO",
                durationSec: 600,
                isFreePreview: moduleData.position === 1,
                videoKey: "courses/sample-video.mp4",
              },
              {
                moduleId: mod.id,
                title: `${moduleData.title} - Study Guide`,
                slug: `${moduleData.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-doc`,
                position: 2,
                contentType: "PDF",
                durationSec: 0,
                isFreePreview: false,
                pdfKey: "courses/sample-doc.pdf",
              },
            ],
          });
        }
      }
    }

    // 5. Site Settings
    const settings = [
      { key: "site_name", value: "Super Warrior 30", type: "string" },
      { key: "site_tagline", value: "Institutional Price Action Mentorship", type: "string" },
      { key: "currency", value: "INR", type: "string" },
      { key: "referral_enabled", value: "true", type: "boolean" },
      { key: "min_withdrawal_amount", value: "500", type: "number" },
      { key: "instructor_name", value: "Vinayak Sahu", type: "string" },
    ];

    for (const s of settings) {
      await prisma.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized and seeded successfully!",
      credentials: {
        admin: { email: "admin@superwarrior30.com", password: "Admin@123" },
        studentA: { email: "student.a@example.com", password: "Student@123" },
        studentB: { email: "student.b@example.com", password: "Student@123" },
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Initialization failed";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
