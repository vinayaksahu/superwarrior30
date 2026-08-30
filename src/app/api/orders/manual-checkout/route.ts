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

    let couponId: string | null = null;
    let discountAmount = 0.0;
    let finalPayable = Number(course.price);

    // Validate coupon if provided
    if (couponCode && typeof couponCode === "string" && couponCode.trim().length > 0) {
      const cleanCode = couponCode.trim().toUpperCase();
      try {
        const coupon = await prisma.coupon.findUnique({
          where: { code: cleanCode },
          include: { courses: { select: { courseId: true } } },
        });

        if (coupon && coupon.isActive) {
          const now = new Date();
          if (now >= new Date(coupon.startDate) && now <= new Date(coupon.endDate)) {
            if (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit) {
              const isApplicable =
                coupon.courses.length === 0 || coupon.courses.some((c) => c.courseId === course.id);

              if (isApplicable) {
                couponId = coupon.id;
                if (coupon.discountType === "PERCENTAGE") {
                  discountAmount = (finalPayable * Number(coupon.discountValue)) / 100;
                  if (coupon.maxDiscountAmount) {
                    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
                  }
                } else {
                  discountAmount = Math.min(finalPayable, Number(coupon.discountValue));
                }
                finalPayable = Math.max(0, finalPayable - discountAmount);
              }
            }
          }
        }
      } catch {
        // fallback coupon check
        if (cleanCode === "SW30" || cleanCode === "SUPER30") {
          discountAmount = Math.round(finalPayable * 0.3);
          finalPayable = Math.max(0, finalPayable - discountAmount);
        }
      }
    }

    // Broker Offer Server-Side Processing
    const brokerSettings = await getBrokerSettings();
    let brokerClaimData: {
      brokerName: string;
      brokerMemberId: string;
      mode: "CASHBACK" | "INSTANT_DISCOUNT";
      verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
      verifiedAt?: Date;
      coursePrice: Prisma.Decimal;
      offerPercentage: Prisma.Decimal;
      calculatedAmount: Prisma.Decimal;
      cashbackStatus: "NOT_APPLICABLE" | "PENDING_VERIFICATION";
    } | null = null;

    if (
      brokerMemberId &&
      typeof brokerMemberId === "string" &&
      brokerMemberId.trim().length > 0 &&
      brokerSettings.isEnabled
    ) {
      const cleanMemberId = brokerMemberId.trim();
      const offerPct = Number(brokerSettings.offerPercentage) || 40;
      const calculatedBrokerValue = (Number(course.price) * offerPct) / 100;

      if (brokerSettings.mode === "INSTANT_DISCOUNT") {
        // INSTANT DISCOUNT MODE: Strict Server-Side Verification
        if (!brokerSettings.isAutoVerificationActive) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Instant discount verification is currently unavailable. Please use the Cashback option.",
            },
            { status: 400 }
          );
        }

        const verifyResult = await verifyBrokerMemberIdServer(cleanMemberId, brokerSettings);
        if (!verifyResult.isVerified) {
          return NextResponse.json(
            {
              success: false,
              message:
                verifyResult.message ||
                "Partner Broker Member ID could not be verified automatically.",
            },
            { status: 400 }
          );
        }

        // Apply instant discount strictly on server
        discountAmount += calculatedBrokerValue;
        finalPayable = Math.max(0, Number(course.price) - discountAmount);

        brokerClaimData = {
          brokerName: brokerSettings.brokerName,
          brokerMemberId: cleanMemberId,
          mode: "INSTANT_DISCOUNT",
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          coursePrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
          offerPercentage: new Prisma.Decimal(offerPct.toFixed(2)),
          calculatedAmount: new Prisma.Decimal(calculatedBrokerValue.toFixed(2)),
          cashbackStatus: "NOT_APPLICABLE",
        };
      } else {
        // CASHBACK MODE: User pays FULL course amount
        brokerClaimData = {
          brokerName: brokerSettings.brokerName,
          brokerMemberId: cleanMemberId,
          mode: "CASHBACK",
          verificationStatus: "PENDING",
          coursePrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
          offerPercentage: new Prisma.Decimal(offerPct.toFixed(2)),
          calculatedAmount: new Prisma.Decimal(calculatedBrokerValue.toFixed(2)),
          cashbackStatus: "PENDING_VERIFICATION",
        };
      }
    }

    const orderNumber = generateOrderNumber();
    const cleanUtr = utrRef.trim();

    const proofData = {
      paymentMethodId: paymentMethodId || "manual",
      paymentMethodTitle: paymentMethodTitle || "Manual Payment",
      utrRef: cleanUtr,
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
          paymentProvider: "MANUAL",
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

      if (brokerClaimData) {
        await prisma.brokerOfferClaim.create({
          data: {
            userId: user.id,
            orderId: order.id,
            brokerName: brokerClaimData.brokerName,
            brokerMemberId: brokerClaimData.brokerMemberId,
            mode: brokerClaimData.mode,
            verificationStatus: brokerClaimData.verificationStatus,
            verifiedAt: brokerClaimData.verifiedAt,
            coursePrice: brokerClaimData.coursePrice,
            offerPercentage: brokerClaimData.offerPercentage,
            calculatedAmount: brokerClaimData.calculatedAmount,
            cashbackStatus: brokerClaimData.cashbackStatus,
          },
        });
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
