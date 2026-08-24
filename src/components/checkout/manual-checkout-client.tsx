"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type PaymentMethodItem,
} from "@/server/actions/payment-method.actions";
import {
  submitManualPaymentOrderAction,
} from "@/server/actions/order.actions";
import { validateAndCalculateCouponAction } from "@/server/actions/coupon.actions";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Tag,
  Check,
  X,
  Smartphone,
  Building2,
  Zap,
  Copy,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ManualCheckoutClientProps {
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
  };
  paymentMethods: PaymentMethodItem[];
  userEmail: string;
  userName: string | null;
}

export function ManualCheckoutClient({
  course,
  paymentMethods,
  userEmail,
  userName,
}: ManualCheckoutClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCouponPending, startCouponTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected payment method
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods[0]?.id || ""
  );

  // UTR / Transaction ID state
  const [utrInput, setUtrInput] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    originalPrice: number;
    finalPrice: number;
    message: string;
  } | null>(null);

  const selectedMethod =
    paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    startCouponTransition(async () => {
      try {
        const res = await validateAndCalculateCouponAction({
          code: couponInput.trim(),
          courseId: course.id,
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

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    if (!utrInput.trim() || utrInput.trim().length < 4) {
      toast.error("Please enter a valid UTR / Transaction Reference ID.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitManualPaymentOrderAction({
          courseId: course.id,
          couponCode: appliedCoupon?.code,
          paymentMethodId: selectedMethod.id,
          paymentMethodTitle: selectedMethod.title,
          utrRef: utrInput.trim(),
          proofNote: proofNote.trim(),
        });

        if (res?.success && res?.orderId) {
          toast.success("Order submitted successfully!");
          // Use full client redirect to avoid React 19 transition race condition #441
          window.location.href = `/checkout/success/${res.orderId}`;
          return;
        }

        if (res?.alreadyEnrolled) {
          toast.info("You are already enrolled in this course!");
          window.location.href = `/learn/${course.slug}`;
          return;
        }

        const failMsg = typeof res?.message === "string" ? res.message : "Failed to submit order.";
        setErrorMessage(failMsg);
        toast.error(failMsg);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Error submitting order";
        setErrorMessage(errMsg);
        toast.error(errMsg);
      }
    });
  };

  const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : course.price;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto max-w-4xl px-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancel and return to courses
        </Link>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Payment Method Selection & Instructions (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Select Payment Method
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choose your preferred deposit option, transfer the exact amount, and submit your transaction reference.
              </p>
            </div>

            {/* Payment Method Selector Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((method) => {
                const isSelected = method.id === selectedMethodId;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      "flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-border/80 hover:bg-accent/40"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-xl font-bold",
                          method.type === "UPI" && "bg-emerald-500/15 text-emerald-400",
                          method.type === "BANK" && "bg-sky-500/15 text-sky-400",
                          method.type === "CRYPTO" && "bg-amber-500/15 text-amber-400"
                        )}
                      >
                        {method.type === "UPI" && <Smartphone className="h-4 w-4" />}
                        {method.type === "BANK" && <Building2 className="h-4 w-4" />}
                        {method.type === "CRYPTO" && <Zap className="h-4 w-4" />}
                      </span>

                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {method.type}
                      </span>
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {method.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Payment Details & QR Box */}
            {selectedMethod && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {selectedMethod.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Pay exactly <strong className="text-primary">{formatCurrency(finalAmount)}</strong>
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                    {selectedMethod.type}
                  </span>
                </div>

                {/* Dynamic QR Code */}
                {(selectedMethod.details.qrCodeUrl || selectedMethod.details.upiId || selectedMethod.details.walletAddress) && (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-background/80 p-5 border border-border/50 space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        selectedMethod.details.qrCodeUrl ||
                        (selectedMethod.type === "UPI"
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(
                              selectedMethod.details.upiId || "superwarrior30@upi"
                            )}%26pn%3DSuperWarrior30`
                          : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                              selectedMethod.details.walletAddress || ""
                            )}`)
                      }
                      alt={`${selectedMethod.title} QR`}
                      className="h-44 w-44 rounded-xl bg-white p-2 shadow-inner object-contain"
                      loading="eager"
                    />
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {selectedMethod.type === "CRYPTO"
                        ? "Scan using Binance / Trust Wallet / Web3 App"
                        : "Scan using GooglePay, PhonePe, Paytm or Banking App"}
                    </p>
                  </div>
                )}

                {/* Copyable details based on method */}
                <div className="space-y-3 rounded-xl bg-background/60 p-4 border border-border/40 text-xs">
                  {selectedMethod.type === "UPI" && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">UPI ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm">
                          {selectedMethod.details.upiId}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.details.upiId || "", "upi")}
                          className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold hover:bg-muted/80 flex items-center gap-1 text-foreground cursor-pointer"
                        >
                          {copiedKey === "upi" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedMethod.type === "CRYPTO" && (
                    <>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-medium">Network:</span>
                        <span className="font-bold text-amber-400">
                          {selectedMethod.details.network || "BEP-20 (BNB Smart Chain)"}
                        </span>
                      </div>
                      <div className="space-y-1 pt-1">
                        <span className="text-muted-foreground font-medium block text-[11px]">Deposit Address:</span>
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 p-2">
                          <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-[280px]">
                            {selectedMethod.details.walletAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.details.walletAddress || "", "crypto")}
                            className="rounded bg-background px-2 py-1 text-xs font-semibold hover:bg-muted text-foreground flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedKey === "crypto" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            Copy
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedMethod.type === "BANK" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-bold text-foreground">{selectedMethod.details.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Holder:</span>
                        <span className="font-semibold text-foreground">{selectedMethod.details.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground text-sm">
                            {selectedMethod.details.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.details.accountNumber || "", "acc")}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                          >
                            {copiedKey === "acc" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">IFSC Code:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">{selectedMethod.details.ifsc}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.details.ifsc || "", "ifsc")}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                          >
                            {copiedKey === "ifsc" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedMethod.instructions && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-200">
                    <p className="font-semibold mb-0.5">⚠️ Instructions:</p>
                    <p>{selectedMethod.instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Order Summary, Coupon & UTR Submission (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">
                Order Summary
              </h2>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Course Info */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Purchasing
                </span>
                <h3 className="font-extrabold text-foreground text-base">
                  {course.title}
                </h3>
              </div>

              {/* Coupon Code Section */}
              <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Have a Promo Coupon?
                </label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500 cursor-pointer"
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
                      placeholder="Enter coupon (e.g. SW30)"
                      className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-1 text-xs uppercase font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={isCouponPending || !couponInput.trim()}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-secondary px-3.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 cursor-pointer"
                    >
                      {isCouponPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </form>
                )}
              </div>

              {/* Price Calculation Box */}
              <div className="space-y-2.5 rounded-xl bg-background/80 p-4 border border-border/60 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Standard Price</span>
                  <span>{formatCurrency(course.price)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-500 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Total Payable:</span>
                  <span className="text-primary text-xl font-extrabold">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>

              {/* Verification Submission Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    {selectedMethod?.type === "CRYPTO"
                      ? "Transaction Hash (TxID) *"
                      : "12-Digit UTR / Transaction Reference ID *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder={
                      selectedMethod?.type === "CRYPTO"
                        ? "e.g. 0x8a92... or transaction hash"
                        : "e.g. 423984729102 (from UPI/Bank receipt)"
                    }
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Additional Notes / Sender Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="e.g. Paid from HDFC Bank account of Vinayak"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || !utrInput.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submit Payment for Verification
                    </>
                  )}
                </button>
              </form>

              {/* Security info */}
              <div className="rounded-xl bg-muted/20 p-3.5 border border-border/40 space-y-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Manual Verification Process</span>
                </div>
                <p>
                  After submitting, your order will be verified by our administrative staff. Once approved, the course will automatically unlock in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
