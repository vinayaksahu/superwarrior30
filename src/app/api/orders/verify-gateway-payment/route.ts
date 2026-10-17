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

    const body = await req.json();
    const {
      orderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Missing order ID." },
        { status: 400 }
      );
    }

    const [user, order] = await Promise.all([
      getCurrentUser(),
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              course: { select: { slug: true } },
            },
          },
        },
      })
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (order.userId !== user.id && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
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

    // Handle mock payment ONLY when order was server-created as MOCK and NOT in production
    if (order.paymentProvider === "MOCK") {
      if (process.env.NODE_ENV === "production" && !order.isTestData) {
        return NextResponse.json(
          { success: false, message: "Mock payments are disabled in production for live orders." },
          { status: 403 }
        );
      }

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

    // Handle YouPI Payment Gateway
    if (order.paymentProvider === "YOUPI") {
      const youpiPaymentId = order.gatewayOrderId || order.paymentId;
      if (!youpiPaymentId) {
        return NextResponse.json(
          { success: false, message: "Order has no associated YouPI payment ID." },
          { status: 400 }
        );
      }

      try {
        const { getYoupiPaymentStatus } = await import("@/lib/payment/youpi");
        const statusRes = await getYoupiPaymentStatus(youpiPaymentId);

        if (statusRes.status === "SUCCESS") {
          await fulfillOrderPayment({
            orderId: order.id,
            provider: "YOUPI",
            paymentId: youpiPaymentId,
            metadata: {
              utr: statusRes.utr,
              amount: statusRes.amount,
              verifiedAt: new Date().toISOString(),
              confirmedVia: "STATUS_POLL",
            },
          });

          if (statusRes.utr) {
            await prisma.order.update({
              where: { id: order.id },
              data: { manualPaymentRef: statusRes.utr },
            });
          }

          const courseSlug = order.items[0]?.course?.slug;
          return NextResponse.json({
            success: true,
            orderId: order.id,
            courseSlug,
            message: "Payment verified successfully via YouPI!",
          });
        } else {
          return NextResponse.json({
            success: false,
            status: statusRes.status,
            message: `Payment is currently ${statusRes.status}. Please complete payment in your UPI app.`,
          });
        }
      } catch (err: unknown) {
        console.error("YouPI verification query failed:", err);
        return NextResponse.json(
          { success: false, message: "Could not verify YouPI payment status yet. If you have paid, it will be confirmed automatically via webhook." },
          { status: 400 }
        );
      }
    }

    // SECURITY: Use server-stored Razorpay order ID for signature verification
    // NEVER trust client-supplied razorpayOrderId for HMAC verification
    const serverRazorpayOrderId = order.gatewayOrderId || order.paymentId;

    if (!serverRazorpayOrderId) {
      console.error(`Order ${orderId} has no associated gateway order ID.`);
      return NextResponse.json(
        { success: false, message: "Order has no associated payment gateway order." },
        { status: 400 }
      );
    }

    if (!razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { success: false, message: "Missing payment verification parameters." },
        { status: 400 }
      );
    }

    const isValid = await verifyRazorpayPaymentSignature({
      razorpayOrderId: serverRazorpayOrderId,
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
        razorpayOrderId: serverRazorpayOrderId,
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
