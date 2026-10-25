"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  CreditCard,
  QrCode,
  Building,
  AlertCircle,
  TrendingUp,
  Percent,
} from "lucide-react";
import type { PaymentMethodItem } from "@/server/actions/payment-method.actions";
import { submitSettlementPaymentAction } from "@/server/actions/copy-trading.actions";

interface CopyTradingSettlementClientProps {
  invoice: any;
  paymentMethods: PaymentMethodItem[];
}

export function CopyTradingSettlementClient({
  invoice,
  paymentMethods,
}: CopyTradingSettlementClientProps) {
  const router = useRouter();

  const activeMethods = paymentMethods.filter((m) => m.isActive);
  const defaultMethod = activeMethods[0]?.id || "MANUAL_UPI";

  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultMethod);
  const [utrNumber, setUtrNumber] = useState(invoice.utrNumber || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedMethod = activeMethods.find((m) => m.id === selectedMethodId);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePaySettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setFeedback({ type: "error", message: "Please enter your payment UTR / Reference ID." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await submitSettlementPaymentAction({
        invoiceId: invoice.id,
        paymentMethod: selectedMethod?.title || selectedMethodId,
        utrNumber: utrNumber.trim(),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Settlement payment submitted successfully!",
        });
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setFeedback({ type: "error", message: res.message || "Failed to submit settlement." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = invoice.status === "PENDING";
  const isPaid = invoice.status === "PAID";
  const isSettled = invoice.status === "SETTLED";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/dashboard/copy-trading"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Copy Trading Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Weekly Settlement Invoice
            </span>
            <span className="text-xs font-mono text-muted-foreground">#{invoice.invoiceNumber}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Profit Sharing Settlement
          </h1>
          <p className="text-xs text-muted-foreground">
            Period: <strong className="text-foreground">{invoice.weekPeriod}</strong>
          </p>
        </div>

        <div>
          {isSettled && (
            <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Settled &amp; Completed
            </span>
          )}
          {isPaid && (
            <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Verification In Progress
            </span>
          )}
          {isPending && (
            <span className="rounded-full bg-primary/10 text-primary border border-primary/30 px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Payment Due
            </span>
          )}
        </div>
      </div>

      {/* 70 / 20 / 10 Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 70% Investor */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              70% Your Retained Profit
            </span>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{invoice.investorShareInr?.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Directly credited &amp; retained in your GTCFX trading balance.
          </p>
        </div>

        {/* 20% Academy */}
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              20% Academy Share
            </span>
            <Building className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{invoice.academyShareInr?.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rahul Trade Warrior Academy platform &amp; master execution.
          </p>
        </div>

        {/* 10% Affiliate */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
              10% Affiliate Partner Share
            </span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ₹{invoice.affiliateShareInr?.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Disbursed directly into the referring partner's affiliate wallet.
          </p>
        </div>
      </div>

      {/* Payment Gateway Box if PENDING */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Payment methods & UTR input */}
          <div className="md:col-span-2 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Pay Weekly Profit Share (30%)
              </h2>

              {/* Methods Selection Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeMethods.map((m) => (
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
                ))}
              </div>

              {/* Method Details Box */}
              <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
                {selectedMethod?.type === "UPI" || !selectedMethod ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="shrink-0 rounded-xl border border-border bg-white p-2.5 shadow-sm">
                      <img
                        src={
                          selectedMethod?.details?.qrCodeUrl ||
                          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${
                            selectedMethod?.details?.upiId || "superwarrior30@upi"
                          }&pn=SuperWarrior30&am=${invoice.totalAmountDueInr}&cu=INR`
                        }
                        alt="Settlement Payment QR"
                        className="h-36 w-36 object-contain"
                      />
                    </div>
                    <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Scan to Pay ₹{invoice.totalAmountDueInr?.toLocaleString("en-IN")} via UPI
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
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground block">Bank Name</span>
                        <span className="font-semibold text-foreground">{selectedMethod.details.bankName || "HDFC Bank"}</span>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground block">Account Number</span>
                        <span className="font-mono font-bold text-foreground">{selectedMethod.details.accountNumber || "50200012345678"}</span>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground block">IFSC Code</span>
                        <span className="font-mono font-bold text-foreground">{selectedMethod.details.ifsc || "HDFC0001234"}</span>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground block">Beneficiary</span>
                        <span className="font-semibold text-foreground">{selectedMethod.details.accountName || "SuperWarrior30"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit UTR Form */}
              <form onSubmit={handlePaySettlement} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Payment UTR / Transaction Reference Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter 12-digit UTR from payment receipt"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
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
                      Submitting Settlement...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Confirm Payment of ₹{invoice.totalAmountDueInr?.toLocaleString("en-IN")}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Summary */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm text-xs">
              <h3 className="font-bold text-sm text-foreground">Settlement Summary</h3>
              <div className="space-y-2 border-b border-border/60 pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realized Profit (USD)</span>
                  <span className="font-bold text-foreground font-mono">${invoice.profitUsd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realized Profit (INR)</span>
                  <span className="font-bold text-foreground font-mono">₹{invoice.profitInr?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor Share (70%)</span>
                  <span className="font-bold text-emerald-500 font-mono">₹{invoice.investorShareInr?.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="font-bold text-foreground">Total Due (30%)</span>
                <span className="text-2xl font-black text-primary font-mono">
                  ₹{invoice.totalAmountDueInr?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If already PAID or SETTLED */}
      {(isPaid || isSettled) && (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {isSettled ? "Settlement Fully Completed" : "Payment Submitted Successfully"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isSettled
              ? `This invoice was settled on ${new Date(invoice.settledAt || Date.now()).toLocaleDateString("en-IN")}. The 10% affiliate commission has been credited to your referrer.`
              : `Your payment reference (${invoice.utrNumber || "UTR"}) has been received. Our team will verify and finalize the affiliate distribution shortly.`}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/copy-trading"
              className="rounded-lg bg-primary text-primary-foreground font-bold px-4 py-2 text-xs hover:bg-primary/90 transition-colors inline-block"
            >
              Return to Copy Trading Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
