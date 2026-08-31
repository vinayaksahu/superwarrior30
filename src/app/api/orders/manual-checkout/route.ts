import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { generateOrderNumber, generateReferralCode } from "@/lib/utils";
import { Prisma } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getBrokerSettings } from "@/lib/broker/config";
import { verifyBrokerMemberIdServer } from "@/lib/broker/verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchemaSync();

    let user = await getCurrentUser();

    const body = await req.json();
    const {
      courseId,
      couponCode,
      brokerMemberId,
      paymentMethodId,
      paymentMethodTitle,
      utrRef,
      proofNote,
      guestName,
      guestEmail,
      guestPassword,
      guestPhone,
    } = body;

    // Handle guest account creation/login if user is not already authenticated
    if (!user) {
      if (!guestEmail || typeof guestEmail !== "string" || !guestEmail.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid email address for course access." },
          { status: 400 }
        );
      }

      const cleanEmail = guestEmail.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        // If password was provided, verify it
        if (guestPassword) {
          const isValid = await verifyPassword(guestPassword, existingUser.passwordHash);
          if (!isValid) {
            return NextResponse.json(
              {
                success: false,
                message: "An account with this email already exists. Please enter your correct password or log in.",
              },
              { status: 400 }
            );
          }
        }
        user = existingUser;
      } else {
        // Create new student account
        if (!guestPassword || guestPassword.length < 6) {
          return NextResponse.json(
            { success: false, message: "Please set a password of at least 6 characters for your student account." },
            { status: 400 }
          );
        }

        const passwordHash = await hashPassword(guestPassword);
        const name = (guestName && typeof guestName === "string" ? guestName.trim() : "") || "Student";
        const phone = guestPhone && typeof guestPhone === "string" ? guestPhone.trim() : null;

        // Generate unique referral code
        let newReferralCode: string;
        let codeExists = true;
        do {
          newReferralCode = generateReferralCode();
          const check = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
          codeExists = !!check;
        } while (codeExists);

        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name,
            phone,
            passwordHash,
            referralCode: newReferralCode,
            tokenVersion: 1,
            status: "ACTIVE",
            role: "STUDENT",
          },
        });

        // Create wallet for new student
        try {
          await prisma.wallet.create({ data: { userId: user.id } });
        } catch {
          // ignore
        }

        // Link matching lead
        try {
          await prisma.lead.updateMany({
            where: { email: cleanEmail },
            data: { userId: user.id, stage: "CHECKOUT_STARTED", checkoutStartedAt: new Date() },
          });
        } catch {
          // ignore
        }
      }

      // Automatically log the user in
      try {
        await createSession(user.id, user.email, user.role, user.tokenVersion);
      } catch {
        // ignore if cookies cannot be set in some environments
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in or provide your details to complete your order." },
        { status: 401 }
      );
    }
    if (!utrRef || typeof utrRef !== "string" || utrRef.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid UTR / Transaction Reference ID." },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: "Course ID is missing." },
        { status: 400 }
      );
    }

    // Find course by ID or slug
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        status: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    // Safe check if already active enrolled
    let isAlreadyEnrolled = false;
    try {
      const existingEnrollment = await prisma.courseEnrollment.findFirst({
        where: {
          userId: user.id,
          courseId: course.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
        isAlreadyEnrolled = true;
      }
    } catch {
      // fallback
    }

    if (isAlreadyEnrolled) {
      return NextResponse.json(
        {
          success: false,
          alreadyEnrolled: true,
          courseSlug: course.slug,
          message: "You are already enrolled in this course.",
        },
        { status: 200 }
      );
    }

    const brokerSettings = await getBrokerSettings();

    // 1. Calculate Promo Coupon Discount
    let couponId: string | null = null;
    let couponDiscount = 0.0;
    const requestedCouponCode = (body.couponCode || "").trim().toUpperCase();

    if (requestedCouponCode && brokerSettings.isCouponEnabled !== false) {
      const couponRes = await validateAndCalculateCouponAction({
        code: requestedCouponCode,
        courseId: course.id,
      });

      if (couponRes.valid && couponRes.couponId) {
        couponId = couponRes.couponId;
        couponDiscount = couponRes.discountAmount;
      }
    }

    // 2. Calculate Referral Discount
    let referralDiscount = 0.0;
    let appliedReferrerId: string | null = null;
    const requestedReferralCode = (body.referralCode || "").trim().toUpperCase();

    if (requestedReferralCode && brokerSettings.isReferralDiscountEnabled !== false) {
      const referrerUser = await prisma.user.findUnique({
        where: { referralCode: requestedReferralCode },
        select: { id: true, name: true, referralCode: true, status: true },
      });

      if (referrerUser && referrerUser.status === "ACTIVE" && referrerUser.id !== user.id) {
        appliedReferrerId = referrerUser.id;
        const refPct = Number(brokerSettings.referralDiscountPercentage) || 10;
        referralDiscount = Number(((Number(course.price) * refPct) / 100).toFixed(2));
      }
    }

    // 3. Broker Offer Server-Side Processing
    let brokerClaimData: {
      brokerName: string;
      brokerMemberId: string;
      proofUrl?: string | null;
      mode: "CASHBACK" | "INSTANT_DISCOUNT";
      verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
      verifiedAt?: Date;
      coursePrice: Prisma.Decimal;
      offerPercentage: Prisma.Decimal;
      calculatedAmount: Prisma.Decimal;
      cashbackStatus: "NOT_APPLICABLE" | "PENDING_VERIFICATION";
    } | null = null;

    let brokerInstantDiscount = 0.0;

    const requestedBrokerMemberId =
      (body.brokerMemberId || body.memberId || "").trim();
    const requestedProofUrl =
      (body.brokerProofUrl || body.proofUrl || "").trim() || null;
    const isBrokerRequested =
      Boolean(body.hasBrokerAccount || requestedBrokerMemberId || requestedProofUrl);

    if (isBrokerRequested && brokerSettings.isEnabled) {
      const now = new Date();

      // 1. Date window validation
      if (brokerSettings.startDate && new Date(brokerSettings.startDate) > now) {
        return NextResponse.json(
          { success: false, message: "This broker offer has not started yet." },
          { status: 400 }
        );
      }
      if (brokerSettings.endDate && new Date(brokerSettings.endDate) < now) {
        return NextResponse.json(
          { success: false, message: "This broker offer has expired." },
          { status: 400 }
        );
      }

      // 2. Minimum order amount validation
      if (
        brokerSettings.minimumOrderAmount > 0 &&
        Number(course.price) < brokerSettings.minimumOrderAmount
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum order amount of ₹${brokerSettings.minimumOrderAmount} is required for this broker offer.`,
          },
          { status: 400 }
        );
      }

      // 3. Course eligibility check
      if (
        brokerSettings.eligibleCourseScope === "SELECTED_COURSES" &&
        Array.isArray(brokerSettings.eligibleCourseIds) &&
        brokerSettings.eligibleCourseIds.length > 0 &&
        !brokerSettings.eligibleCourseIds.includes(course.id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "This course is not eligible for the partner broker offer.",
          },
          { status: 400 }
        );
      }

      // 4. Require Member ID check
      if (brokerSettings.requireMemberId && !requestedBrokerMemberId) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter your Broker Member ID / User ID.",
          },
          { status: 400 }
        );
      }

      // 5. Require Proof check
      if (brokerSettings.requireProof && !requestedProofUrl) {
        return NextResponse.json(
          {
            success: false,
            message: "Please upload your Broker account screenshot / proof.",
          },
          { status: 400 }
        );
      }

      const offerPct = Number(brokerSettings.offerPercentage) || 40;
      let calculatedBrokerValue = (Number(course.price) * offerPct) / 100;

      // Cap at maximum benefit amount if configured
      if (
        brokerSettings.maximumBenefitAmount &&
        brokerSettings.maximumBenefitAmount > 0 &&
        calculatedBrokerValue > brokerSettings.maximumBenefitAmount
      ) {
        calculatedBrokerValue = brokerSettings.maximumBenefitAmount;
      }

      const cleanMemberId = requestedBrokerMemberId || "PARTNER-CLAIM";

      if (brokerSettings.mode === "INSTANT_DISCOUNT") {
        brokerInstantDiscount = calculatedBrokerValue;
      }

      let isAutoVerified = false;
      if (brokerSettings.isAutoVerificationActive) {
        const verifyResult = await verifyBrokerMemberIdServer(cleanMemberId, brokerSettings);
        isAutoVerified = verifyResult.isVerified;
      }

      brokerClaimData = {
        brokerName: brokerSettings.brokerName,
        brokerMemberId: cleanMemberId,
        proofUrl: requestedProofUrl,
        mode: brokerSettings.mode,
        verificationStatus: isAutoVerified ? "VERIFIED" : "PENDING",
        verifiedAt: isAutoVerified ? new Date() : undefined,
        coursePrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
        offerPercentage: new Prisma.Decimal(offerPct.toFixed(2)),
        calculatedAmount: new Prisma.Decimal(calculatedBrokerValue.toFixed(2)),
        cashbackStatus:
          brokerSettings.mode === "CASHBACK"
            ? "PENDING_VERIFICATION"
            : "NOT_APPLICABLE",
      };
    }

    // 4. Stacking Rules Validation
    const hasCoupon = couponDiscount > 0;
    const hasReferral = referralDiscount > 0;
    const hasBroker = isBrokerRequested;

    const allowAll = Boolean(brokerSettings.allowAllStacking || brokerSettings.allowReferralStacking);
    const allowCouponBroker = Boolean(brokerSettings.allowCouponWithBroker || brokerSettings.allowCouponStacking || allowAll);
    const allowReferralCoupon = Boolean(brokerSettings.allowReferralWithCoupon || allowAll);
    const allowReferralBroker = Boolean(brokerSettings.allowReferralWithBroker || allowAll);

    if (hasCoupon && hasReferral && hasBroker && !allowAll) {
      return NextResponse.json(
        { success: false, message: "Stacking all three discounts simultaneously is not allowed by policy." },
        { status: 400 }
      );
    }
    if (hasCoupon && hasBroker && !allowCouponBroker) {
      return NextResponse.json(
        { success: false, message: "Promo coupon and Broker Offer cannot be stacked together." },
        { status: 400 }
      );
    }
    if (hasReferral && hasCoupon && !allowReferralCoupon) {
      return NextResponse.json(
        { success: false, message: "Referral discount and Promo coupon cannot be stacked together." },
        { status: 400 }
      );
    }
    if (hasReferral && hasBroker && !allowReferralBroker) {
      return NextResponse.json(
        { success: false, message: "Referral discount and Broker Offer cannot be stacked together." },
        { status: 400 }
      );
    }

    const totalDiscount = couponDiscount + referralDiscount + brokerInstantDiscount;
    const discountAmount = totalDiscount;
    const finalPayable = Math.max(0, Number(course.price) - totalDiscount);

    const orderNumber = generateOrderNumber();
    const cleanUtr = utrRef.trim();

    const proofData = {
      paymentMethodId: paymentMethodId || "manual",
      paymentMethodTitle: paymentMethodTitle || "Manual Payment",
      utrRef: cleanUtr,
      proofUrl: requestedProofUrl,
      proofNote: proofNote?.trim() || null,
      submittedAt: new Date().toISOString(),
      customerEmail: user.email,
      customerName: user.name || "Student",
    };

    let order;
    try {
      order = await prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          couponId,
          status: "PENDING",
          currency: "INR",
          subtotalAmount: new Prisma.Decimal(Number(course.price).toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          taxAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal(finalPayable.toFixed(2)),
          paymentProvider: "MANUAL_TRANSFER",
          paymentId: cleanUtr,
          manualPaymentRef: cleanUtr,
          manualPaymentProof: proofData,
          metadata: proofData,
          items: {
            create: {
              courseId: course.id,
              itemTitle: course.title,
              unitPrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
              quantity: 1,
              totalPrice: new Prisma.Decimal(finalPayable.toFixed(2)),
            },
          },
        },
      });

      // If broker claim exists, persist claim record linked to order
      if (brokerClaimData) {
        try {
          await prisma.brokerOfferClaim.create({
            data: {
              userId: user.id,
              orderId: order.id,
              brokerName: brokerClaimData.brokerName,
              brokerMemberId: brokerClaimData.brokerMemberId,
              proofUrl: brokerClaimData.proofUrl,
              mode: brokerClaimData.mode,
              verificationStatus: brokerClaimData.verificationStatus,
              verifiedAt: brokerClaimData.verifiedAt,
              coursePrice: brokerClaimData.coursePrice,
              offerPercentage: brokerClaimData.offerPercentage,
              calculatedAmount: brokerClaimData.calculatedAmount,
              cashbackStatus: brokerClaimData.cashbackStatus,
            },
          });
        } catch (err) {
          console.error("Failed to record broker offer claim in manual checkout:", err);
        }
      }
    } catch {
      // Fallback create if schema does not have custom columns
      order = await prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          couponId,
          status: "PENDING",
          currency: "INR",
          subtotalAmount: new Prisma.Decimal(Number(course.price).toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          taxAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal(finalPayable.toFixed(2)),
          paymentProvider: "MANUAL",
          paymentId: cleanUtr,
          metadata: proofData,
          items: {
            create: {
              courseId: course.id,
              itemTitle: course.title,
              unitPrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
              quantity: 1,
              totalPrice: new Prisma.Decimal(finalPayable.toFixed(2)),
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: "Payment details submitted successfully! Your order is pending verification.",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("Manual checkout API error:", errorMsg);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
