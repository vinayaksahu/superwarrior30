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
  Receipt,
  ExternalLink,
} from "lucide-react";
import type { PaymentMethodItem } from "@/server/actions/payment-method.actions";
import type { CopyTradingAffiliateInfo } from "@/server/actions/copy-trading.actions";
import {
  submitSettlementPaymentAction,
  submitDirectSettlementPaymentAction,
} from "@/server/actions/copy-trading.actions";

interface SettlementHubClientProps {
  invoices: any[];
  paymentMethods: PaymentMethodItem[];
  affiliateInfo?: CopyTradingAffiliateInfo;
}

export function CopyTradingSettlementHubClient({
  invoices,
  paymentMethods,
  affiliateInfo,
}: SettlementHubClientProps) {
  const router = useRouter();

  const activeMethods = paymentMethods.filter((m) => m.isActive);
  const defaultMethod = activeMethods[0]?.id || "MANUAL_UPI";

  // Check if there is an existing pending invoice to preselect
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
  const firstPending = pendingInvoices[0];

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(firstPending ? firstPending.id : "CUSTOM");
  const [profitUsd, setProfitUsd] = useState<number>(firstPending ? firstPending.profitUsd : 100);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultMethod);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedMethod = activeMethods.find((m) => m.id === selectedMethodId);
  const currentInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // When user switches invoice from dropdown
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId === "CUSTOM") {
      setProfitUsd(100);
    } else {
      const inv = invoices.find((i) => i.id === invId);
      if (inv) {
        setProfitUsd(inv.profitUsd);
      }
    }
  };

  // Calculations
  const rate = 86.5;
  const activeProfitUsd = currentInvoice ? currentInvoice.profitUsd : profitUsd;
  const profitInr = currentInvoice ? currentInvoice.profitInr : Number((activeProfitUsd * rate).toFixed(2));
  const investorShareInr = currentInvoice ? currentInvoice.investorShareInr : Number((profitInr * 0.70).toFixed(2));
  const affiliateShareInr = currentInvoice ? currentInvoice.affiliateShareInr : Number((profitInr * 0.10).toFixed(2));
  const academyShareInr = currentInvoice ? currentInvoice.academyShareInr : Number((profitInr - investorShareInr - affiliateShareInr).toFixed(2));
  const totalAmountDueInr = currentInvoice ? currentInvoice.totalAmountDueInr : Number((academyShareInr + affiliateShareInr).toFixed(2));

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setFeedback({ type: "error", message: "Please enter the UTR or Transaction Reference number." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (currentInvoice) {
        // Paying an existing invoice
        const res = await submitSettlementPaymentAction({
          invoiceId: currentInvoice.id,
          paymentMethod: selectedMethod?.title || selectedMethodId,
          utrNumber: utrNumber.trim(),
        });

        if (res.success) {
          setFeedback({
            type: "success",
            message: res.message || "Settlement payment submitted successfully!",
          });
          setUtrNumber("");
          setTimeout(() => {
            router.refresh();
          }, 1500);
        } else {
          setFeedback({ type: "error", message: res.message || "Failed to submit settlement." });
        }
      } else {
        // Direct custom settlement payment
        const res = await submitDirectSettlementPaymentAction({
          profitUsd: activeProfitUsd,
          paymentMethod: selectedMethod?.title || selectedMethodId,
          utrNumber: utrNumber.trim(),
        });

        if (res.success) {
          setFeedback({
            type: "success",
            message: res.message || "Settlement payment submitted successfully!",
          });
          setUtrNumber("");
          setTimeout(() => {
            router.refresh();
          }, 1500);
        } else {
          setFeedback({ type: "error", message: res.message || "Failed to submit settlement." });
        }
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation */}
      <div>
        <Link
          href="/dashboard/copy-trading"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Copy Trading Terminal
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <DollarSign className="h-4 w-4" />
            Weekly Settlement &amp; Profit Sharing Gateway
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-1">
            Profit Share Settlement
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Official Policy: 70% Investor / 20% Academy / 10% Affiliate Partner. (0% fee charged until initial capital is recovered).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/copy-trading/checkout"
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cloud VPS Hosting →
          </Link>
        </div>
      </div>

      {/* Pending Settlement Invoices Alert Banner */}
      {pendingInvoices.length > 0 && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Pending Weekly Settlement ({pendingInvoices.length} Due)
                <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  Action Required
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {pendingInvoices.length} pending weekly settlement invoice(s). Settle the 30% share below to keep copy trading active without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 70 / 20 / 10 Explanatory Cards */}
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
            ₹{investorShareInr.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Directly kept in your MT5 trading balance (70% net profit).
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
            ₹{academyShareInr.toLocaleString("en-IN")}
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
            ₹{affiliateShareInr.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Credited directly to referring partner's wallet upon settlement.
          </p>
        </div>
      </div>

      {/* Main Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form & QR Code */}
        <div className="md:col-span-2 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Pay Weekly Profit Share (30%)
              </h2>

              {/* Invoice Selector */}
              {invoices.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Invoice:</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground font-medium"
                  >
                    {pendingInvoices.length > 0 && (
                      <optgroup label="Pending Invoices">
                        {pendingInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            #{inv.invoiceNumber} (₹{inv.totalAmountDueInr})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="CUSTOM">Custom Realized Profit Amount</option>
                    {invoices
                      .filter((i) => i.status !== "PENDING")
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          #{inv.invoiceNumber} ({inv.status})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* If Custom Profit Input */}
            {selectedInvoiceId === "CUSTOM" && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Weekly Realized Net Profit (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={profitUsd}
                    onChange={(e) => setProfitUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 150"
                    className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Enter the realized net profit made on your MT5 terminal for the week. (70% is yours, 30% is payable).
                </p>
              </div>
            )}

            {/* Payment Methods Tabs */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground block">Select Payment Mode</span>
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
            </div>

            {/* Details Box: QR Code / Bank Info */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
              {selectedMethod?.type === "UPI" || !selectedMethod ? (
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="shrink-0 rounded-xl border border-border bg-white p-2.5 shadow-sm">
                    <img
                      src={
                        selectedMethod?.details?.qrCodeUrl ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${
                          selectedMethod?.details?.upiId || "superwarrior30@upi"
                        }&pn=SuperWarrior30&am=${totalAmountDueInr}&cu=INR`
                      }
                      alt="Settlement Payment QR"
                      className="h-36 w-36 object-contain"
                    />
                  </div>

                  <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Scan to Pay ₹{totalAmountDueInr.toLocaleString("en-IN")} via any UPI App
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
              ) : (
                <div className="space-y-3 text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    NEFT / IMPS Bank Transfer
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-card border border-border rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Bank Name</span>
                      <span className="font-semibold text-foreground">{selectedMethod.details.bankName || "HDFC Bank"}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Beneficiary</span>
                      <span className="font-semibold text-foreground">{selectedMethod.details.accountName || "SuperWarrior30"}</span>
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
              )}
            </div>

            {/* Submit UTR Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Payment UTR / Transaction Reference Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Enter 12-digit UTR from payment screen"
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
                    Confirm Payment of ₹{totalAmountDueInr.toLocaleString("en-IN")}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm text-xs">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Settlement Calculation
            </h3>

            <div className="space-y-2 border-b border-border/60 pb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Realized Net Profit</span>
                <span className="font-mono font-bold text-foreground">${activeProfitUsd} (₹{profitInr.toLocaleString("en-IN")})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investor Share (70%)</span>
                <span className="font-mono font-bold text-emerald-500">₹{investorShareInr.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academy Share (20%)</span>
                <span className="font-mono font-bold text-primary">₹{academyShareInr.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Affiliate Share (10%)</span>
                <span className="font-mono font-bold text-amber-500">₹{affiliateShareInr.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="font-bold text-foreground">Total Due (30%)</span>
              <span className="text-2xl font-black text-primary font-mono">
                ₹{totalAmountDueInr.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-3 space-y-2 text-[11px] text-muted-foreground">
              <p>
                <strong>Note:</strong> Your 70% share remains in your trading account. The 30% portion is paid here so Academy (20%) and Affiliate partner (10%) receive their weekly sharing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Invoices History Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-0">
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-accent/20">
          <div>
            <h3 className="font-semibold text-xs text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Settlement Invoices &amp; Receipts History ({invoices.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              All weekly profit sharing settlements for your trading account.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No settlement invoices found yet. Use the form above to make your first weekly profit sharing settlement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Profit ($ / ₹)</th>
                  <th className="px-4 py-3">70% Yours</th>
                  <th className="px-4 py-3">30% Payable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.weekPeriod}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-foreground block">${inv.profitUsd}</span>
                      <span className="text-[10px] text-muted-foreground">₹{inv.profitInr?.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">
                      ₹{inv.investorShareInr?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      ₹{inv.totalAmountDueInr?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {inv.status === "SETTLED" ? (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Settled
                        </span>
                      ) : inv.status === "PAID" ? (
                        <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Paid (Verifying)
                        </span>
                      ) : (
                        <span className="rounded-full bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-bold">
                          Due
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/copy-trading/settlement/${inv.id}`}
                        className="rounded px-2.5 py-1 bg-accent/60 hover:bg-accent text-foreground text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
