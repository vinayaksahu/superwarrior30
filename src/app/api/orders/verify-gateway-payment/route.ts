import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { verifyRazorpayPaymentSignature } from "@/lib/payment/razorpay";
import { fulfillOrderPayment } from "@/server/actions/order.actions";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchemaSync();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      isMock,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Missing order ID." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            course: { select: { slug: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (order.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    if (order.status === "PAID") {
      const courseSlug = order.items[0]?.course?.slug;
      return NextResponse.json({
        success: true,
        orderId: order.id,
        courseSlug,
        message: "Order already confirmed.",
      });
    }

    // Handle mock payment in development / when mock mode is explicitly passed
    if (isMock || order.paymentProvider === "MOCK") {
      await fulfillOrderPayment({
        orderId: order.id,
        provider: "MOCK_GATEWAY",
        paymentId: razorpayPaymentId || `mock_pay_${Date.now()}`,
        metadata: {
          confirmedAt: new Date().toISOString(),
          confirmedBy: user.email,
        },
      });

      const courseSlug = order.items[0]?.course?.slug;
      return NextResponse.json({
        success: true,
        orderId: order.id,
        courseSlug,
        message: "Test payment confirmed.",
      });
    }

    // Verify live Razorpay signature
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { success: false, message: "Missing payment verification parameters." },
        { status: 400 }
      );
    }

    const isValid = await verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { success: false, message: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    // Fulfill order & enroll student
    await fulfillOrderPayment({
      orderId: order.id,
      provider: "RAZORPAY",
      paymentId: razorpayPaymentId,
      metadata: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        verifiedAt: new Date().toISOString(),
      },
    });

    const courseSlug = order.items[0]?.course?.slug;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      courseSlug,
      message: "Payment verified successfully!",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Payment verification error";
    console.error("Verify gateway payment API error:", errorMsg);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
