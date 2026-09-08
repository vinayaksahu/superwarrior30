import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature, getRazorpayConfig } from "@/lib/payment/razorpay";
import { fulfillOrderPayment } from "@/server/actions/order.actions";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "active",
    message: "Razorpay Webhook endpoint is healthy and ready to receive POST events.",
    timestamp: new Date().toISOString(),
  });
}

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

    // Fail closed: Webhook secret MUST be configured on server
    const config = await getRazorpayConfig();
    if (!config.webhookSecret) {
      console.error(
        "[FATAL SECURITY CONFIGURATION] Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured. Failing closed."
      );
      return NextResponse.json(
        { error: "Webhook verification unconfigured on server" },
        { status: 500 }
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

    // 2. Replay & Stale Event Protection (reject events older than 30 minutes)
    if (payload.created_at) {
      const ageSeconds = Math.floor(Date.now() / 1000) - Number(payload.created_at);
      if (ageSeconds > 1800) {
        return NextResponse.json(
          { error: "Webhook event is stale or replayed" },
          { status: 400 }
        );
      }
    }

    const event = payload.event;

    // Handle payment.captured or order.paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (!razorpayOrderId) {
        return NextResponse.json({ message: "No order_id in event" }, { status: 200 });
      }

      // Find order by gateway order ID (primary), paymentId (backward compat), or notes
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { gatewayOrderId: razorpayOrderId },
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

      // Reconciliation check: verify captured amount matches order total in paise
      if (paymentEntity?.amount !== undefined && paymentEntity?.amount !== null) {
        const expectedPaise = Math.round(Number(order.totalAmount) * 100);
        const actualPaise = Number(paymentEntity.amount);
        if (actualPaise < expectedPaise) {
          console.error(
            `[SECURITY ALERT] Webhook amount mismatch for order ${order.id}: expected ${expectedPaise} paise, received ${actualPaise} paise`
          );
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "FAILED",
              metadata: {
                ...((order.metadata as object) || {}),
                reconciliationFailure: {
                  expectedPaise,
                  actualPaise,
                  reason: "Amount paid was less than order total",
                },
              },
            },
          });
          return NextResponse.json(
            { error: "Payment amount does not match order amount" },
            { status: 400 }
          );
        }
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
            OR: [
              { gatewayOrderId: razorpayOrderId },
              { paymentId: razorpayOrderId },
            ],
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
    console.error("Razorpay webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
