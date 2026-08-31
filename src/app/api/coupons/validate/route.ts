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
    const { code, courseId } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: "Please enter a valid coupon or referral code." },
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

    // 2. First check if it matches a PROMOTIONAL COUPON
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
      include: {
        courses: { select: { courseId: true } },
      },
    });

    if (coupon) {
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

      let discountAmount = 0;
      if (coupon.discountType === "PERCENTAGE") {
        discountAmount = (coursePrice * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmount !== null) {
          discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
        }
      } else {
        discountAmount = Math.min(Number(coupon.discountValue), coursePrice);
      }

      discountAmount = Number(discountAmount.toFixed(2));
      const finalPrice = Math.max(0, Number((coursePrice - discountAmount).toFixed(2)));

      return NextResponse.json({
        valid: true,
        type: "PROMO_COUPON",
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmount,
        originalPrice: coursePrice,
        finalPrice,
        message: `Promo coupon "${coupon.code}" applied! You save ₹${discountAmount}.`,
      });
    }

    // 3. Check if it matches an AFFILIATE REFERRAL CODE
    const referrerUser = await prisma.user.findUnique({
      where: { referralCode: cleanCode },
      select: { id: true, name: true, referralCode: true, status: true },
    });

    if (referrerUser && referrerUser.status === "ACTIVE") {
      // Check self-referral
      if (currentUser && currentUser.id === referrerUser.id) {
        return NextResponse.json({
          valid: false,
          message: "You cannot use your own referral code for discount.",
        });
      }

      const brokerSettings = await getBrokerSettings();
      if (brokerSettings.isReferralDiscountEnabled === false) {
        return NextResponse.json({
          valid: false,
          message: "Referral discount is currently disabled.",
        });
      }

      const referralPct = Number(brokerSettings.referralDiscountPercentage) || 10;
      let discountAmount = Number(((coursePrice * referralPct) / 100).toFixed(2));
      const finalPrice = Math.max(0, Number((coursePrice - discountAmount).toFixed(2)));

      return NextResponse.json({
        valid: true,
        type: "REFERRAL_DISCOUNT",
        referrerId: referrerUser.id,
        referrerName: referrerUser.name || "Affiliate Partner",
        code: referrerUser.referralCode,
        discountType: "PERCENTAGE",
        discountValue: referralPct,
        discountAmount,
        originalPrice: coursePrice,
        finalPrice,
        message: `Referral code "${referrerUser.referralCode}" applied! You unlocked ${referralPct}% instant discount (₹${discountAmount}).`,
      });
    }

    return NextResponse.json({
      valid: false,
      message: "Invalid coupon or referral code. Please check and try again.",
    });
  } catch (error) {
    console.error("Error validating coupon/referral code:", error);
    return NextResponse.json(
      { valid: false, message: "An error occurred while validating the code." },
      { status: 500 }
    );
  }
}
