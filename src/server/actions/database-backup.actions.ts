"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, requireSuperAdminAction } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

/**
 * Serializes Prisma records, ensuring BigInt and Decimal fields are JSON safe.
 */
function serializeForJson(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return data.toString();
  if (typeof data === "object" && typeof (data as any)?.toNumber === "function") {
    return (data as any).toString();
  }
  if (Array.isArray(data)) {
    return data.map((item) => serializeForJson(item));
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const res: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      res[key] = serializeForJson(data[key]);
    }
    return res;
  }
  return data;
}

/**
 * Exports the entire database including all student credentials, courses,
 * modules, lessons, orders, enrollments, settings, and wallets.
 */
export async function exportFullDatabaseBackupAction() {
  await requirePermission("settings.backups.manage");
  await ensureDatabaseSchemaSync();

  try {
    const [
      siteSettings,
      systemPaymentMethods,
      referralLevels,
      users,
      referralRelationships,
      referralClosures,
      courses,
      modules,
      lessons,
      mediaAssets,
      lessonMedia,
      quizzes,
      quizQuestions,
      quizOptions,
      homeworks,
      coupons,
      couponCourses,
      orders,
      orderItems,
      courseEnrollments,
      lessonProgress,
      couponRedemptions,
      wallets,
      walletTransactions,
      withdrawals,
      brokerClaims,
      testimonials,
      testimonialMedia,
      leads,
      supportInquiries,
      supportInquiryMessages,
      tradeJournals,
      psychologyLogs,
      tradeSettings,
    ] = await Promise.all([
      prisma.siteSetting.findMany().catch(() => []),
      prisma.systemPaymentMethod.findMany().catch(() => []),
      prisma.referralLevel.findMany().catch(() => []),
      prisma.user.findMany().catch(() => []),
      prisma.referralRelationship.findMany().catch(() => []),
      prisma.referralClosure.findMany().catch(() => []),
      prisma.course.findMany().catch(() => []),
      prisma.module.findMany().catch(() => []),
      prisma.lesson.findMany().catch(() => []),
      prisma.mediaAsset.findMany().catch(() => []),
      prisma.lessonMedia.findMany().catch(() => []),
      prisma.quiz.findMany().catch(() => []),
      prisma.quizQuestion.findMany().catch(() => []),
      prisma.quizOption.findMany().catch(() => []),
      prisma.homework.findMany().catch(() => []),
      prisma.coupon.findMany().catch(() => []),
      prisma.couponCourse.findMany().catch(() => []),
      prisma.order.findMany().catch(() => []),
      prisma.orderItem.findMany().catch(() => []),
      prisma.courseEnrollment.findMany().catch(() => []),
      prisma.lessonProgress.findMany().catch(() => []),
      prisma.couponRedemption.findMany().catch(() => []),
      prisma.wallet.findMany().catch(() => []),
      prisma.walletTransaction.findMany().catch(() => []),
      prisma.withdrawal.findMany().catch(() => []),
      prisma.brokerOfferClaim.findMany().catch(() => []),
      prisma.testimonial.findMany().catch(() => []),
      prisma.testimonialMedia.findMany().catch(() => []),
      prisma.lead.findMany().catch(() => []),
      prisma.supportInquiry.findMany().catch(() => []),
      prisma.supportInquiryMessage.findMany().catch(() => []),
      prisma.tradeJournal.findMany().catch(() => []),
      prisma.psychologyLog.findMany().catch(() => []),
      prisma.tradeSetting.findMany().catch(() => []),
    ]);

    const backupPayload = {
      version: "2.0.0",
      platform: "SuperWarrior30 LMS",
      type: "FULL_DATABASE_BACKUP",
      exportedAt: new Date().toISOString(),
      summary: {
        users: users.length,
        students: users.filter((u: any) => u.role === "STUDENT").length,
        admins: users.filter((u: any) => u.role === "SUPER_ADMIN" || u.role === "ADMIN").length,
        courses: courses.length,
        modules: modules.length,
        lessons: lessons.length,
        orders: orders.length,
        courseEnrollments: courseEnrollments.length,
        lessonProgress: lessonProgress.length,
        siteSettings: siteSettings.length,
        systemPaymentMethods: systemPaymentMethods.length,
        referralLevels: referralLevels.length,
        wallets: wallets.length,
        coupons: coupons.length,
        brokerClaims: brokerClaims.length,
        testimonials: testimonials.length,
        leads: leads.length,
      },
      data: {
        siteSettings: serializeForJson(siteSettings),
        systemPaymentMethods: serializeForJson(systemPaymentMethods),
        referralLevels: serializeForJson(referralLevels),
        users: serializeForJson(users),
        referralRelationships: serializeForJson(referralRelationships),
        referralClosures: serializeForJson(referralClosures),
        courses: serializeForJson(courses),
        modules: serializeForJson(modules),
        lessons: serializeForJson(lessons),
        mediaAssets: serializeForJson(mediaAssets),
        lessonMedia: serializeForJson(lessonMedia),
        quizzes: serializeForJson(quizzes),
        quizQuestions: serializeForJson(quizQuestions),
        quizOptions: serializeForJson(quizOptions),
        homeworks: serializeForJson(homeworks),
        coupons: serializeForJson(coupons),
        couponCourses: serializeForJson(couponCourses),
        orders: serializeForJson(orders),
        orderItems: serializeForJson(orderItems),
        courseEnrollments: serializeForJson(courseEnrollments),
        lessonProgress: serializeForJson(lessonProgress),
        couponRedemptions: serializeForJson(couponRedemptions),
        wallets: serializeForJson(wallets),
        walletTransactions: serializeForJson(walletTransactions),
        withdrawals: serializeForJson(withdrawals),
        brokerClaims: serializeForJson(brokerClaims),
        testimonials: serializeForJson(testimonials),
        testimonialMedia: serializeForJson(testimonialMedia),
        leads: serializeForJson(leads),
        supportInquiries: serializeForJson(supportInquiries),
        supportInquiryMessages: serializeForJson(supportInquiryMessages),
        tradeJournals: serializeForJson(tradeJournals),
        psychologyLogs: serializeForJson(psychologyLogs),
        tradeSettings: serializeForJson(tradeSettings),
      },
    };

    return {
      success: true,
      backup: backupPayload,
    };
  } catch (error: any) {
    console.error("Database backup export error:", error);
    return {
      success: false,
      error: error?.message || "Failed to generate database export.",
    };
  }
}

/**
 * Normalizes backup data whether it came from full JSON or multi-sheet Excel
 */
function normalizeBackupPayload(raw: any): any {
  if (!raw) return {};
  const d = raw.data || raw;
  const res: Record<string, any> = { ...d };

  if (!res.users && Array.isArray(d.Users)) {
    res.users = d.Users.map((u: any) => ({
      id: u.ID || u.id,
      name: u.Name || u.name,
      email: u.Email || u.email,
      phone: u.Phone || u.phone,
      role: u.Role || u.role,
      adminRole: u.AdminRole || u.adminRole,
      status: u.Status || u.status,
      referralCode: u.ReferralCode || u.referralCode,
      passwordHash: u.PasswordHash || u.passwordHash,
      createdAt: u.CreatedAt || u.createdAt,
    }));
  }

  if (!res.courses && Array.isArray(d.Courses)) {
    res.courses = d.Courses.map((c: any) => ({
      id: c.ID || c.id,
      title: c.Title || c.title,
      slug: c.Slug || c.slug,
      price: c.Price || c.price,
      compareAtPrice: c.CompareAtPrice || c.compareAtPrice,
      status: c.Status || c.status,
      isFeatured: c.Featured === "YES" || c.isFeatured === true,
      difficulty: c.Difficulty || c.difficulty,
      totalDuration: c.DurationSec || c.totalDuration,
      createdAt: c.CreatedAt || c.createdAt,
    }));
  }

  if (Array.isArray(d.Curriculum)) {
    if (!res.modules) {
      res.modules = d.Curriculum
        .filter((item: any) => item.Type === "MODULE")
        .map((m: any) => ({
          id: m.ID || m.id,
          courseId: m.CourseID || m.courseId,
          title: m.Title || m.title,
          position: Number(m.Position || m.position || 1),
          isPublished: true,
        }));
    }
    if (!res.lessons) {
      res.lessons = d.Curriculum
        .filter((item: any) => item.Type === "LESSON")
        .map((l: any) => ({
          id: l.ID || l.id,
          moduleId: l.ModuleID || l.moduleId,
          title: l.Title || l.title,
          slug: l.Slug || l.slug,
          position: Number(l.Position || l.position || 1),
          contentType: l.ContentType || l.contentType || "VIDEO",
          durationSec: Number(l.DurationSec || l.durationSec || 0),
          videoKey: l.VideoKey || l.videoKey,
          bunnyVideoId: l.BunnyVideoId || l.bunnyVideoId,
          isPublished: true,
        }));
    }
  }

  if (!res.orders && Array.isArray(d.Orders)) {
    res.orders = d.Orders.map((o: any) => ({
      id: o.ID || o.id,
      orderNumber: o.OrderNumber || o.orderNumber,
      userId: o.UserID || o.userId,
      status: o.Status || o.status,
      currency: o.Currency || o.currency,
      subtotalAmount: o.Subtotal || o.subtotalAmount,
      discountAmount: o.Discount || o.discountAmount,
      totalAmount: o.Total || o.totalAmount,
      paymentProvider: o.PaymentProvider || o.paymentProvider,
      gatewayOrderId: o.GatewayOrderId || o.gatewayOrderId,
      paymentId: o.PaymentID || o.paymentId,
      manualPaymentRef: o.ManualRef || o.manualPaymentRef,
      paidAt: o.PaidAt || o.paidAt,
      createdAt: o.CreatedAt || o.createdAt,
    }));
  }

  if (!res.courseEnrollments && Array.isArray(d.Enrollments)) {
    res.courseEnrollments = d.Enrollments.map((e: any) => ({
      id: e.ID || e.id,
      userId: e.UserID || e.userId,
      courseId: e.CourseID || e.courseId,
      orderId: e.OrderID || e.orderId,
      status: e.Status || e.status,
      progressPercentage: e.ProgressPercent || e.progressPercentage,
      enrolledAt: e.EnrolledAt || e.enrolledAt,
      completedAt: e.CompletedAt || e.completedAt,
    }));
  }

  if (!res.wallets && Array.isArray(d.Wallets)) {
    res.wallets = d.Wallets.map((w: any) => ({
      id: w.ID || w.id,
      userId: w.UserID || w.userId,
      availableBalance: w.AvailableBalance || w.availableBalance,
      pendingBalance: w.PendingBalance || w.pendingBalance,
      totalEarned: w.TotalEarned || w.totalEarned,
      totalWithdrawn: w.TotalWithdrawn || w.totalWithdrawn,
    }));
  }

  if (!res.siteSettings && Array.isArray(d.Settings)) {
    res.siteSettings = d.Settings.map((s: any) => ({
      id: s.ID || s.id,
      key: s.Key || s.key,
      value: s.Value || s.value,
      type: s.Type || s.type || "string",
    }));
  }

  return res;
}

/**
 * Restores a full backup into the database with 1-click.
 * Supports both "clean" (wipe conflicting records) and "safe" (upsert/merge) modes.
 * Admin account is always safely preserved.
 */
export async function restoreFullDatabaseBackupAction({
  backupData,
  options = {
    mode: "safe",
    preserveCurrentAdmin: true,
    includeTestData: true,
  },
}: {
  backupData: any;
  options?: {
    mode?: "clean" | "safe";
    preserveCurrentAdmin?: boolean;
    includeTestData?: boolean;
  };
}) {
  const currentAdmin = await requireSuperAdminAction();

  if (!backupData || (!backupData.data && !backupData.Users && !backupData.users)) {
    return {
      success: false,
      error: "Invalid backup file: Missing database payload.",
    };
  }

  // 1. First trigger schema verification to make sure all tables exist on the target database (e.g. new Neon DB)
  await ensureDatabaseSchemaSync(true);

  const d = normalizeBackupPayload(backupData);

  // If Clean & Restore mode is chosen, wipe dependent tables safely while preserving the Super Admin
  if (options.mode === "clean") {
    try {
      await prisma.lessonProgress.deleteMany({});
      await prisma.courseEnrollment.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.walletTransaction.deleteMany({});
      await prisma.withdrawal.deleteMany({});
      await prisma.brokerOfferClaim.deleteMany({});
      await prisma.lessonMedia.deleteMany({});
      await prisma.lesson.deleteMany({});
      await prisma.module.deleteMany({});
      await prisma.course.deleteMany({});
      await prisma.referralRelationship.deleteMany({});
      await prisma.referralClosure.deleteMany({});
      // Clear non-admin users
      await prisma.user.deleteMany({
        where: {
          id: { not: currentAdmin.id },
          email: { not: currentAdmin.email },
        },
      });
    } catch (cleanErr) {
      console.warn("[Clean & Restore] Non-fatal table cleanup warning:", cleanErr);
    }
  }

  const counts: Record<string, number> = {
    siteSettings: 0,
    systemPaymentMethods: 0,
    referralLevels: 0,
    users: 0,
    courses: 0,
    modules: 0,
    lessons: 0,
    quizzes: 0,
    homeworks: 0,
    coupons: 0,
    orders: 0,
    orderItems: 0,
    courseEnrollments: 0,
    lessonProgress: 0,
    wallets: 0,
    walletTransactions: 0,
    withdrawals: 0,
    brokerClaims: 0,
    testimonials: 0,
    leads: 0,
  };

  try {
    // Step 1: SiteSettings (No foreign key dependencies)
    if (Array.isArray(d.siteSettings)) {
      for (const s of d.siteSettings) {
        if (!s.key) continue;
        try {
          await prisma.siteSetting.upsert({
            where: { key: s.key },
            update: {
              value: String(s.value ?? ""),
              type: s.type || "string",
            },
            create: {
              id: s.id,
              key: s.key,
              value: String(s.value ?? ""),
              type: s.type || "string",
            },
          });
          counts.siteSettings++;
        } catch (err) {
          console.warn(`[Restore] Failed setting ${s.key}:`, err);
        }
      }
    }

    // Step 2: SystemPaymentMethods
    if (Array.isArray(d.systemPaymentMethods)) {
      for (const spm of d.systemPaymentMethods) {
        if (!spm.id) continue;
        try {
          await prisma.systemPaymentMethod.upsert({
            where: { id: spm.id },
            update: {
              type: spm.type,
              title: spm.title,
              details: spm.details,
              instructions: spm.instructions,
              isActive: spm.isActive ?? true,
            },
            create: {
              id: spm.id,
              type: spm.type,
              title: spm.title,
              details: spm.details,
              instructions: spm.instructions,
              isActive: spm.isActive ?? true,
            },
          });
          counts.systemPaymentMethods++;
        } catch (err) {
          console.warn(`[Restore] Failed payment method ${spm.id}:`, err);
        }
      }
    }

    // Step 3: ReferralLevels
    if (Array.isArray(d.referralLevels)) {
      for (const rl of d.referralLevels) {
        if (rl.level === undefined) continue;
        try {
          await prisma.referralLevel.upsert({
            where: { level: Number(rl.level) },
            update: {
              commissionRate: rl.commissionRate,
              commissionType: rl.commissionType || "PERCENTAGE",
              commissionValue: rl.commissionValue || 0,
              isEnabled: rl.isEnabled ?? true,
              requiresDirectReferralQualification: Boolean(rl.requiresDirectReferralQualification),
              directReferralsRequired: rl.directReferralsRequired || 0,
            },
            create: {
              id: rl.id,
              level: Number(rl.level),
              commissionRate: rl.commissionRate,
              commissionType: rl.commissionType || "PERCENTAGE",
              commissionValue: rl.commissionValue || 0,
              isEnabled: rl.isEnabled ?? true,
              requiresDirectReferralQualification: Boolean(rl.requiresDirectReferralQualification),
              directReferralsRequired: rl.directReferralsRequired || 0,
            },
          });
          counts.referralLevels++;
        } catch (err) {
          console.warn(`[Restore] Failed referral level ${rl.level}:`, err);
        }
      }
    }

    // Step 4: Users (Students, Staff, Admins)
    if (Array.isArray(d.users)) {
      for (const u of d.users) {
        if (!u.email) continue;

        // SAFEGUARD: Do not alter current active admin password or demote their role
        const isCurrentAdmin =
          options.preserveCurrentAdmin &&
          (u.email.toLowerCase() === currentAdmin.email.toLowerCase() || u.id === currentAdmin.id);

        if (isCurrentAdmin) {
          counts.users++;
          continue;
        }

        try {
          const userPayload = {
            name: u.name || null,
            phone: u.phone || null,
            username: u.username || null,
            avatarUrl: u.avatarUrl || null,
            role: u.role || "STUDENT",
            adminRole: u.adminRole || null,
            customPermissions: u.customPermissions || undefined,
            status: u.status || "ACTIVE",
            passwordHash: u.passwordHash,
            referralCode: u.referralCode || `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            tokenVersion: u.tokenVersion ?? 1,
            isTestData: Boolean(u.isTestData),
          };

          // Check for collision on referralCode with existing users
          const existingByCode = await prisma.user.findUnique({
            where: { referralCode: userPayload.referralCode },
            select: { id: true, email: true },
          });

          if (existingByCode && existingByCode.email.toLowerCase() !== u.email.toLowerCase()) {
            userPayload.referralCode = `${userPayload.referralCode}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          }

          await prisma.user.upsert({
            where: { email: u.email.toLowerCase().trim() },
            update: userPayload,
            create: {
              id: u.id,
              email: u.email.toLowerCase().trim(),
              ...userPayload,
              createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
            },
          });

          counts.users++;
        } catch (err) {
          console.warn(`[Restore] Failed user ${u.email}:`, err);
        }
      }
    }

    // Step 4.5: Pass 2 - Two-pass referral resolution (Re-link network trees without foreign key violations)
    if (Array.isArray(d.referralRelationships)) {
      for (const rr of d.referralRelationships) {
        if (!rr.referrerId || !rr.referredId) continue;
        try {
          const [refExists, targetExists] = await Promise.all([
            prisma.user.findUnique({ where: { id: rr.referrerId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: rr.referredId }, select: { id: true } }),
          ]);
          if (refExists && targetExists) {
            await prisma.referralRelationship.upsert({
              where: { referredId: rr.referredId },
              update: { referrerId: rr.referrerId },
              create: {
                id: rr.id,
                referrerId: rr.referrerId,
                referredId: rr.referredId,
                isTestData: Boolean(rr.isTestData),
              },
            });
          }
        } catch (err) {
          console.warn("[Restore] Referral relationship link warning:", err);
        }
      }
    }

    if (Array.isArray(d.referralClosures)) {
      for (const rc of d.referralClosures) {
        if (!rc.ancestorId || !rc.descendantId) continue;
        try {
          const [ancestorExists, descExists] = await Promise.all([
            prisma.user.findUnique({ where: { id: rc.ancestorId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: rc.descendantId }, select: { id: true } }),
          ]);
          if (ancestorExists && descExists) {
            await prisma.referralClosure.upsert({
              where: {
                ancestorId_descendantId: {
                  ancestorId: rc.ancestorId,
                  descendantId: rc.descendantId,
                },
              },
              update: { depth: Number(rc.depth || 1) },
              create: {
                id: rc.id,
                ancestorId: rc.ancestorId,
                descendantId: rc.descendantId,
                depth: Number(rc.depth || 1),
                isTestData: Boolean(rc.isTestData),
              },
            });
          }
        } catch (err) {
          console.warn("[Restore] Referral closure link warning:", err);
        }
      }
    }

    // Step 5: Courses
    if (Array.isArray(d.courses)) {
      for (const c of d.courses) {
        if (!c.id || !c.slug) continue;
        try {
          const coursePayload = {
            title: c.title,
            slug: c.slug,
            shortDescription: c.shortDescription || null,
            fullDescription: c.fullDescription || null,
            thumbnailKey: c.thumbnailKey || null,
            thumbnailCdnUrl: c.thumbnailCdnUrl || null,
            price: c.price,
            compareAtPrice: c.compareAtPrice || null,
            status: c.status || "PUBLISHED",
            isFeatured: Boolean(c.isFeatured),
            isReferralEligible: c.isReferralEligible ?? true,
            difficulty: c.difficulty || "BEGINNER",
            totalDuration: c.totalDuration || 0,
            isTestData: Boolean(c.isTestData),
          };

          await prisma.course.upsert({
            where: { id: c.id },
            update: coursePayload,
            create: {
              id: c.id,
              ...coursePayload,
              createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
            },
          });
          counts.courses++;
        } catch (err) {
          console.warn(`[Restore] Failed course ${c.id}:`, err);
        }
      }
    }

    // Step 6: Modules
    if (Array.isArray(d.modules)) {
      for (const m of d.modules) {
        if (!m.id || !m.courseId) continue;
        try {
          await prisma.module.upsert({
            where: { id: m.id },
            update: {
              courseId: m.courseId,
              title: m.title,
              position: m.position,
              isPublished: m.isPublished ?? true,
            },
            create: {
              id: m.id,
              courseId: m.courseId,
              title: m.title,
              position: m.position,
              isPublished: m.isPublished ?? true,
              createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
            },
          });
          counts.modules++;
        } catch (err) {
          console.warn(`[Restore] Failed module ${m.id}:`, err);
        }
      }
    }

    // Step 7: Lessons
    if (Array.isArray(d.lessons)) {
      for (const l of d.lessons) {
        if (!l.id || !l.moduleId) continue;
        try {
          await prisma.lesson.upsert({
            where: { id: l.id },
            update: {
              moduleId: l.moduleId,
              title: l.title,
              slug: l.slug,
              position: l.position,
              contentType: l.contentType || "VIDEO",
              videoKey: l.videoKey || null,
              pdfKey: l.pdfKey || null,
              bunnyVideoId: l.bunnyVideoId || null,
              bunnyCdnUrl: l.bunnyCdnUrl || null,
              mediaProvider: l.mediaProvider || "BUNNY",
              textContent: l.textContent || null,
              durationSec: l.durationSec || 0,
              isFreePreview: Boolean(l.isFreePreview),
              isPublished: l.isPublished ?? true,
            },
            create: {
              id: l.id,
              moduleId: l.moduleId,
              title: l.title,
              slug: l.slug,
              position: l.position,
              contentType: l.contentType || "VIDEO",
              videoKey: l.videoKey || null,
              pdfKey: l.pdfKey || null,
              bunnyVideoId: l.bunnyVideoId || null,
              bunnyCdnUrl: l.bunnyCdnUrl || null,
              mediaProvider: l.mediaProvider || "BUNNY",
              textContent: l.textContent || null,
              durationSec: l.durationSec || 0,
              isFreePreview: Boolean(l.isFreePreview),
              isPublished: l.isPublished ?? true,
              createdAt: l.createdAt ? new Date(l.createdAt) : undefined,
            },
          });
          counts.lessons++;
        } catch (err) {
          console.warn(`[Restore] Failed lesson ${l.id}:`, err);
        }
      }
    }

    // Step 8: Quizzes & Questions
    if (Array.isArray(d.quizzes)) {
      for (const q of d.quizzes) {
        if (!q.id || !q.lessonId) continue;
        try {
          await prisma.quiz.upsert({
            where: { id: q.id },
            update: {
              lessonId: q.lessonId,
              title: q.title,
              description: q.description || null,
              passingPercentage: q.passingPercentage || 70,
              timeLimitMinutes: q.timeLimitMinutes || null,
              maxAttempts: q.maxAttempts || 3,
              isPublished: q.isPublished ?? true,
            },
            create: {
              id: q.id,
              lessonId: q.lessonId,
              title: q.title,
              description: q.description || null,
              passingPercentage: q.passingPercentage || 70,
              timeLimitMinutes: q.timeLimitMinutes || null,
              maxAttempts: q.maxAttempts || 3,
              isPublished: q.isPublished ?? true,
            },
          });
          counts.quizzes++;
        } catch (err) {
          console.warn(`[Restore] Failed quiz ${q.id}:`, err);
        }
      }
    }

    // Step 9: Coupons
    if (Array.isArray(d.coupons)) {
      for (const cp of d.coupons) {
        if (!cp.code) continue;
        try {
          await prisma.coupon.upsert({
            where: { code: cp.code },
            update: {
              discountType: cp.discountType,
              discountValue: cp.discountValue,
              minOrderAmount: cp.minOrderAmount || 0,
              maxDiscountAmount: cp.maxDiscountAmount || null,
              startDate: cp.startDate ? new Date(cp.startDate) : new Date(),
              endDate: cp.endDate ? new Date(cp.endDate) : new Date(Date.now() + 365 * 86400000),
              usageLimit: cp.usageLimit || null,
              perUserLimit: cp.perUserLimit || 1,
              usageCount: cp.usageCount || 0,
              isActive: cp.isActive ?? true,
              showInCheckout: cp.showInCheckout ?? true,
            },
            create: {
              id: cp.id,
              code: cp.code,
              discountType: cp.discountType,
              discountValue: cp.discountValue,
              minOrderAmount: cp.minOrderAmount || 0,
              maxDiscountAmount: cp.maxDiscountAmount || null,
              startDate: cp.startDate ? new Date(cp.startDate) : new Date(),
              endDate: cp.endDate ? new Date(cp.endDate) : new Date(Date.now() + 365 * 86400000),
              usageLimit: cp.usageLimit || null,
              perUserLimit: cp.perUserLimit || 1,
              usageCount: cp.usageCount || 0,
              isActive: cp.isActive ?? true,
              showInCheckout: cp.showInCheckout ?? true,
            },
          });
          counts.coupons++;
        } catch (err) {
          console.warn(`[Restore] Failed coupon ${cp.code}:`, err);
        }
      }
    }

    // Step 10: Orders & Items
    if (Array.isArray(d.orders)) {
      for (const o of d.orders) {
        if (!o.id || !o.orderNumber || !o.userId) continue;
        try {
          await prisma.order.upsert({
            where: { id: o.id },
            update: {
              orderNumber: o.orderNumber,
              userId: o.userId,
              couponId: o.couponId || null,
              status: o.status || "PAID",
              currency: o.currency || "INR",
              subtotalAmount: o.subtotalAmount,
              discountAmount: o.discountAmount || 0,
              taxAmount: o.taxAmount || 0,
              totalAmount: o.totalAmount,
              paymentProvider: o.paymentProvider || null,
              gatewayOrderId: o.gatewayOrderId || null,
              paymentId: o.paymentId || null,
              manualPaymentRef: o.manualPaymentRef || null,
              manualPaymentProof: o.manualPaymentProof || undefined,
              approvedAt: o.approvedAt ? new Date(o.approvedAt) : null,
              paidAt: o.paidAt ? new Date(o.paidAt) : null,
              metadata: o.metadata || undefined,
              isTestData: Boolean(o.isTestData),
            },
            create: {
              id: o.id,
              orderNumber: o.orderNumber,
              userId: o.userId,
              couponId: o.couponId || null,
              status: o.status || "PAID",
              currency: o.currency || "INR",
              subtotalAmount: o.subtotalAmount,
              discountAmount: o.discountAmount || 0,
              taxAmount: o.taxAmount || 0,
              totalAmount: o.totalAmount,
              paymentProvider: o.paymentProvider || null,
              gatewayOrderId: o.gatewayOrderId || null,
              paymentId: o.paymentId || null,
              manualPaymentRef: o.manualPaymentRef || null,
              manualPaymentProof: o.manualPaymentProof || undefined,
              approvedAt: o.approvedAt ? new Date(o.approvedAt) : null,
              paidAt: o.paidAt ? new Date(o.paidAt) : null,
              metadata: o.metadata || undefined,
              isTestData: Boolean(o.isTestData),
              createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
            },
          });
          counts.orders++;
        } catch (err) {
          console.warn(`[Restore] Failed order ${o.id}:`, err);
        }
      }
    }

    if (Array.isArray(d.orderItems)) {
      for (const item of d.orderItems) {
        if (!item.id || !item.orderId) continue;
        try {
          await prisma.orderItem.upsert({
            where: { id: item.id },
            update: {
              orderId: item.orderId,
              courseId: item.courseId || null,
              itemTitle: item.itemTitle,
              unitPrice: item.unitPrice,
              quantity: item.quantity || 1,
              totalPrice: item.totalPrice,
            },
            create: {
              id: item.id,
              orderId: item.orderId,
              courseId: item.courseId || null,
              itemTitle: item.itemTitle,
              unitPrice: item.unitPrice,
              quantity: item.quantity || 1,
              totalPrice: item.totalPrice,
              createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            },
          });
          counts.orderItems++;
        } catch (err) {
          console.warn(`[Restore] Failed order item ${item.id}:`, err);
        }
      }
    }

    // Step 11: Course Enrollments
    if (Array.isArray(d.courseEnrollments)) {
      for (const ce of d.courseEnrollments) {
        if (!ce.userId || !ce.courseId) continue;
        try {
          await prisma.courseEnrollment.upsert({
            where: {
              userId_courseId: {
                userId: ce.userId,
                courseId: ce.courseId,
              },
            },
            update: {
              orderId: ce.orderId || null,
              status: ce.status || "ACTIVE",
              progressPercentage: ce.progressPercentage || 0,
              isTestData: Boolean(ce.isTestData),
              completedAt: ce.completedAt ? new Date(ce.completedAt) : null,
            },
            create: {
              id: ce.id,
              userId: ce.userId,
              courseId: ce.courseId,
              orderId: ce.orderId || null,
              status: ce.status || "ACTIVE",
              progressPercentage: ce.progressPercentage || 0,
              isTestData: Boolean(ce.isTestData),
              enrolledAt: ce.enrolledAt ? new Date(ce.enrolledAt) : undefined,
              completedAt: ce.completedAt ? new Date(ce.completedAt) : null,
            },
          });
          counts.courseEnrollments++;
        } catch (err) {
          console.warn(`[Restore] Failed enrollment for ${ce.userId} on ${ce.courseId}:`, err);
        }
      }
    }

    // Step 12: Lesson Progress
    if (Array.isArray(d.lessonProgress)) {
      for (const lp of d.lessonProgress) {
        if (!lp.userId || !lp.lessonId) continue;
        try {
          await prisma.lessonProgress.upsert({
            where: {
              userId_lessonId: {
                userId: lp.userId,
                lessonId: lp.lessonId,
              },
            },
            update: {
              status: lp.status || "NOT_STARTED",
              watchTimeSeconds: lp.watchTimeSeconds || 0,
              lastPositionSeconds: lp.lastPositionSeconds || 0,
              completedAt: lp.completedAt ? new Date(lp.completedAt) : null,
            },
            create: {
              id: lp.id,
              userId: lp.userId,
              lessonId: lp.lessonId,
              status: lp.status || "NOT_STARTED",
              watchTimeSeconds: lp.watchTimeSeconds || 0,
              lastPositionSeconds: lp.lastPositionSeconds || 0,
              completedAt: lp.completedAt ? new Date(lp.completedAt) : null,
            },
          });
          counts.lessonProgress++;
        } catch (err) {
          console.warn(`[Restore] Failed lesson progress:`, err);
        }
      }
    }

    // Step 13: Wallets & Transactions
    if (Array.isArray(d.wallets)) {
      for (const w of d.wallets) {
        if (!w.userId) continue;
        try {
          await prisma.wallet.upsert({
            where: { userId: w.userId },
            update: {
              availableBalance: w.availableBalance || 0,
              pendingBalance: w.pendingBalance || 0,
              totalEarned: w.totalEarned || 0,
              totalWithdrawn: w.totalWithdrawn || 0,
              version: w.version ?? 1,
            },
            create: {
              id: w.id,
              userId: w.userId,
              availableBalance: w.availableBalance || 0,
              pendingBalance: w.pendingBalance || 0,
              totalEarned: w.totalEarned || 0,
              totalWithdrawn: w.totalWithdrawn || 0,
              version: w.version ?? 1,
            },
          });
          counts.wallets++;
        } catch (err) {
          console.warn(`[Restore] Failed wallet for ${w.userId}:`, err);
        }
      }
    }

    // Step 14: Broker Claims & Testimonials
    if (Array.isArray(d.brokerClaims)) {
      for (const bc of d.brokerClaims) {
        if (!bc.id || !bc.userId || !bc.orderId) continue;
        try {
          await prisma.brokerOfferClaim.upsert({
            where: { id: bc.id },
            update: {
              userId: bc.userId,
              orderId: bc.orderId,
              brokerName: bc.brokerName || "Partner Broker",
              brokerMemberId: bc.brokerMemberId || bc.tradingAccountId || "N/A",
              coursePrice: bc.coursePrice || 0,
              calculatedAmount: bc.calculatedAmount || 0,
              verificationStatus: bc.verificationStatus || "PENDING",
              adminNotes: bc.adminNotes || bc.notes || null,
            },
            create: {
              id: bc.id,
              userId: bc.userId,
              orderId: bc.orderId,
              brokerName: bc.brokerName || "Partner Broker",
              brokerMemberId: bc.brokerMemberId || bc.tradingAccountId || "N/A",
              coursePrice: bc.coursePrice || 0,
              calculatedAmount: bc.calculatedAmount || 0,
              verificationStatus: bc.verificationStatus || "PENDING",
              adminNotes: bc.adminNotes || bc.notes || null,
              createdAt: bc.createdAt ? new Date(bc.createdAt) : undefined,
            },
          });
          counts.brokerClaims++;
        } catch (err) {
          console.warn(`[Restore] Failed broker claim ${bc.id}:`, err);
        }
      }
    }

    if (Array.isArray(d.testimonials)) {
      for (const t of d.testimonials) {
        if (!t.id || !t.studentName) continue;
        try {
          await prisma.testimonial.upsert({
            where: { id: t.id },
            update: {
              userId: t.userId || null,
              studentName: t.studentName,
              content: t.content,
              rating: t.rating || 5,
              status: t.status || "APPROVED",
              isApproved: t.isApproved ?? true,
              isVisible: t.isVisible ?? true,
            },
            create: {
              id: t.id,
              userId: t.userId || null,
              studentName: t.studentName,
              content: t.content,
              rating: t.rating || 5,
              status: t.status || "APPROVED",
              isApproved: t.isApproved ?? true,
              isVisible: t.isVisible ?? true,
              createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
            },
          });
          counts.testimonials++;
        } catch (err) {
          console.warn(`[Restore] Failed testimonial ${t.id}:`, err);
        }
      }
    }

    // Step 15: Leads
    if (Array.isArray(d.leads)) {
      for (const ld of d.leads) {
        if (!ld.id || !ld.name) continue;
        try {
          await prisma.lead.upsert({
            where: { id: ld.id },
            update: {
              name: ld.name,
              email: ld.email || null,
              phone: ld.phone || null,
              whatsapp: ld.whatsapp || null,
              stage: ld.stage || "NEW",
            },
            create: {
              id: ld.id,
              name: ld.name,
              email: ld.email || null,
              phone: ld.phone || null,
              whatsapp: ld.whatsapp || null,
              stage: ld.stage || "NEW",
              createdAt: ld.createdAt ? new Date(ld.createdAt) : undefined,
            },
          });
          counts.leads++;
        } catch (err) {
          console.warn(`[Restore] Failed lead ${ld.id}:`, err);
        }
      }
    }

    // Step 16: Support Inquiries
    if (Array.isArray(d.supportInquiries)) {
      for (const inq of d.supportInquiries) {
        if (!inq.id || !inq.email) continue;
        try {
          await prisma.supportInquiry.upsert({
            where: { id: inq.id },
            update: {
              name: inq.name,
              email: inq.email,
              phone: inq.phone || null,
              subject: inq.subject || "General Inquiry",
              message: inq.message || "",
              category: inq.category || "GENERAL",
              status: inq.status || "OPEN",
              orderNumber: inq.orderNumber || null,
            },
            create: {
              id: inq.id,
              name: inq.name,
              email: inq.email,
              phone: inq.phone || null,
              subject: inq.subject || "General Inquiry",
              message: inq.message || "",
              category: inq.category || "GENERAL",
              status: inq.status || "OPEN",
              orderNumber: inq.orderNumber || null,
              createdAt: inq.createdAt ? new Date(inq.createdAt) : undefined,
            },
          });
        } catch (err) {
          console.warn(`[Restore] Failed support inquiry ${inq.id}:`, err);
        }
      }
    }

    // Step 17: Trade Journals & Psychology Logs
    if (Array.isArray(d.tradeJournals)) {
      for (const tj of d.tradeJournals) {
        if (!tj.id || !tj.userId) continue;
        try {
          await prisma.tradeJournal.upsert({
            where: { id: tj.id },
            update: {
              instrument: tj.instrument || tj.symbol || "XAUUSD",
              market: tj.market || "FOREX",
              direction: tj.direction || tj.tradeType || "BUY",
              entryPrice: Number(tj.entryPrice || 0),
              exitPrice: tj.exitPrice !== null && tj.exitPrice !== undefined ? Number(tj.exitPrice) : null,
              stopLoss: Number(tj.stopLoss || 0),
              takeProfit: Number(tj.takeProfit || 0),
              pnl: tj.pnl !== null && tj.pnl !== undefined ? Number(tj.pnl) : null,
              status: tj.status || "OPEN",
              notes: tj.notes || null,
            },
            create: {
              id: tj.id,
              userId: tj.userId,
              instrument: tj.instrument || tj.symbol || "XAUUSD",
              market: tj.market || "FOREX",
              direction: tj.direction || tj.tradeType || "BUY",
              entryPrice: Number(tj.entryPrice || 0),
              exitPrice: tj.exitPrice !== null && tj.exitPrice !== undefined ? Number(tj.exitPrice) : null,
              stopLoss: Number(tj.stopLoss || 0),
              takeProfit: Number(tj.takeProfit || 0),
              pnl: tj.pnl !== null && tj.pnl !== undefined ? Number(tj.pnl) : null,
              status: tj.status || "OPEN",
              notes: tj.notes || null,
              createdAt: tj.createdAt ? new Date(tj.createdAt) : undefined,
            },
          });
        } catch (err) {
          console.warn(`[Restore] Failed trade journal ${tj.id}:`, err);
        }
      }
    }

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        actorId: currentAdmin.id,
        actorEmail: currentAdmin.email,
        actorRole: currentAdmin.role,
        action: "DATABASE_RESTORE_EXECUTED",
        entityType: "System",
        entityId: "postgres",
        newValues: {
          restoredCounts: counts,
          backupExportDate: backupData.exportedAt,
          restoredAt: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    return {
      success: true,
      message: `Database restore completed successfully! Restored ${counts.users} users, ${counts.courses} courses, ${counts.orders} orders, ${counts.courseEnrollments} enrollments, and ${counts.siteSettings} settings.`,
      restoredCounts: counts,
    };
  } catch (error: any) {
    console.error("Database restore execution error:", error);
    return {
      success: false,
      error: error?.message || "Critical failure while restoring database records.",
    };
  }
}
