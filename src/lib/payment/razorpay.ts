import "server-only";
import crypto from "crypto";
import type { CreatePaymentOrderInput, PaymentOrderResult } from "./types";

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
}

export function getRazorpayKeyId(): string | undefined {
  return process.env.RAZORPAY_KEY_ID;
}

/**
 * Creates an order in Razorpay (amount converted to paise: 1 INR = 100 paise)
 */
export async function createRazorpayOrder(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Return mock provider order in dev when keys are not configured
    return {
      provider: "MOCK",
      providerOrderId: `mock_order_${crypto.randomUUID()}`,
      amount: input.amount,
      currency: input.currency,
      keyId: "mock_key",
    };
  }

  const amountInPaise = Math.round(input.amount * 100);

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: input.currency,
      receipt: input.orderNumber,
      notes: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        customerEmail: input.customerEmail,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Razorpay order creation failed: ${errorData.error?.description || response.statusText}`
    );
  }

  const data = await response.json();

  return {
    provider: "RAZORPAY",
    providerOrderId: data.id,
    amount: input.amount,
    currency: input.currency,
    keyId,
  };
}

/**
 * Verifies Razorpay checkout payment signature:
 * generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret)
 */
export function verifyRazorpayPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return false;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
}

/**
 * Verifies Razorpay webhook signature from `x-razorpay-signature` header
 */
export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
