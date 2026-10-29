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
  AlertCircle,
  TrendingUp,
  Percent,
  Receipt,
  ExternalLink,
  Zap,
  Lock,
  Calendar,
} from "lucide-react";
import type { CopyTradingAffiliateInfo } from "@/server/actions/copy-trading.actions";
import { verifyAndSubmitBlockchainSettlementAction } from "@/server/actions/copy-trading.actions";
import { DynamicQrCode } from "@/components/ui/qr-code";

interface SettlementHubClientProps {
  invoices: any[];
  affiliateInfo?: CopyTradingAffiliateInfo;
}

const DEPOSIT_ADDRESS = "0x1Ca7cEbF067f1A0fdE2E09a3cf0D909B8c53d147";
const NETWORK_NAME = "BEP-20 (BNB Smart Chain)";

export function CopyTradingSettlementHubClient({
  invoices,
  affiliateInfo,
}: SettlementHubClientProps) {
  const router = useRouter();

  // Find if there is a pending invoice
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
  const firstPending = pendingInvoices[0];

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(firstPending ? firstPending.id : "CUSTOM");
  const [profitUsd, setProfitUsd] = useState<number>(firstPending ? firstPending.profitUsd : 100);
  const [txnHash, setTxnHash] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Calculations in USD (USDT)
  const activeProfitUsd = currentInvoice ? currentInvoice.profitUsd : profitUsd;
  const investorShareUsd = currentInvoice?.investorShareUsd || Number((activeProfitUsd * 0.70).toFixed(2));
  const affiliateShareUsd = currentInvoice?.affiliateShareUsd || Number((activeProfitUsd * 0.10).toFixed(2));
  const academyShareUsd = currentInvoice?.academyShareUsd || Number((activeProfitUsd - investorShareUsd - affiliateShareUsd).toFixed(2));
  const totalAmountDueUsd = currentInvoice?.totalAmountDueUsd || Number((academyShareUsd + affiliateShareUsd).toFixed(2));
  const activeDepositAddress = currentInvoice?.depositAddress || DEPOSIT_ADDRESS;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(activeDepositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyOnChain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = txnHash.trim();

    if (!cleanHash) {
      setFeedback({ type: "error", message: "Please enter your BEP-20 Transaction Hash (TxID)." });
      return;
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
      setFeedback({
        type: "error",
        message: "Invalid TxnHash format. Must start with '0x' and be 66 characters long.",
      });
      return;
    }

    setIsVerifying(true);
    setFeedback(null);
    setVerificationStep("Connecting to BNB Smart Chain RPC nodes...");

    try {
      await new Promise((r) => setTimeout(r, 800));
      setVerificationStep("Scanning block confirmation for recipient 0x1Ca7...147...");
      await new Promise((r) => setTimeout(r, 900));
      setVerificationStep("Verifying transfer & activating Monday copy trading cycle...");

      const res = await verifyAndSubmitBlockchainSettlementAction({
        invoiceId: currentInvoice ? currentInvoice.id : undefined,
        profitUsd: activeProfitUsd,
        txnHash: cleanHash,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Transaction verified! Eligible for Next Week's Cycle (Monday).",
        });
        setTxnHash("");
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setFeedback({ type: "error", message: res.message || "Failed to verify transaction on-chain." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error while connecting to blockchain node." });
    } finally {
      setIsVerifying(false);
      setVerificationStep(null);
    }
  };

  const isCycleEligible = !invoices.some((i) => i.status === "PENDING");

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
            Weekly Profit Sharing Settlement Gateway (USDT Only)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-1">
            Profit Share Settlement
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Official Policy: 70% Investor / 20% Academy / 10% Affiliate Partner. (0% fee charged until initial capital is recovered).
          </p>
        </div>

        {/* Monday Cycle Eligibility Status Pill */}
        <div>
          {isCycleEligible ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 block">Cycle Status</span>
                <span className="text-xs font-bold text-foreground">Eligible for Next Week Cycle (Monday)</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-500 block">Cycle Status</span>
                <span className="text-xs font-bold text-foreground">Action Required for Monday Cycle</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Settlement Alert */}
      {pendingInvoices.length > 0 && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Pending Weekly Settlement ({pendingInvoices.length} Due)
                <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  Monday Deadline
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Please settle the 30% profit share via USDT (BEP-20) below. Unsettled accounts are automatically excluded from trade copying in next week&apos;s cycle (starting Monday).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 70 / 20 / 10 Explanatory Cards in USD (USDT) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 70% Investor */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              70% YOUR RETAINED PROFIT
            </span>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ${investorShareUsd.toFixed(2)} <span className="text-xs font-bold text-emerald-500">USDT</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Directly kept in your MT5 trading balance (70% net profit).
          </p>
        </div>

        {/* 20% Academy */}
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              20% ACADEMY SHARE
            </span>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ${academyShareUsd.toFixed(2)} <span className="text-xs font-bold text-primary">USDT</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rahul Trade Warrior Academy platform &amp; master execution.
          </p>
        </div>

        {/* 10% Affiliate */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
              10% AFFILIATE PARTNER SHARE
            </span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ${affiliateShareUsd.toFixed(2)} <span className="text-xs font-bold text-amber-500">USDT</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Credited directly to referring partner&apos;s wallet upon settlement.
          </p>
        </div>
      </div>

      {/* Main Payment Section: USDT Blockchain Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form & QR Code */}
        <div className="md:col-span-2 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Pay Weekly Profit Share (30% USDT)
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
                            #{inv.invoiceNumber} (${(inv.totalAmountDueUsd || inv.profitUsd * 0.3).toFixed(2)} USDT)
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

            {/* Custom Profit Input */}
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
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Enter realized net profit made on your MT5 terminal for the week (70% kept by you, 30% payable).
                </p>
              </div>
            )}

            {/* Active Payment Method: USDT Only */}
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  ₮
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">USDT (Tether)</span>
                    <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                      {NETWORK_NAME}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Only BEP-20 accepted for weekly settlement</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Selected
              </span>
            </div>

            {/* Deposit Box: QR Code & BEP-20 Address */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Code */}
                <div className="shrink-0 rounded-xl border border-border bg-white p-2.5 shadow-sm flex items-center justify-center">
                  <DynamicQrCode
                    value={activeDepositAddress}
                    size={144}
                    alt="USDT BEP-20 Deposit QR"
                    className="w-36 h-36"
                  />
                </div>

                <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Send exact <strong className="text-foreground">${totalAmountDueUsd.toFixed(2)} USDT</strong>
                    </span>
                    <span className="rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                      BEP-20 Network
                    </span>
                  </div>

                  {/* Copyable Deposit Address */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block text-left">Deposit Address:</span>
                    <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <span className="font-mono text-xs font-bold text-foreground break-all select-all text-left">
                        {activeDepositAddress}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground text-xs shrink-0 ml-2"
                        title="Copy BEP-20 Address"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-left">
                    ⚠️ Send only via <strong>BNB Smart Chain (BEP-20)</strong>. Do not use TRC-20 or ERC-20 to avoid loss of funds.
                  </p>
                </div>
              </div>
            </div>

            {/* Blockchain TxnHash Auto-Verification Form */}
            <form onSubmit={handleVerifyOnChain} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Blockchain Transaction Hash (TxnHash / TxID) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={txnHash}
                  onChange={(e) => setTxnHash(e.target.value)}
                  placeholder="e.g. 0x8f23a41b59c8... (66-character BEP-20 transaction hash)"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary placeholder:font-normal placeholder:text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Paste the 66-character TxID from your Binance, MetaMask, TrustWallet, or Bybit withdrawal confirmation.
                </p>
              </div>

              {verificationStep && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-xs text-primary flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin shrink-0" />
                  <span>{verificationStep}</span>
                </div>
              )}

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
                disabled={isVerifying || !txnHash.trim()}
                className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 text-xs sm:text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Auto-Verifying On-Chain...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify on Blockchain &amp; Activate Next Week Cycle (${totalAmountDueUsd.toFixed(2)} USDT)
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
              Settlement Calculation (USD)
            </h3>

            <div className="space-y-2 border-b border-border/60 pb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Realized Net Profit</span>
                <span className="font-mono font-bold text-foreground">${activeProfitUsd.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investor Share (70%)</span>
                <span className="font-mono font-bold text-emerald-500">${investorShareUsd.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academy Share (20%)</span>
                <span className="font-mono font-bold text-primary">${academyShareUsd.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Affiliate Share (10%)</span>
                <span className="font-mono font-bold text-amber-500">${affiliateShareUsd.toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="font-bold text-foreground">Total Due (30%)</span>
              <span className="text-2xl font-black text-primary font-mono">
                ${totalAmountDueUsd.toFixed(2)} <span className="text-xs">USDT</span>
              </span>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-3 space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Monday Cycle Rule:
              </div>
              <p>
                Settlement must be verified before Monday market open. On-chain verified accounts are automatically added to the next week copy trading cycle.
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
              Settlement Invoices &amp; Blockchain Receipts ({invoices.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              All weekly profit sharing settlements for your trading account.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No settlement invoices found yet. Use the form above to submit your first weekly profit sharing settlement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Profit (USDT)</th>
                  <th className="px-4 py-3">70% Yours</th>
                  <th className="px-4 py-3">30% Due</th>
                  <th className="px-4 py-3">Cycle Status</th>
                  <th className="px-4 py-3 text-right">Blockchain TxID</th>
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
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      ${(inv.profitUsd || 0).toFixed(2)} USDT
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-500 font-bold">
                      ${(inv.investorShareUsd || inv.profitUsd * 0.70).toFixed(2)} USDT
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      ${(inv.totalAmountDueUsd || inv.profitUsd * 0.30).toFixed(2)} USDT
                    </td>
                    <td className="px-4 py-3">
                      {inv.status === "SETTLED" ? (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Eligible (Monday)
                        </span>
                      ) : inv.status === "PAID" ? (
                        <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Verifying On-Chain
                        </span>
                      ) : (
                        <span className="rounded-full bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Settlement Due
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.txnHash ? (
                        <a
                          href={`https://bscscan.com/tx/${inv.txnHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {inv.txnHash.slice(0, 6)}...{inv.txnHash.slice(-4)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
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
