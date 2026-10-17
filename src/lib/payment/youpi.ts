import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { CreatePaymentOrderInput, PaymentOrderResult } from "./types";

export interface YoupiGatewayConfig {
  apiUrl: string;
  checkoutUrl: string;
  merchantId?: string;
  webhookSecret?: string;
  isConfigured: boolean;
  provider: "YOUPI";
  title?: string;
}

/**
 * Resolves active YouPI credentials:
 * 1. Checks active GATEWAY in DB (system_payment_methods) with provider === 'YOUPI'
 * 2. Falls back to environment variables (YOUPI_API_URL, YOUPI_MERCHANT_ID, YOUPI_WEBHOOK_SECRET)
 */
export async function getYoupiConfig(): Promise<YoupiGatewayConfig> {
  try {
    const activeGateway = await prisma.systemPaymentMethod.findFirst({
      where: {
        type: "GATEWAY",
        isActive: true,
      },
    });

    if (activeGateway) {
      const details = (activeGateway.details as Record<string, string>) || {};
      const provider = (details.provider || "").toUpperCase();

      if (provider === "YOUPI") {
        const apiUrl = (details.apiUrl || process.env.YOUPI_API_URL || "http://localhost:6100").replace(/\/+$/, "");
        const checkoutUrl = (details.checkoutUrl || process.env.YOUPI_CHECKOUT_URL || "http://localhost:7000").replace(/\/+$/, "");
        const merchantId = details.merchantId || process.env.YOUPI_MERCHANT_ID || undefined;
        const webhookSecret = details.webhookSecret || process.env.YOUPI_WEBHOOK_SECRET || undefined;

        return {
          apiUrl,
          checkoutUrl,
          merchantId,
          webhookSecret,
          isConfigured: true,
          provider: "YOUPI",
          title: activeGateway.title || "YouPI Sovereign UPI Gateway",
        };
      }
    }
  } catch {
    // Fallback if DB table or connection is not ready
  }

  const apiUrl = (process.env.YOUPI_API_URL || "http://localhost:6100").replace(/\/+$/, "");
  const checkoutUrl = (process.env.YOUPI_CHECKOUT_URL || "http://localhost:7000").replace(/\/+$/, "");
  const merchantId = process.env.YOUPI_MERCHANT_ID || undefined;
  const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET || undefined;

  const isConfigured = Boolean(process.env.YOUPI_API_URL || process.env.YOUPI_MERCHANT_ID || process.env.YOUPI_WEBHOOK_SECRET);

  return {
    apiUrl,
    checkoutUrl,
    merchantId,
    webhookSecret,
    isConfigured,
    provider: "YOUPI",
    title: "YouPI Sovereign UPI Gateway",
  };
}

/**
 * Initializes a new YouPI payment session via POST /api/v1/payments
 */
export async function createYoupiOrder(
  input: CreatePaymentOrderInput & { appBaseUrl?: string }
): Promise<PaymentOrderResult> {
  const config = await getYoupiConfig();

  const appBaseUrl = input.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnUrl = `${appBaseUrl.replace(/\/+$/, "")}/checkout/success/${input.orderId}`;

  const payload: Record<string, any> = {
    orderId: input.orderNumber,
    amount: input.amount.toFixed(2),
    currency: input.currency || "INR",
    customer: {
      name: input.customerName || "Student",
      email: input.customerEmail,
      phoneNumber: input.customerPhone || "",
    },
    description: `Super Warrior 30 - Order ${input.orderNumber}`,
    returnUrl,
    metadata: {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      customerEmail: input.customerEmail,
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.merchantId) {
    headers["X-Merchant-Id"] = config.merchantId;
  }

  try {
    const res = await fetch(`${config.apiUrl}/api/v1/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[YouPI API Error]", res.status, errText);
      throw new Error(`YouPI Gateway error (${res.status}): ${errText || "Unable to create payment session"}`);
    }

    const data = await res.json();

    // Determine checkout URL
    let checkoutUrl = data.checkoutUrl;
    if (!checkoutUrl && data.paymentId) {
      checkoutUrl = `${config.checkoutUrl}/checkout/${data.paymentId}`;
    }

    return {
      provider: "YOUPI",
      providerOrderId: data.paymentId || input.orderNumber,
      amount: input.amount,
      currency: input.currency || "INR",
      checkoutUrl,
      keyId: config.merchantId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[YouPI createPayment Exception]", msg);
    throw new Error(`Failed to initialize YouPI payment gateway: ${msg}`);
  }
}

/**
 * Cryptographically verifies an incoming webhook payload using HMAC-SHA256
 */
export function verifyYoupiWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret?: string;
}): boolean {
  const { rawBody, signature, secret } = params;
  if (!secret) {
    console.error("[YouPI Webhook] Secret is missing for signature verification");
    return false;
  }

  if (!signature || !signature.startsWith("sha256=")) {
    console.error("[YouPI Webhook] Signature header format invalid. Expected sha256=...");
    return false;
  }

  try {
    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    const expectedSignature = `sha256=${expectedHash}`;

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch (err) {
    console.error("[YouPI Webhook] Verification error:", err);
    return false;
  }
}

/**
 * Retrieves payment status from YouPI REST API
 */
export async function getYoupiPaymentStatus(paymentId: string): Promise<{
  paymentId: string;
  orderId: string;
  status: "INITIATED" | "ACTIVE" | "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED" | string;
  utr?: string;
  amount?: string;
  metadata?: Record<string, any>;
}> {
  const config = await getYoupiConfig();

  const res = await fetch(`${config.apiUrl}/api/v1/payments/${paymentId}`, {
    headers: {
      ...(config.merchantId ? { "X-Merchant-Id": config.merchantId } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to query YouPI payment status (${res.status}): ${errText}`);
  }

  return await res.json();
}
