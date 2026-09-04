import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { getBrokerSettings } from "@/lib/broker/config";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function maskAffiliateName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Verified Affiliate Partner";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    return first.length > 2 ? `${first.slice(0, 2)}*** (Partner)` : `${first} (Partner)`;
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
  return `${first} ${lastInitial}. (Verified Partner)`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";

    // Rate limit: 20 validation requests per minute per IP
    const rateLimit = await checkRateLimit({
      key: `ref-validate:${ip}`,
      limit: 20,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { valid: false, message: "Too many referral code attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const currentUser = await getCurrentUser();

    const body = await req.json();
    const { code, courseId } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: "Please enter an affiliate referral code." },
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

    // 1. Fetch broker/referral settings
    const brokerSettings = await getBrokerSettings();
    if (brokerSettings.isReferralDiscountEnabled === false) {
      return NextResponse.json({
        valid: false,
        message: "Referral discount is currently disabled by administrator.",
      });
    }

    // 2. Fetch course
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

    // 3. Find affiliate user
    const referrerUser = await prisma.user.findUnique({
      where: { referralCode: cleanCode },
      select: { id: true, name: true, referralCode: true, status: true },
    });

    if (!referrerUser || referrerUser.status !== "ACTIVE") {
      return NextResponse.json({
        valid: false,
        message: "Invalid referral code. Please check and try again.",
      });
    }

    // Prevent self-referral
    if (currentUser && currentUser.id === referrerUser.id) {
      return NextResponse.json({
        valid: false,
        message: "You cannot use your own referral code for a discount.",
      });
    }

    const referralPct = Number(brokerSettings.referralDiscountPercentage) || 10;
    const discountAmount = Number(((coursePrice * referralPct) / 100).toFixed(2));
    const finalPrice = Math.max(0, Number((coursePrice - discountAmount).toFixed(2)));
    const maskedName = maskAffiliateName(referrerUser.name);

    return NextResponse.json({
      valid: true,
      referrerName: maskedName,
      code: referrerUser.referralCode,
      discountPercentage: referralPct,
      discountAmount,
      originalPrice: coursePrice,
      finalPrice,
      message: `Referral code "${referrerUser.referralCode}" applied! You unlocked ${referralPct}% instant discount (-₹${discountAmount}).`,
    });
  } catch (error) {
    console.error("Referral validation error:", error);
    return NextResponse.json(
      { valid: false, message: "Failed to validate referral code." },
      { status: 500 }
    );
  }
}
