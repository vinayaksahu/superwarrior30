"use client";

import { useState, useTransition } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Calculator,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  TrendingDown,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AcademyRiskRules,
  CalculatedRiskState,
  StudentRiskData,
  StudentRiskProfile,
} from "@/types/risk-manager";
import { saveStudentRiskProfileAction } from "@/server/actions/risk-manager.actions";

interface RiskManagerViewProps {
  initialData: StudentRiskData;
}

export function RiskManagerView({ initialData }: RiskManagerViewProps) {
  const [isPending, startTransition] = useTransition();
  const [rules] = useState<AcademyRiskRules>(initialData.rules);

  // Editable Profile State
  const [balance, setBalance] = useState<string>(String(initialData.profile.accountBalance));
  const [riskPct, setRiskPct] = useState<string>(String(initialData.profile.riskPerTradePercent));
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>(String(initialData.profile.maxDailyLoss));
  const [maxWeeklyLoss, setMaxWeeklyLoss] = useState<string>(String(initialData.profile.maxWeeklyLoss));

  // Calculated Real-time Metrics State
  const [calculated, setCalculated] = useState<CalculatedRiskState>(initialData.calculated);

  // Recalculate live when student changes inputs
  const computeLiveMetrics = (
    balStr: string,
    pctStr: string,
    dailyStr: string,
    weeklyStr: string
  ) => {
    const numBal = Math.max(1, parseFloat(balStr) || 0);
    const numPct = Math.max(0.1, parseFloat(pctStr) || 0);
    const numDaily = Math.max(1, parseFloat(dailyStr) || 0);

    const riskDollar = Math.round(numBal * (numPct / 100) * 100) / 100;
    const maxTrades =
      riskDollar > 0
        ? Math.min(Math.max(1, Math.floor(numDaily / riskDollar)), rules.maxTradesPerDay || 3)
        : rules.maxTradesPerDay;

    const buffer = Math.max(0, Math.round((numDaily - riskDollar) * 100) / 100);
    const remaining = Math.max(0, Math.round((numDaily - calculated.usedToday) * 100) / 100);

    let status = calculated.status;
    let statusMessage = calculated.statusMessage;

    if (calculated.isLLRuleBreached) {
      status = "BREACHED";
      statusMessage = `LL RULE BREACHED — ${calculated.consecutiveLossesToday} consecutive losses! Stop trading for the day.`;
    } else if (remaining <= 0 && calculated.usedToday > 0) {
      status = "BREACHED";
      statusMessage = "MAX DAILY LOSS REACHED — Stop trading for the day to preserve capital.";
    } else if (calculated.tradesTakenToday >= maxTrades) {
      status = "BREACHED";
      statusMessage = `MAX TRADES REACHED — ${calculated.tradesTakenToday}/${maxTrades} trades completed today.`;
    } else if (calculated.usedToday > 0 || calculated.tradesTakenToday >= maxTrades - 1) {
      status = "WARNING";
      statusMessage = "WARNING — Approaching risk limits. Follow discipline rules strictly.";
    } else {
      status = "SAFE";
      statusMessage = "SAFE — Risk within limits.";
    }

    return {
      riskPerTradeDollars: riskDollar,
      maxTradesPerDay: maxTrades,
      dailyBuffer: buffer,
      remainingRisk: remaining,
      status,
      statusMessage,
    };
  };

  const handleApplyChanges = () => {
    const numBal = Math.max(1, parseFloat(balance) || 70);
    const numPct = Math.max(0.5, Math.min(50, parseFloat(riskPct) || 4));
    const numDaily = Math.max(1, parseFloat(maxDailyLoss) || 6);
    const numWeekly = Math.max(1, parseFloat(maxWeeklyLoss) || 15);

    const updatedProfile: StudentRiskProfile = {
      accountBalance: numBal,
      riskPerTradePercent: numPct,
      maxDailyLoss: numDaily,
      maxWeeklyLoss: numWeekly,
    };

    startTransition(async () => {
      try {
        const res = await saveStudentRiskProfileAction(updatedProfile);
        if (res.success) {
          toast.success("🛡️ Risk parameters updated successfully!");
          const recomputed = computeLiveMetrics(
            String(numBal),
            String(numPct),
            String(numDaily),
            String(numWeekly)
          );
          setCalculated((prev) => ({
            ...prev,
            ...recomputed,
          }));
        } else {
          toast.error(res.error || "Failed to save risk parameters");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error saving parameters");
      }
    });
  };

  const numBal = parseFloat(balance) || 70;
  const numPct = parseFloat(riskPct) || 4;
  const currentRiskDollar = (numBal * numPct) / 100;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Risk Manager
            </h2>
            <p className="text-xs text-muted-foreground">
              Automated capital preservation, daily loss prevention &amp; academy discipline enforcement.
            </p>
          </div>
        </div>

        {calculated.isLLRuleBreached && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-400 flex items-center gap-2 animate-pulse">
            <XCircle className="h-4 w-4" />
            <span>LL Rule Active — Trading Blocked for Today</span>
          </div>
        )}
      </div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* LEFT CARD: ⚙️ Risk Parameters */}
        {/* ========================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <span>⚙️</span>
              <span>Risk Parameters</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Personal Capital Settings</span>
          </div>

          <div className="space-y-4">
            {/* Account Balance */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                ACCOUNT BALANCE ($)
              </label>
              <input
                type="number"
                step="any"
                value={balance}
                onChange={(e) => {
                  setBalance(e.target.value);
                  const next = computeLiveMetrics(e.target.value, riskPct, maxDailyLoss, maxWeeklyLoss);
                  setCalculated((prev) => ({ ...prev, ...next }));
                }}
                placeholder="70"
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              />
            </div>

            {/* Risk Per Trade */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                RISK PER TRADE (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="50"
                value={riskPct}
                onChange={(e) => {
                  setRiskPct(e.target.value);
                  const next = computeLiveMetrics(balance, e.target.value, maxDailyLoss, maxWeeklyLoss);
                  setCalculated((prev) => ({ ...prev, ...next }));
                }}
                placeholder="4"
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              />
            </div>

            {/* Max Daily Loss */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                MAX DAILY LOSS ($)
              </label>
              <input
                type="number"
                step="any"
                value={maxDailyLoss}
                onChange={(e) => {
                  setMaxDailyLoss(e.target.value);
                  const next = computeLiveMetrics(balance, riskPct, e.target.value, maxWeeklyLoss);
                  setCalculated((prev) => ({ ...prev, ...next }));
                }}
                placeholder="6"
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              />
            </div>

            {/* Max Weekly Loss */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                MAX WEEKLY LOSS ($)
              </label>
              <input
                type="number"
                step="any"
                value={maxWeeklyLoss}
                onChange={(e) => setMaxWeeklyLoss(e.target.value)}
                placeholder="15"
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              />
            </div>
          </div>

          {/* Apply Changes Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleApplyChanges}
            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 py-3 text-xs font-black text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Apply Changes</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* RIGHT CARD: 📊 Calculated Risk */}
        {/* ========================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <span>📊</span>
                <span>Calculated Risk</span>
              </h3>
              <span className="text-[11px] font-bold text-muted-foreground">
                {calculated.tradesTakenToday} trades taken today
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-3 pt-4">
              {/* Row 1: 3 boxes */}
              <div className="grid grid-cols-3 gap-3">
                {/* RISK $ / TRADE */}
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    RISK $ / TRADE
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-rose-500 mt-2">
                    ${calculated.riskPerTradeDollars.toFixed(2)}
                  </p>
                </div>

                {/* MAX TRADES / DAY */}
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    MAX TRADES / DAY
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-sky-400 mt-2">
                    {calculated.maxTradesPerDay}
                  </p>
                </div>

                {/* DAILY BUFFER */}
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    DAILY BUFFER
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                    ${calculated.dailyBuffer.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Row 2: 2 boxes */}
              <div className="grid grid-cols-2 gap-3">
                {/* USED TODAY */}
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    USED TODAY
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-orange-400 mt-2">
                    ${calculated.usedToday.toFixed(2)}
                  </p>
                </div>

                {/* REMAINING RISK */}
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    REMAINING RISK
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                    ${calculated.remainingRisk.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Indicator Bar */}
          <div className="pt-4">
            <div
              className={`w-full rounded-2xl border p-3.5 flex items-center justify-center gap-2.5 text-xs font-black transition-all ${
                calculated.status === "BREACHED"
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/10"
                  : calculated.status === "WARNING"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  calculated.status === "BREACHED"
                    ? "bg-rose-500 animate-ping"
                    : calculated.status === "WARNING"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
              <span>{calculated.statusMessage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM SECTION: ⚠️ Risk Rules */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <span>⚠️</span>
            <span>Risk Rules</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">Enforced by Super Warrior 30 Mentors</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Rule 1: LL Rule (Blue left border) */}
          <div className="rounded-2xl border border-border bg-muted/15 p-4 border-l-4 border-l-blue-500 space-y-1">
            <h4 className="text-xs font-black text-blue-400">{rules.llRuleTitle}</h4>
            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
              {rules.maxConsecutiveLosses} consecutive losses → stop trading for the day. No exceptions.
            </p>
          </div>

          {/* Rule 2: No Revenge (Red left border) */}
          <div className="rounded-2xl border border-border bg-muted/15 p-4 border-l-4 border-l-rose-500 space-y-1">
            <h4 className="text-xs font-black text-rose-400">{rules.noRevengeTitle}</h4>
            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
              {rules.revengeBreakMinutes} min mandatory break after a loss. Trade only when neutral.
            </p>
          </div>

          {/* Rule 3: Max Risk (Green left border) */}
          <div className="rounded-2xl border border-border bg-muted/15 p-4 border-l-4 border-l-emerald-500 space-y-1">
            <h4 className="text-xs font-black text-emerald-400">
              Max Risk ${currentRiskDollar.toFixed(2)}
            </h4>
            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
              Max ${currentRiskDollar.toFixed(2)} risk per trade ({numPct}%). Min 1:{rules.minRiskRewardRatio} RRR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
