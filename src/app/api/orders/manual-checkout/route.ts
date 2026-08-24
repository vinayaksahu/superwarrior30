import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { generateOrderNumber } from "@/lib/utils";
import { Prisma } from "@/generated/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchemaSync();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in to submit your payment verification." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { courseId, couponCode, paymentMethodId, paymentMethodTitle, utrRef, proofNote } = body;

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
