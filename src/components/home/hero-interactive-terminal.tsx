"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Award,
  Zap,
  ArrowRight,
  Activity,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  BarChart3,
  Flame,
  Star,
  Users,
} from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
}

const LIVE_TICKERS: TickerItem[] = [
  { symbol: "XAU/USD", name: "Gold", price: "$2,748.40", change: "+1.42%", isPositive: true },
  { symbol: "EUR/USD", name: "Euro", price: "1.08250", change: "+0.38%", isPositive: true },
  { symbol: "BTC/USD", name: "Bitcoin", price: "$68,450.00", change: "+3.25%", isPositive: true },
  { symbol: "NIFTY 50", name: "India Index", price: "24,850.20", change: "+0.65%", isPositive: true },
  { symbol: "US30", name: "Dow Jones", price: "42,380.00", change: "+0.45%", isPositive: true },
];

export function HeroInteractiveTerminal() {
  const [activeTab, setActiveTab] = useState<"EXECUTION" | "LIQUIDITY" | "RISK">("EXECUTION");

  return (
    <div className="w-full space-y-8 pt-4">
      {/* 1. Live Market Pulse Ticker Bar */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-border/50 px-4 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Live Institutional Liquidity Feed
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            Smart Money Concepts • Zero-Lag Framework
          </span>
        </div>

        {/* Ticker Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/50 p-2 sm:p-0">
          {LIVE_TICKERS.map((t) => (
            <div
              key={t.symbol}
              className="px-3 py-2.5 text-center flex flex-col justify-center transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-black text-foreground">{t.symbol}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-[11px] mt-0.5 font-bold">
                <span className="text-foreground/90">{t.price}</span>
                <span
                  className={
                    t.isPositive
                      ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                      : "text-rose-700 dark:text-rose-400 font-extrabold"
                  }
                >
                  {t.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Interactive Terminal Mockup Card */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xl shadow-primary/5 transition-all space-y-6">
        {/* Terminal Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                PRO SETUP
              </span>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                EUR/USD — Institutional Liquidity Sweep (M15)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Mechanical Entry: Asian High/Low Purge → Order Block Tap → Target 1:3.8 R:R
            </p>
          </div>

          {/* Interactive Navigation Pills */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("EXECUTION")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "EXECUTION"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Execution Card
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LIQUIDITY")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "LIQUIDITY"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Liquidity Zones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("RISK")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "RISK"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Risk Math
            </button>
          </div>
        </div>

        {/* Tab 1: Execution Card */}
        {activeTab === "EXECUTION" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Order Type
                </span>
                <p className="text-sm font-black text-foreground">Sell Limit (Short)</p>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  Confirmed Shift
                </span>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Entry Trigger
                </span>
                <p className="text-sm font-black text-foreground">1.08250</p>
                <span className="text-[10px] font-medium text-muted-foreground">
                  M15 Fair Value Gap
                </span>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Stop Loss (Tight)
                </span>
                <p className="text-sm font-black text-rose-700 dark:text-rose-400">
                  1.08380 (13 Pips)
                </p>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Above Liquidity Pool
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Take Profit Target
                </span>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  1.07750 (50 Pips)
                </p>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  1 : 3.85 RRR Hit ✓
                </span>
              </div>
            </div>

            {/* Visual Risk vs Reward Bar */}
            <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Risk: 13 Pips (1.0% Capital)
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-black">
                  Reward: 50 Pips (+3.85% Gain)
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/80">
                <div className="h-full bg-rose-500/80 w-[20%]" title="Risk: 13 Pips" />
                <div
                  className="h-full bg-emerald-500 shadow-sm transition-all w-[80%]"
                  title="Reward: 50 Pips"
                />
              </div>

              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Mathematical Edge: By winning just 4 out of 10 trades with 1:3.8 R:R, your account grows exponentially.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Liquidity Zones */}
        {activeTab === "LIQUIDITY" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <Zap className="h-4 w-4" />
                  <span>1. Liquidity Pool Sweep</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Retail stop losses sitting above the Asian Session High are targeted by institutional algorithms before the true move begins.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs">
                  <Activity className="h-4 w-4" />
                  <span>2. Displacement & FVG</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aggressive institutional sell orders cause rapid displacement, leaving a clear Fair Value Gap (imbalance) for our limit entry.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <TrendingUp className="h-4 w-4" />
                  <span>3. Clean Delivery to TP</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Price reaches external range liquidity at prior day lows with zero drawdown, fulfilling the complete 1:3.85 setup.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Risk Math */}
        {activeTab === "RISK" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-3">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                The Super Warrior Risk Management Rules
              </h4>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <span className="font-extrabold text-foreground">Rule 1: Strict 1-2% Max</span>
                  <p className="text-muted-foreground text-[11px]">
                    Never risk more than 1-2% of total equity on any single idea.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <span className="font-extrabold text-foreground">Rule 2: Two-Loss Limit</span>
                  <p className="text-muted-foreground text-[11px]">
                    Hit 2 consecutive losses? Screen closes immediately. No revenge trades.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <span className="font-extrabold text-foreground">Rule 3: Partial Securing</span>
                  <p className="text-muted-foreground text-[11px]">
                    Bank 50% profit at 1:2 R:R and move stop to breakeven for risk-free runners.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Fast Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Master this exact institutional framework inside Super Warrior 30 Mentorship</span>
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            Explore Masterclass Curriculum
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 3. Proof & Trust Strip */}
      <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-1 text-amber-500 dark:text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </div>
          <p className="text-sm font-black text-foreground">4.9 / 5 Rating</p>
          <span className="text-[11px] text-muted-foreground">1,250+ Verified Reviews</span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center space-y-1">
          <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-black text-foreground">5,000+ Enrolled</p>
          <span className="text-[11px] text-muted-foreground">Active Student Community</span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center space-y-1">
          <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-black text-foreground">1:3+ Min R:R</p>
          <span className="text-[11px] text-muted-foreground">Mathematical Edge</span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center space-y-1">
          <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-black text-foreground">₹500 Min Payout</p>
          <span className="text-[11px] text-muted-foreground">Instant Affiliate Wallet</span>
        </div>
      </div>
    </div>
  );
}
