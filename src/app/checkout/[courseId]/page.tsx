"use client";

import React, { useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction, mockConfirmPaymentAction, verifyRazorpayPaymentAction } from "@/server/actions/order.actions";
import { validateAndCalculateCouponAction } from "@/server/actions/coupon.actions";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, Lock, CheckCircle2, Loader2, ArrowLeft, AlertCircle, Tag, Check, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface CheckoutPageProps {
  params: Promise<{ courseId: string }>;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { courseId } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCouponPending, startCouponTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    originalPrice: number;
    finalPrice: number;
    message: string;
  } | null>(null);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    startCouponTransition(async () => {
      try {
        const res = await validateAndCalculateCouponAction({
          code: couponInput.trim(),
          courseId,
        });

        if (res.valid) {
          setAppliedCoupon({
            code: res.code!,
            discountAmount: res.discountAmount!,
            originalPrice: res.originalPrice!,
            finalPrice: res.finalPrice!,
            message: res.message!,
          });
          toast.success(res.message);
        } else {
          toast.error(res.message || "Invalid coupon code");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error validating coupon";
        toast.error(msg);
      }
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Coupon removed.");
  };

  const handleCheckout = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const orderResult = await createOrderAction(
          courseId,
          appliedCoupon?.code
        );

        if (!orderResult.success || !orderResult.orderId) {
          if (orderResult.alreadyEnrolled && orderResult.courseSlug) {
            toast.info("You are already enrolled! Redirecting to course...");
            router.push(`/learn/${orderResult.courseSlug}`);
            return;
          }
          throw new Error(orderResult.message || "Failed to create order");
        }

        const { orderId, paymentOrder } = orderResult;

        // If Razorpay is active and keys are loaded
        if (paymentOrder?.provider === "RAZORPAY" && typeof window !== "undefined") {
          if (!window.Razorpay) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
          }

          const options = {
            key: paymentOrder.keyId,
            amount: Math.round(paymentOrder.amount * 100),
            currency: paymentOrder.currency,
            name: "Super Warrior 30",
            description: `Enrollment: ${orderResult.courseTitle}`,
            order_id: paymentOrder.providerOrderId,
            handler: async function (response: any) {
              try {
                const verifyRes = await verifyRazorpayPaymentAction({
                  orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });

                if (verifyRes.success) {
                  toast.success("Payment successful! Course unlocked.");
                  router.push(`/checkout/success/${orderId}`);
                } else {
                  toast.error(verifyRes.message || "Verification failed");
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Verification error";
                toast.error(msg);
              }
            },
            theme: {
              color: "#16a34a",
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Dev Mock / Direct Test Payment flow
          const devRes = await mockConfirmPaymentAction(orderId);
          if (devRes.success) {
            toast.success("Enrollment successful!");
            router.push(`/checkout/success/${orderId}`);
          } else {
            toast.error(devRes.message || "Failed to confirm payment");
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Checkout error occurred";
        setErrorMessage(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancel and return to courses
        </Link>

        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-muted/30 px-6 py-5">
            <h1 className="text-xl font-bold text-foreground">Secure Checkout</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review your course enrollment order details
            </p>
          </div>

          <div className="p-6 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Coupon Code Box */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Have a Promo Coupon?
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-500">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>
                      Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500"
                    title="Remove coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (e.g. SW30)"
                    className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-1 text-xs uppercase font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={isCouponPending || !couponInput.trim()}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-secondary px-4 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {isCouponPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                  </button>
                </form>
              )}
            </div>

            {/* Order summary box */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold text-foreground border-b border-border/60 pb-3">
                <span>Item</span>
                <span>Amount</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">Course Lifetime Access</span>
                </div>
                <span className="font-semibold text-foreground">
                  {appliedCoupon
                    ? formatCurrency(appliedCoupon.originalPrice)
                    : "Verified at Checkout"}
                </span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-sm text-emerald-500 font-semibold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-border/60 pt-3 flex justify-between items-center text-base font-bold text-foreground">
                <span>Total Payable (INR)</span>
                <span className="text-primary text-xl">
                  {appliedCoupon
                    ? formatCurrency(appliedCoupon.finalPrice)
                    : "₹ Guaranteed Price"}
                </span>
              </div>
            </div>

            {/* Security points */}
            <div className="space-y-3 rounded-lg bg-background p-4 border border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Instant activation: Gain immediate access right after payment</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>256-bit encrypted secure transaction</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              disabled={isPending}
              onClick={handleCheckout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Complete Enrollment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
