import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { CreatePaymentOrderInput, PaymentOrderResult } from "./types";

export interface RazorpayGatewayConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  isConfigured: boolean;
  provider: "RAZORPAY";
  title?: string;
}

/**
 * Resolves active Razorpay credentials:
 * 1. Checks active GATEWAY in DB (system_payment_methods)
 * 2. Falls back to environment variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
 */
export async function getRazorpayConfig(): Promise<RazorpayGatewayConfig> {
  try {
    const activeGateway = await prisma.systemPaymentMethod.findFirst({
      where: {
        type: "GATEWAY",
        isActive: true,
      },
    });

    if (activeGateway) {
      const details = (activeGateway.details as Record<string, string>) || {};
      const provider = (details.provider || "RAZORPAY").toUpperCase();

      if (provider === "RAZORPAY" && details.keyId && details.keySecret) {
        return {
          keyId: details.keyId,
          keySecret: details.keySecret,
          webhookSecret: details.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET,
          isConfigured: true,
          provider: "RAZORPAY",
          title: activeGateway.title,
        };
      }
    }
  } catch {
    // Fallback if DB table or connection is not ready
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  return {
    keyId: keyId || undefined,
    keySecret: keySecret || undefined,
    webhookSecret: webhookSecret || undefined,
    isConfigured: Boolean(keyId && keySecret),
    provider: "RAZORPAY",
    title: "Razorpay Secure Checkout",
  };
}

export async function isRazorpayConfigured(): Promise<boolean> {
  const config = await getRazorpayConfig();
  return config.isConfigured;
}

export async function getRazorpayKeyId(): Promise<string | undefined> {
  const config = await getRazorpayConfig();
  return config.keyId;
}

/**
 * Creates an order in Razorpay (amount converted to paise: 1 INR = 100 paise)
 */
export async function createRazorpayOrder(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  const config = await getRazorpayConfig();
  const keyId = config.keyId;
  const keySecret = config.keySecret;

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
export async function verifyRazorpayPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<boolean> {
  const config = await getRazorpayConfig();
  const secret = config.keySecret;

  if (!secret) {
    return false;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature)
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature from `x-razorpay-signature` header
 */
export async function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): Promise<boolean> {
  const config = await getRazorpayConfig();
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
