export interface CreatePaymentOrderInput {
  orderId: string;
  orderNumber: string;
  amount: number; // in INR (Rupees)
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
}

export interface PaymentOrderResult {
  provider: "RAZORPAY" | "MOCK";
  providerOrderId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface PaymentVerificationInput {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature?: string;
}
