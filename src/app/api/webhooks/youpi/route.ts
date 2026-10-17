import { NextRequest, NextResponse } from "next/server";
import { verifyYoupiWebhookSignature, getYoupiConfig } from "@/lib/payment/youpi";
import { fulfillOrderPayment } from "@/server/actions/order.actions";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "active",
    gateway: "YOUPI",
    message: "YouPI Webhook endpoint is healthy and listening for HMAC-SHA256 events.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "youpi-webhook";

    // Rate limit: 120 webhook events per minute per IP
    const rateLimit = await checkRateLimit({
      key: `webhook_youpi:${ip}`,
      limit: 120,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many webhook requests" },
        { status: 429 }
      );
    }

    const config = await getYoupiConfig();
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-gateway-signature") ||
      req.headers.get("X-Gateway-Signature");

    // Fail closed: Webhook secret MUST be configured on server if signature is present
    if (config.webhookSecret) {
      if (!signature) {
        return NextResponse.json(
          { error: "Missing X-Gateway-Signature header" },
          { status: 400 }
        );
      }

      const isValid = verifyYoupiWebhookSignature({
        rawBody,
        signature,
        secret: config.webhookSecret,
      });

      if (!isValid) {
        console.error("[YouPI Webhook] Invalid signature rejected");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      console.warn("[YouPI Webhook] YOUPI_WEBHOOK_SECRET is not configured in production");
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const event = payload.event || payload.status;
    const orderIdentifier = payload.orderId || payload.metadata?.orderId || payload.metadata?.orderNumber;
    const paymentId = payload.paymentId || payload.id;
    const utr = payload.utr || payload.rrn;

    console.log(`[YouPI Webhook] Received event: ${event} for order: ${orderIdentifier}, paymentId: ${paymentId}`);

    if (event === "SUCCESS") {
      if (!orderIdentifier && !paymentId) {
        return NextResponse.json(
          { error: "Missing order reference in webhook payload" },
          { status: 400 }
        );
      }

      // Find matching order in DB
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            ...(orderIdentifier ? [{ orderNumber: String(orderIdentifier) }, { id: String(orderIdentifier) }] : []),
            ...(paymentId ? [{ gatewayOrderId: String(paymentId) }, { paymentId: String(paymentId) }] : []),
          ],
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        console.warn(`[YouPI Webhook] Order not found for identifier: ${orderIdentifier || paymentId}`);
        return NextResponse.json(
          { message: "Order not found or already purged" },
          { status: 200 }
        );
      }

      if (order.status === "PAID") {
        return NextResponse.json(
          { received: true, message: "Order was already fulfilled" },
          { status: 200 }
        );
      }

      // Fulfill order & enroll student
      await fulfillOrderPayment({
        orderId: order.id,
        provider: "YOUPI",
        paymentId: paymentId || order.gatewayOrderId || `youpi_${Date.now()}`,
        metadata: {
          utr,
          paymentId,
          amount: payload.amount,
          amountPaise: payload.amountPaise,
          confirmedVia: "AUTHORITATIVE_WEBHOOK",
          verifiedAt: payload.completedAt || new Date().toISOString(),
        },
      });

      if (utr || paymentId) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentProvider: "YOUPI",
            gatewayOrderId: paymentId || order.gatewayOrderId,
            paymentId: paymentId || order.paymentId,
            manualPaymentRef: utr || order.manualPaymentRef,
          },
        });
      }

      return NextResponse.json({
        received: true,
        orderId: order.id,
        status: "PAID",
      });
    }

    if (event === "FAILED" || event === "CANCELLED" || event === "EXPIRED") {
      if (orderIdentifier || paymentId) {
        await prisma.order.updateMany({
          where: {
            OR: [
              ...(orderIdentifier ? [{ orderNumber: String(orderIdentifier) }, { id: String(orderIdentifier) }] : []),
              ...(paymentId ? [{ gatewayOrderId: String(paymentId) }] : []),
            ],
            status: "PENDING",
          },
          data: {
            status: "FAILED",
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("[YouPI Webhook Error]:", errorMsg);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 }
    );
  }
}
