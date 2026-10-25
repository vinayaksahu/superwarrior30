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
} from "lucide-react";
import { verifyAndSubmitBlockchainSettlementAction } from "@/server/actions/copy-trading.actions";

interface CopyTradingSettlementClientProps {
  invoice: any;
}

const DEPOSIT_ADDRESS = "0x1Ca7cEbF067f1A0fdE2E09a3cf0D909B8c53d147";
const NETWORK_NAME = "BEP-20 (BNB Smart Chain)";

export function CopyTradingSettlementClient({
  invoice,
}: CopyTradingSettlementClientProps) {
  const router = useRouter();

  const [txnHash, setTxnHash] = useState(invoice.txnHash || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const profitUsd = invoice.profitUsd || 100;
  const investorShareUsd = invoice.investorShareUsd || Number((profitUsd * 0.70).toFixed(2));
  const affiliateShareUsd = invoice.affiliateShareUsd || Number((profitUsd * 0.10).toFixed(2));
  const academyShareUsd = invoice.academyShareUsd || Number((profitUsd - investorShareUsd - affiliateShareUsd).toFixed(2));
  const totalAmountDueUsd = invoice.totalAmountDueUsd || Number((academyShareUsd + affiliateShareUsd).toFixed(2));

  const handleCopy = () => {
    navigator.clipboard.writeText(DEPOSIT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
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
    setVerificationStep("Connecting to BNB Smart Chain RPC node...");

    try {
      await new Promise((r) => setTimeout(r, 800));
      setVerificationStep("Scanning block confirmation for recipient 0x1Ca7...147...");
      await new Promise((r) => setTimeout(r, 900));
      setVerificationStep("Verifying transfer & activating Monday copy trading cycle...");

      const res = await verifyAndSubmitBlockchainSettlementAction({
        invoiceId: invoice.id,
        txnHash: cleanHash,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Transaction verified on-chain! Your account is eligible for Monday cycle.",
        });
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setFeedback({ type: "error", message: res.message || "Failed to verify on blockchain." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setIsVerifying(false);
      setVerificationStep(null);
    }
  };

  const isPending = invoice.status === "PENDING";
  const isSettled = invoice.status === "SETTLED";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/dashboard/copy-trading/settlement"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settlement Hub
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Weekly Settlement Invoice (USDT)
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
          {isSettled ? (
            <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Eligible for Next Week Cycle (Monday)
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Action Required: Settle to Qualify for Monday
            </span>
          )}
        </div>
      </div>

      {/* 70 / 20 / 10 Breakdown Cards in USD (USDT) */}
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

      {/* Payment Gateway Box if PENDING */}
      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Pay 30% USDT via Blockchain Gateway
              </h2>

              {/* USDT Method Header */}
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    ₮
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">USDT (Tether)</span>
                    <span className="text-[11px] text-muted-foreground">{NETWORK_NAME}</span>
                  </div>
                </div>
                <span className="rounded bg-primary/20 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                  BEP-20 Only
                </span>
              </div>

              {/* Deposit Details Box */}
              <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="shrink-0 rounded-xl border border-border bg-white p-2.5 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${DEPOSIT_ADDRESS}`}
                      alt="USDT Deposit QR"
                      className="h-36 w-36 object-contain"
                    />
                  </div>
                  <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Send exact <strong className="text-foreground">${totalAmountDueUsd.toFixed(2)} USDT</strong>
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block text-left">BEP-20 Address:</span>
                      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                        <span className="font-mono text-xs font-bold text-foreground break-all select-all text-left">
                          {DEPOSIT_ADDRESS}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground text-xs shrink-0 ml-2"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit TxnHash Form */}
              <form onSubmit={handleVerify} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Blockchain Transaction Hash (TxnHash / TxID) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={txnHash}
                    onChange={(e) => setTxnHash(e.target.value)}
                    placeholder="e.g. 0x8f23a... (66-character BEP-20 transaction hash)"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
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
                      Verify on Blockchain &amp; Qualify for Next Week Cycle (${totalAmountDueUsd.toFixed(2)} USDT)
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
                Settlement Summary (USDT)
              </h3>
              <div className="space-y-2 border-b border-border/60 pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realized Net Profit</span>
                  <span className="font-bold text-foreground font-mono">${profitUsd.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor Share (70%)</span>
                  <span className="font-bold text-emerald-500 font-mono">${investorShareUsd.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academy Share (20%)</span>
                  <span className="font-bold text-primary font-mono">${academyShareUsd.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affiliate Share (10%)</span>
                  <span className="font-bold text-amber-500 font-mono">${affiliateShareUsd.toFixed(2)} USDT</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="font-bold text-foreground">Total Due (30%)</span>
                <span className="text-2xl font-black text-primary font-mono">
                  ${totalAmountDueUsd.toFixed(2)} <span className="text-xs">USDT</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If SETTLED */}
      {isSettled && (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Settlement Verified On-Chain!
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your payment was confirmed on BNB Smart Chain. You are fully eligible for next week&apos;s copy trading cycle (starting Monday).
          </p>
          {invoice.txnHash && (
            <div className="pt-1">
              <a
                href={`https://bscscan.com/tx/${invoice.txnHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline inline-flex items-center gap-1 font-mono font-bold"
              >
                View on BscScan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <div className="pt-3">
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
