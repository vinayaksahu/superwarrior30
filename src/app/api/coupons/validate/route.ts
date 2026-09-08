import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { getBrokerSettings } from "@/lib/broker/config";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchemaSync();
    const currentUser = await getCurrentUser();

    const body = await req.json();
    const { code, courseId, currentBalance } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: "Please enter a valid coupon code." },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { valid: false, message: "Course ID is required." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    const brokerSettings = await getBrokerSettings();
    if (brokerSettings.isCouponEnabled === false) {
      return NextResponse.json({
        valid: false,
        message: "Promo coupons are currently disabled by administrator.",
      });
    }

    // 1. Fetch course details
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: { id: true, price: true, title: true },
    });

    if (!course) {
      return NextResponse.json(
        { valid: false, message: "Course not found or unavailable." },
        { status: 404 }
      );
    }

    const coursePrice = Number(course.price);

    // 2. Find PROMOTIONAL COUPON
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
      include: {
        courses: { select: { courseId: true } },
      },
    });

    if (!coupon) {
      // Check if it matches an affiliate referral / welcome code (e.g. SUPERWARRIOR30)
      const referrerUser = await prisma.user.findUnique({
        where: { referralCode: cleanCode },
        select: { id: true, name: true, referralCode: true, status: true },
      });

      if (referrerUser && referrerUser.status === "ACTIVE" && brokerSettings.isReferralDiscountEnabled !== false) {
        if (currentUser && currentUser.id === referrerUser.id) {
          return NextResponse.json({
            valid: false,
            message: "You cannot use your own referral code for a discount.",
          });
        }

        const refPct = Number(brokerSettings.referralDiscountPercentage) || 25;
        const calculationBase = typeof currentBalance === "number" && !isNaN(currentBalance)
          ? Math.max(0, currentBalance)
          : coursePrice;

        const discountAmount = Number(((calculationBase * refPct) / 100).toFixed(2));
        const finalPrice = Math.max(0, Number((calculationBase - discountAmount).toFixed(2)));

        return NextResponse.json({
          valid: true,
          couponId: `ref_${referrerUser.id}`,
          code: referrerUser.referralCode,
          discountType: "PERCENTAGE",
          discountValue: refPct,
          maxDiscountAmount: null,
          discountAmount,
          originalPrice: coursePrice,
          calculationBase,
          finalPrice,
          message: `Referral/Welcome code "${referrerUser.referralCode}" applied! You save ₹${discountAmount} (${refPct}% OFF).`,
        });
      }

      return NextResponse.json({
        valid: false,
        message: "Invalid promo coupon code.",
      });
    }

    // Validate Promo Coupon
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, message: "This coupon is currently inactive." });
    }

    const now = new Date();
    if (now < new Date(coupon.startDate)) {
      return NextResponse.json({ valid: false, message: "This coupon promotion has not started yet." });
    }
    if (now > new Date(coupon.endDate)) {
      return NextResponse.json({ valid: false, message: "This coupon has expired." });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, message: "This coupon has reached its maximum total redemptions." });
    }

    if (currentUser) {
      const userRedemptions = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId: currentUser.id },
      });
      if (userRedemptions >= coupon.perUserLimit) {
        return NextResponse.json({
          valid: false,
          message: `You have already used this coupon maximum allowed times (${coupon.perUserLimit}).`,
        });
      }
    }

    if (coupon.courses.length > 0) {
      const isApplicable = coupon.courses.some((c) => c.courseId === course.id);
      if (!isApplicable) {
        return NextResponse.json({
          valid: false,
          message: "This coupon is not applicable to the selected course.",
        });
      }
    }

    const minAmount = Number(coupon.minOrderAmount);
    if (coursePrice < minAmount) {
      return NextResponse.json({
        valid: false,
        message: `Minimum order amount of ₹${minAmount} required to use this coupon.`,
      });
    }

    const calculationBase = typeof currentBalance === "number" && !isNaN(currentBalance)
      ? Math.max(0, currentBalance)
      : coursePrice;

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (calculationBase * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount !== null) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), calculationBase);
    }

    discountAmount = Number(discountAmount.toFixed(2));
    const finalPrice = Math.max(0, Number((calculationBase - discountAmount).toFixed(2)));

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      maxDiscountAmount: coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : null,
      discountAmount,
      originalPrice: coursePrice,
      calculationBase,
      finalPrice,
      message: `Promo coupon "${coupon.code}" applied! You save ₹${discountAmount}.`,
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json(
      { valid: false, message: "An error occurred while validating the coupon." },
      { status: 500 }
    );
  }
}
