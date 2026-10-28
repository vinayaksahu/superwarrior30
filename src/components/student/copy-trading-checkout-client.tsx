"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  CreditCard,
  QrCode,
  Building,
  AlertCircle,
  Zap,
} from "lucide-react";
import type { CopyTradingAffiliateInfo } from "@/server/actions/copy-trading.actions";
import type { PaymentMethodItem } from "@/server/actions/payment-method.actions";
import { submitCopyTradingVpsPaymentAction } from "@/server/actions/copy-trading.actions";

interface CopyTradingCheckoutClientProps {
  affiliateInfo: CopyTradingAffiliateInfo;
  paymentMethods: PaymentMethodItem[];
}

export function CopyTradingCheckoutClient({
  affiliateInfo,
  paymentMethods,
}: CopyTradingCheckoutClientProps) {
  const router = useRouter();
  const { hostingStatus } = affiliateInfo;

  // Active payment methods
  const activeMethods = paymentMethods.filter((m) => m.isActive);
  const defaultMethod = activeMethods[0]?.id || "MANUAL_UPI";

  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultMethod);
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedMethod = activeMethods.find((m) => m.id === selectedMethodId);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setFeedback({ type: "error", message: "Please enter the UTR or Transaction Reference number." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await submitCopyTradingVpsPaymentAction({
        paymentMethod: selectedMethod?.title || selectedMethodId,
        utrNumber: utrNumber.trim(),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Payment submitted! VPS hosting activated for 30 days.",
        });
        setTimeout(() => {
          router.push("/dashboard/copy-trading");
          router.refresh();
        }, 1500);
      } else {
        setFeedback({ type: "error", message: res.message || "Failed to process payment." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/dashboard/copy-trading"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Copy Trading
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Zap className="h-4 w-4" />
          Handling Fee &amp; Account Setup
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Handling Fee &amp; Copy Trading Registration
        </h1>
        <p className="text-sm text-muted-foreground">
          Each student account requires a dedicated execution handling &amp; maintenance setup to mirror master trades 24/7 without terminal downtime.
        </p>
      </div>

      {/* 14,999 Course Exemption Banner */}
      {hostingStatus.isCourseEnrolled && (
        <div className={`rounded-xl border p-5 ${
          hostingStatus.isOneYearExempt
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10"
        }`}>
          <div className="flex items-start gap-3">
            <Sparkles className={`h-6 w-6 shrink-0 mt-0.5 ${
              hostingStatus.isOneYearExempt ? "text-emerald-500" : "text-amber-500"
            }`} />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                ₹14,999 Mentorship Course Benefit
                {hostingStatus.isOneYearExempt ? (
                  <span className="rounded-md bg-emerald-500/20 text-emerald-500 px-2.5 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap">
                    1-Year Free Active
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/20 text-amber-500 px-2.5 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap">
                    1-Year Period Expired
                  </span>
                )}
              </h3>
              {hostingStatus.isOneYearExempt ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    As an enrolled student of the ₹14,999 Course, your dedicated Handling Fee &amp; AMC charge is <strong>100% Free for 1 Year</strong> from your enrollment date!
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-emerald-500">
                    <span>⏳ {hostingStatus.exemptionDaysRemaining} Days Remaining</span>
                    <span>•</span>
                    <Link
                      href="/dashboard/copy-trading"
                      className="underline hover:text-emerald-400 font-bold"
                    >
                      Return to Copy Trading &amp; Connect MT5 →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your 1-year complimentary Handling Fee benefit has completed. To continue copying trades, please renew your monthly handling fee below (₹1,999/month).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active VPS Payment Banner if applicable */}
      {hostingStatus.hasActiveVpsPayment && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Handling Fee &amp; Maintenance Active</p>
              <p className="text-[11px] text-muted-foreground">
                Your monthly subscription is active until {hostingStatus.vpsPaymentExpiresAt ? new Date(hostingStatus.vpsPaymentExpiresAt).toLocaleDateString("en-IN") : "active period"}.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/copy-trading"
            className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Go to MT5 Terminal
          </Link>
        </div>
      )}

      {/* Main Checkout Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Payment Methods & Gateway */}
        <div className="md:col-span-2 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Select Payment Method
            </h2>

            {/* Methods Selection Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activeMethods.length > 0 ? (
                activeMethods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethodId(m.id)}
                    className={`rounded-xl border p-3 text-left transition-all flex flex-col justify-between ${
                      selectedMethodId === m.id
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-background/50 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {m.type === "UPI" && <QrCode className="h-4 w-4 text-primary" />}
                      {m.type === "BANK" && <Building className="h-4 w-4 text-primary" />}
                      {m.type === "GATEWAY" && <CreditCard className="h-4 w-4 text-primary" />}
                      {selectedMethodId === m.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <span className="text-xs font-bold block truncate">{m.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{m.type}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground text-center">
                  Standard UPI &amp; Bank Transfer Available Below
                </div>
              )}
            </div>

            {/* Method Details Box */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
              {selectedMethod?.type === "UPI" || !selectedMethod ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* QR Code */}
                    <div className="shrink-0 rounded-xl border border-border bg-white p-2.5 shadow-sm">
                      <img
                        src={
                          selectedMethod?.details?.qrCodeUrl ||
                          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${
                            selectedMethod?.details?.upiId || "superwarrior30@upi"
                          }&pn=SuperWarrior30&am=1999&cu=INR`
                        }
                        alt="Payment QR"
                        className="h-36 w-36 object-contain"
                      />
                    </div>

                    {/* UPI Info */}
                    <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Scan with any UPI App (GPay, PhonePe, Paytm)
                      </span>
                      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                        <div className="text-left">
                          <span className="text-[10px] text-muted-foreground block">UPI ID / VPA</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {selectedMethod?.details?.upiId || "superwarrior30@upi"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedMethod?.details?.upiId || "superwarrior30@upi", "upi")}
                          className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground text-xs"
                          title="Copy UPI ID"
                        >
                          {copiedField === "upi" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {selectedMethod?.details?.payeeName && (
                        <p className="text-[11px] text-muted-foreground">
                          Payee: <strong className="text-foreground">{selectedMethod.details.payeeName}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : selectedMethod.type === "BANK" ? (
                <div className="space-y-3 text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    NEFT / RTGS / IMPS Bank Transfer
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-card border border-border rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Bank Name</span>
                      <span className="font-semibold text-foreground">{selectedMethod.details.bankName || "HDFC Bank"}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Account Name</span>
                      <span className="font-semibold text-foreground">{selectedMethod.details.accountName || "Super Warrior 30 Mentorship"}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Account Number</span>
                        <span className="font-mono font-bold text-foreground">{selectedMethod.details.accountNumber || "50200012345678"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedMethod.details.accountNumber || "50200012345678", "acc")}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "acc" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">IFSC Code</span>
                        <span className="font-mono font-bold text-foreground">{selectedMethod.details.ifsc || "HDFC0001234"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedMethod.details.ifsc || "HDFC0001234", "ifsc")}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "ifsc" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedMethod?.instructions && (
                <div className="text-[11px] text-muted-foreground bg-accent/20 border border-border/40 rounded-lg p-2.5">
                  {selectedMethod.instructions}
                </div>
              )}
            </div>

            {/* Submission Form (UTR) */}
            <form onSubmit={handleActivate} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Transaction Reference / UTR Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 429381920194 / UPI Ref ID"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground font-mono font-bold placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Enter the 12-digit UTR/Reference ID shown on your payment confirmation screen.
                </p>
              </div>

              {feedback && (
                <div
                  className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
                    feedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !utrNumber.trim()}
                className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 text-xs sm:text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Activating Cloud VPS Slot...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit Payment &amp; Unlock MT5 Connection (₹1,999)
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Summary & Specifications */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-foreground">Order Summary</h3>

            <div className="space-y-2 border-b border-border/60 pb-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold text-foreground">Terminal Handling &amp; Maintenance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span className="font-semibold text-foreground">Monthly (30 Days)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setup Fee</span>
                <span className="text-emerald-500 font-semibold">FREE (₹0)</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs font-bold text-foreground">Total Payable</span>
              <span className="text-2xl font-black text-primary font-mono">₹1,999</span>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-3 space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Server className="h-3.5 w-3.5 text-primary" />
                What's Included:
              </div>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Isolated Cloud VPS Slot (No sharing)</li>
                <li>&lt; 3ms Low Latency Execution to GTCFX</li>
                <li>24/7 Uptime (No PC needed)</li>
                <li>Automated 5% Daily / 15% Max DD Guard</li>
                <li>Real-time trade sync &amp; audit logging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
