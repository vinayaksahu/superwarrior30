import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payment/razorpay";
import { fulfillOrderPayment } from "@/server/actions/order.actions";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "webhook-caller";

    // Rate limit: 120 webhook events per minute per IP
    const rateLimit = await checkRateLimit({
      key: `webhook:${ip}`,
      limit: 120,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many webhook requests" },
        { status: 429 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    // 1. Verify webhook HMAC signature
    const isValid = await verifyRazorpayWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Handle payment.captured or order.paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (!razorpayOrderId) {
        return NextResponse.json({ message: "No order_id in event" }, { status: 200 });
      }

      // Find order by razorpay paymentId / metadata
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { paymentId: razorpayOrderId },
            { id: paymentEntity.notes?.orderId },
          ],
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: `Order not found for Razorpay Order ${razorpayOrderId}` },
          { status: 404 }
        );
      }

      // Idempotency: if already paid, return 200 without duplicate processing
      if (order.status === "PAID") {
        return NextResponse.json(
          { message: "Order already processed and fulfilled" },
          { status: 200 }
        );
      }

      // Fulfill payment and create course enrollment
      await fulfillOrderPayment({
        orderId: order.id,
        provider: "RAZORPAY_WEBHOOK",
        paymentId: razorpayPaymentId || razorpayOrderId,
        metadata: payload,
      });

      return NextResponse.json(
        { success: true, message: "Order fulfilled and user enrolled." },
        { status: 200 }
      );
    }

    // Handle payment.failed
    if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        await prisma.order.updateMany({
          where: {
            paymentId: razorpayOrderId,
            status: "PENDING",
          },
          data: {
            status: "FAILED",
            metadata: payload,
          },
        });
      }

      return NextResponse.json({ message: "Payment failure recorded" }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Webhook handler error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
