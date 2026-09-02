"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/server/dal/auth";
import { couponSchema, applyCouponSchema, type CouponInput } from "@/lib/validations/coupon.schema";
import { PAGINATION } from "@/lib/constants";
import type { ActionState } from "@/types";
import { Prisma } from "@/generated/prisma";

// ==========================================
// 1. STUDENT COUPON VALIDATION & CALCULATION
// ==========================================

export async function validateAndCalculateCouponAction({
  code,
  courseId,
}: {
  code: string;
  courseId: string;
}) {
  const user = await requireAuth();

  // Rate limit: 20 coupon checks per minute per student
  const { checkRateLimit } = await import("@/lib/rate-limit");
  const rateLimit = await checkRateLimit({
    key: `coupon-check:${user.id}`,
    limit: 20,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    return { valid: false, message: "Too many coupon attempts. Please slow down." };
  }

  const cleanCode = code.trim().toUpperCase();

  // 1. Get authoritative course price from database
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, status: true, title: true },
  });

  if (!course || course.status !== "PUBLISHED") {
    return { valid: false, message: "Course not found or unavailable." };
  }

  const coursePrice = Number(course.price);

  // 2. Find coupon
  const coupon = await prisma.coupon.findUnique({
    where: { code: cleanCode },
    include: {
      courses: { select: { courseId: true } },
    },
  });

  if (!coupon) {
    // Check if it matches an affiliate referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: cleanCode },
      select: { id: true, name: true, referralCode: true, status: true },
    });

    if (referrer && referrer.status === "ACTIVE") {
      if (user.id === referrer.id) {
        return { valid: false, message: "You cannot use your own referral code for a discount." };
      }

      const { getBrokerSettings } = await import("@/lib/broker/config");
      const brokerSettings = await getBrokerSettings();

      if (brokerSettings.isReferralDiscountEnabled === false) {
        return { valid: false, message: "Referral discount is currently disabled." };
      }

      const referralPct = Number(brokerSettings.referralDiscountPercentage) || 10;
      const discountAmount = Number(((coursePrice * referralPct) / 100).toFixed(2));
      const finalPrice = Math.max(0, Number((coursePrice - discountAmount).toFixed(2)));

      return {
        valid: true,
        type: "REFERRAL",
        couponId: null,
        referrerId: referrer.id,
        referrerName: referrer.name || "Affiliate Partner",
        code: referrer.referralCode,
        discountType: "PERCENTAGE",
        discountValue: referralPct,
        discountAmount,
        originalPrice: coursePrice,
        finalPrice,
        message: `Referral code "${referrer.referralCode}" applied! You unlocked ${referralPct}% instant discount (₹${discountAmount}).`,
      };
    }

    return { valid: false, message: "Invalid coupon or referral code." };
  }

  // 3. Check active state
  if (!coupon.isActive) {
    return { valid: false, message: "This coupon is currently inactive." };
  }

  // 4. Check date validity
  const now = new Date();
  if (now < new Date(coupon.startDate)) {
    return { valid: false, message: "This coupon promotion has not started yet." };
  }
  if (now > new Date(coupon.endDate)) {
    return { valid: false, message: "This coupon has expired." };
  }

  // 5. Check global usage limit
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: "This coupon has reached its maximum total redemptions." };
  }

  // 6. Check per-user redemption limit
  const userRedemptionsCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId: user.id,
    },
  });

  if (userRedemptionsCount >= coupon.perUserLimit) {
    return {
      valid: false,
      message: `You have already used this coupon the maximum allowed times (${coupon.perUserLimit}).`,
    };
  }

  // 7. Check course scope applicability
  if (coupon.courses.length > 0) {
    const isApplicable = coupon.courses.some((c) => c.courseId === courseId);
    if (!isApplicable) {
      return {
        valid: false,
        message: "This coupon is not applicable to the selected course.",
      };
    }
  }

  // 8. Check minimum order amount
  const minAmount = Number(coupon.minOrderAmount);
  if (coursePrice < minAmount) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${minAmount} required to use this coupon.`,
    };
  }

  // 9. Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    const percentage = Number(coupon.discountValue);
    discountAmount = (coursePrice * percentage) / 100;
    if (coupon.maxDiscountAmount !== null) {
      const maxDiscount = Number(coupon.maxDiscountAmount);
      if (discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    }
  } else {
    // FIXED_AMOUNT
    const fixedVal = Number(coupon.discountValue);
    discountAmount = Math.min(fixedVal, coursePrice);
  }

  // Round to 2 decimal places
  discountAmount = Number(discountAmount.toFixed(2));
  const finalPrice = Number(Math.max(0, coursePrice - discountAmount).toFixed(2));

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    discountAmount,
    originalPrice: coursePrice,
    finalPrice,
    message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount}.`,
  };
}

// ==========================================
// 2. ADMIN COUPON MANAGEMENT
// ==========================================

export async function getAdminCouponsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
} = {}) {
  await requireAdmin();

  const now = new Date();
  const where: Prisma.CouponWhereInput = {};

  if (status === "active") {
    where.isActive = true;
    where.endDate = { gte: now };
  } else if (status === "inactive") {
    where.isActive = false;
  } else if (status === "expired") {
    where.endDate = { lt: now };
  }

  if (search) {
    where.code = { contains: search.toUpperCase() };
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            redemptions: true,
            courses: true,
          },
        },
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    data: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderAmount: Number(c.minOrderAmount),
      maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
      startDate: c.startDate,
      endDate: c.endDate,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usageCount: c.usageCount,
      isActive: c.isActive,
      isExpired: c.endDate < now,
      redemptionsCount: c._count.redemptions,
      applicableCoursesCount: c._count.courses,
      createdAt: c.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdminCouponByIdAction(id: string) {
  await requireAdmin();

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      courses: {
        include: {
          course: {
            select: { id: true, title: true, price: true },
          },
        },
      },
      redemptions: {
        take: 10,
        orderBy: { redeemedAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          order: { select: { orderNumber: true } },
        },
      },
    },
  });

  if (!coupon) throw new Error("Coupon not found");

  return {
    ...coupon,
    discountValue: Number(coupon.discountValue),
    minOrderAmount: Number(coupon.minOrderAmount),
    maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
  };
}

export async function createCouponAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const rawCourseIds = formData.getAll("courseIds").map(String);
  const rawData = {
    code: String(formData.get("code") || "").toUpperCase(),
    discountType: String(formData.get("discountType") || "PERCENTAGE"),
    discountValue: Number(formData.get("discountValue") || 0),
    minOrderAmount: Number(formData.get("minOrderAmount") || 0),
    maxDiscountAmount: formData.get("maxDiscountAmount")
      ? Number(formData.get("maxDiscountAmount"))
      : null,
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
    usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
    perUserLimit: Number(formData.get("perUserLimit") || 1),
    isActive: formData.get("isActive") === "true",
    courseIds: rawCourseIds,
  };

  const validated = couponSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the validation errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;

  // Check unique code
  const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (existing) {
    return {
      success: false,
      message: "A coupon with this code already exists.",
      errors: { code: ["This coupon code is already taken."] },
    };
  }

  await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: new Prisma.Decimal(data.discountValue),
        minOrderAmount: new Prisma.Decimal(data.minOrderAmount),
        maxDiscountAmount: data.maxDiscountAmount
          ? new Prisma.Decimal(data.maxDiscountAmount)
          : null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        isActive: data.isActive,
        isTestData: false,
      },
    });

    if (data.courseIds.length > 0) {
      await tx.couponCourse.createMany({
        data: data.courseIds.map((courseId) => ({
          couponId: coupon.id,
          courseId,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COUPON_CREATED",
        entityType: "Coupon",
        entityId: coupon.id,
        newValues: { code: data.code, discountType: data.discountType, discountValue: data.discountValue },
      },
    });
  });

  revalidatePath("/admin/coupons");
  revalidatePath("/admin/broker-offers");
  return { success: true, message: `Coupon "${data.code}" created successfully.` };
}

export async function updateCouponAction(
  couponId: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const rawCourseIds = formData.getAll("courseIds").map(String);
  const rawData = {
    code: String(formData.get("code") || "").toUpperCase(),
    discountType: String(formData.get("discountType") || "PERCENTAGE"),
    discountValue: Number(formData.get("discountValue") || 0),
    minOrderAmount: Number(formData.get("minOrderAmount") || 0),
    maxDiscountAmount: formData.get("maxDiscountAmount")
      ? Number(formData.get("maxDiscountAmount"))
      : null,
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
    usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
    perUserLimit: Number(formData.get("perUserLimit") || 1),
    isActive: formData.get("isActive") === "true",
    courseIds: rawCourseIds,
  };

  const validated = couponSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the validation errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;

  // Check unique code excluding current coupon
  const existing = await prisma.coupon.findFirst({
    where: { code: data.code, id: { not: couponId } },
  });
  if (existing) {
    return {
      success: false,
      message: "A coupon with this code already exists.",
      errors: { code: ["This coupon code is already taken."] },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.coupon.update({
      where: { id: couponId },
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: new Prisma.Decimal(data.discountValue),
        minOrderAmount: new Prisma.Decimal(data.minOrderAmount),
        maxDiscountAmount: data.maxDiscountAmount
          ? new Prisma.Decimal(data.maxDiscountAmount)
          : null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        isActive: data.isActive,
      },
    });

    // Replace course associations
    await tx.couponCourse.deleteMany({ where: { couponId } });
    if (data.courseIds.length > 0) {
      await tx.couponCourse.createMany({
        data: data.courseIds.map((courseId) => ({
          couponId,
          courseId,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COUPON_UPDATED",
        entityType: "Coupon",
        entityId: couponId,
        newValues: { code: data.code, isActive: data.isActive },
      },
    });
  });

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${couponId}`);
  revalidatePath("/admin/broker-offers");
  return { success: true, message: `Coupon "${data.code}" updated successfully.` };
}

export async function toggleCouponStatusAction(
  couponId: string,
  isActive: boolean
): Promise<ActionState> {
  const admin = await requireAdmin();

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COUPON_TOGGLED",
      entityType: "Coupon",
      entityId: couponId,
      newValues: { isActive },
    },
  });

  revalidatePath("/admin/coupons");
  revalidatePath("/admin/broker-offers");
  return { success: true, message: `Coupon is now ${isActive ? "active" : "inactive"}.` };
}

export async function deleteCouponAction(couponId: string): Promise<ActionState> {
  const admin = await requireAdmin();

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: { _count: { select: { redemptions: true } } },
  });

  if (!coupon) return { success: false, message: "Coupon not found" };

  if (coupon._count.redemptions > 0) {
    // Preserve financial history by deactivating instead of deleting
    await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/admin/broker-offers");
    return {
      success: true,
      message: "Coupon has existing redemptions and was deactivated to preserve order history.",
    };
  }

  await prisma.coupon.delete({ where: { id: couponId } });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "COUPON_DELETED",
      entityType: "Coupon",
      entityId: couponId,
      oldValues: { code: coupon.code },
    },
  });

  revalidatePath("/admin/coupons");
  revalidatePath("/admin/broker-offers");
  return { success: true, message: "Coupon deleted successfully." };
}
