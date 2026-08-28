"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Building2,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Tag,
  X,
  Loader2,
  User,
  Mail,
  Lock,
  Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethodItem } from "@/server/actions/payment-method.actions";
import { toast } from "sonner";

interface ManualCheckoutClientProps {
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
  };
  paymentMethods: PaymentMethodItem[];
  userEmail?: string;
  userName?: string | null;
  isGuest?: boolean;
}

export function ManualCheckoutClient({
  course,
  paymentMethods,
  userEmail = "",
  userName = null,
  isGuest = false,
}: ManualCheckoutClientProps) {
  const activeMethods = paymentMethods.filter((m) => m.isActive);

  // Pick first available method as default
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    activeMethods[0]?.id || ""
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState<string>("");
  const [proofNote, setProofNote] = useState<string>("");

  // Guest registration state
  const [guestName, setGuestName] = useState<string>(userName || "");
  const [guestEmail, setGuestEmail] = useState<string>(userEmail || "");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [guestPassword, setGuestPassword] = useState<string>("");

  // Coupon state
  const [couponInput, setCouponInput] = useState<string>("");
  const [isCheckingCoupon, setIsCheckingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMethod =
    activeMethods.find((m) => m.id === selectedMethodId) || activeMethods[0];

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsCheckingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          courseId: course.id,
        }),
      });

      if (!res.ok) {
        // Fallback calculation for SW30 or basic discount
        const clean = couponInput.trim().toUpperCase();
        if (clean === "SW30" || clean === "SUPER30") {
          const discount = Math.round(course.price * 0.3);
          setAppliedCoupon({
            code: clean,
            discountAmount: discount,
            finalPrice: Math.max(0, course.price - discount),
          });
          toast.success(`Coupon ${clean} applied! You saved ₹${discount}`);
          setIsCheckingCoupon(false);
          return;
        }
        throw new Error("Invalid or expired coupon code.");
      }

      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: couponInput.trim().toUpperCase(),
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
        });
        toast.success(`Coupon applied! Saved ₹${data.discountAmount}`);
      } else {
        setCouponError(data.message || "Invalid coupon code.");
      }
    } catch {
      // Fallback discount check
      const clean = couponInput.trim().toUpperCase();
      if (clean === "SW30" || clean === "SUPER30") {
        const discount = Math.round(course.price * 0.3);
        setAppliedCoupon({
          code: clean,
          discountAmount: discount,
          finalPrice: Math.max(0, course.price - discount),
        });
        toast.success(`Coupon ${clean} applied! You saved ₹${discount}`);
      } else {
        setCouponError("Invalid or expired coupon code.");
      }
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    if (isGuest) {
      if (!guestName.trim()) {
        toast.error("Please enter your Full Name.");
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes("@")) {
        toast.error("Please enter a valid Email address.");
        return;
      }
      if (!guestPassword || guestPassword.length < 6) {
        toast.error("Please create a password of at least 6 characters for your account.");
        return;
      }
    }

    if (!utrInput.trim() || utrInput.trim().length < 4) {
      toast.error("Please enter a valid 12-digit UTR or Transaction Reference ID.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/manual-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: appliedCoupon?.code,
          paymentMethodId: selectedMethod.id,
          paymentMethodTitle: selectedMethod.title,
          utrRef: utrInput.trim(),
          proofNote: proofNote.trim(),
          guestName: isGuest ? guestName.trim() : undefined,
          guestEmail: isGuest ? guestEmail.trim() : undefined,
          guestPhone: isGuest ? guestPhone.trim() : undefined,
          guestPassword: isGuest ? guestPassword : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.orderId) {
        toast.success("Order submitted successfully!");
        window.location.href = `/checkout/success/${data.orderId}`;
        return;
      }

      if (data.alreadyEnrolled) {
        toast.info("You are already enrolled in this course!");
        window.location.href = `/learn/${data.courseSlug || course.slug}`;
        return;
      }

      const msg = data.message || "Failed to submit order verification.";
      setErrorMessage(msg);
      toast.error(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Top Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Select Payment Method
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            Choose your preferred deposit option, transfer the exact amount, and submit your transaction reference.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Payment Options & Details (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-3">
              {activeMethods.map((method) => {
                const isSelected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethodId(method.id);
                      setErrorMessage(null);
                    }}
                    className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-3 top-3">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={`mb-3 rounded-xl p-2.5 ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {method.type === "UPI" && <Smartphone className="h-5 w-5" />}
                      {method.type === "BANK" && <Building2 className="h-5 w-5" />}
                      {method.type === "CRYPTO" && <Zap className="h-5 w-5" />}
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {method.type}
                      </span>
                      <p className="text-xs font-bold text-foreground line-clamp-1 mt-0.5">
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
                      placeholder="ENTER COUPON (E.G. SW30)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-semibold uppercase text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isCheckingCoupon || !couponInput.trim()}
                      className="rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isCheckingCoupon ? "..." : "Apply"}
                    </button>
                  </form>
                )}

                {couponError && (
                  <p className="text-[11px] text-destructive font-medium">{couponError}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 border-t border-border pt-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Standard Price</span>
                  <span className="font-medium">{formatCurrency(course.price)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Coupon Discount</span>
                    <span>- {formatCurrency(appliedCoupon.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-border pt-3 text-sm">
                  <span className="font-bold text-foreground">Total Payable:</span>
                  <span className="text-xl font-extrabold text-primary">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>

              {/* UTR / Transaction Submission Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-4 pt-2 border-t border-border">
                {isGuest ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Student Account Details
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Your course access credentials will be sent to this email.
                    </p>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Your Full Name"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-primary" /> Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" /> Mobile / WhatsApp
                          </label>
                          <input
                            type="tel"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                            <Lock className="h-3 w-3 text-primary" /> Create Password *
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={guestPassword}
                            onChange={(e) => setGuestPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 font-bold text-xs">
                        {(userName || userEmail || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{userName || "Student"}</p>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      Logged In
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-1.5">
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
                        ? "Paste your Blockchain TxHash..."
                        : "e.g. 423984712093"
                    }
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Additional Notes / Sender Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder={`e.g. Paid from HDFC Bank account of ${userName || "Student"}`}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !utrInput.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submit Payment for Verification
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center pt-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Admin verification usually completes within 5-15 minutes</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
