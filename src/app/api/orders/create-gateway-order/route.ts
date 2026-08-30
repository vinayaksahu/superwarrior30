import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { generateOrderNumber, generateReferralCode } from "@/lib/utils";
import { Prisma } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/payment/razorpay";
import { validateAndCalculateCouponAction } from "@/server/actions/coupon.actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchemaSync();

    let user = await getCurrentUser();

    const body = await req.json();
    const {
      courseId,
      couponCode,
      paymentMethodId,
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

      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
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
        if (!guestPassword || guestPassword.length < 6) {
          return NextResponse.json(
            { success: false, message: "Please set a password of at least 6 characters for your student account." },
            { status: 400 }
          );
        }

        const passwordHash = await hashPassword(guestPassword);
        const name = (guestName && typeof guestName === "string" ? guestName.trim() : "") || "Student";
        const phone = guestPhone && typeof guestPhone === "string" ? guestPhone.trim() : null;

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

        try {
          await prisma.wallet.create({ data: { userId: user.id } });
        } catch {
          // ignore
        }

        try {
          await prisma.lead.updateMany({
            where: { email: cleanEmail },
            data: { userId: user.id, stage: "CHECKOUT_STARTED", checkoutStartedAt: new Date() },
          });
        } catch {
          // ignore
        }
      }

      try {
        await createSession(user.id, user.email, user.role, user.tokenVersion);
      } catch {
        // ignore
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in or provide your details to continue." },
        { status: 401 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: "Course ID is missing." },
        { status: 400 }
      );
    }

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

    if (!course || course.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Course is not available for purchase." },
        { status: 404 }
      );
    }

    // Check if already active enrolled
    const existingEnrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
        status: "ACTIVE",
      },
      select: { id: true, status: true },
    });

    if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
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

    // Calculate coupon
    let couponId: string | null = null;
    let discountAmount = 0.0;
    let finalPayable = Number(course.price);

    if (couponCode && typeof couponCode === "string" && couponCode.trim().length > 0) {
      const couponRes = await validateAndCalculateCouponAction({
        code: couponCode.trim().toUpperCase(),
        courseId: course.id,
      });

      if (couponRes.valid && couponRes.couponId) {
        couponId = couponRes.couponId;
        discountAmount = couponRes.discountAmount;
        finalPayable = couponRes.finalPrice;
      }
    }

    const orderNumber = generateOrderNumber();
    const gatewayConfig = await getRazorpayConfig();

    const order = await prisma.order.create({
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
        paymentProvider: gatewayConfig.isConfigured ? "RAZORPAY" : "MOCK",
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

    // Create provider order
    const paymentOrder = await createRazorpayOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: finalPayable,
      currency: "INR",
      customerEmail: user.email,
      customerName: user.name || undefined,
      customerPhone: user.phone || undefined,
    });

    // Update order with provider order ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: paymentOrder.providerOrderId,
        metadata: {
          paymentMethodId,
          provider: paymentOrder.provider,
          providerOrderId: paymentOrder.providerOrderId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: finalPayable,
      currency: "INR",
      provider: paymentOrder.provider,
      providerOrderId: paymentOrder.providerOrderId,
      keyId: paymentOrder.keyId || gatewayConfig.keyId,
      customer: {
        name: user.name || "Student",
        email: user.email,
        phone: user.phone || "",
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("Create gateway order API error:", errorMsg);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
