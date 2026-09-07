"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck, Brain, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CourseOfferProps {
  courseId: string;
  courseTitle: string;
  price: number;
  compareAtPrice: number | null;
}

export function CourseOffer({ courseId, courseTitle, price, compareAtPrice }: CourseOfferProps) {
  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;

  const benefits = [
    "80% Trading Psychology Blueprint (Zero Revenge Trading, No FOMO)",
    "Strict Risk & Money Management System (Fixed 1-2% Risk per trade)",
    "1:2 to 1:3+ Risk-to-Reward Formula (50% Win Rate पर भी भारी प्रॉफिट)",
    "Position Sizing & Lot Size Calculation Masterclass",
    "20% High-Probability Price Action (Zero Paid Indicators, Pure Charts)",
    "Market Structure, Liquidity Sweeps & Smart Money Trap Recognition",
    "Live Chart Practical Analysis & Trade Execution Framework",
    "Professional Trading Journal & Discipline Checklist",
    "Lifetime Access on Web & Mobile LMS",
  ];

  return (
    <section id="offer" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        <div className="rounded-3xl border-2 border-primary/40 bg-card p-6 sm:p-9 shadow-2xl shadow-primary/10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3.5 py-1 text-xs font-bold text-primary">
              <Brain className="h-3.5 w-3.5" />
              <span>80% Psychology • 20% Technicals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              {courseTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Professional Trader Mindset & Capital Protection Program
            </p>
          </div>

          {/* Price */}
          <div className="text-center space-y-1">
            <div className="flex items-baseline justify-center gap-3">
              <span className="text-4xl sm:text-5xl font-black text-primary">
                {formatCurrency(price)}
              </span>
              {compareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(compareAtPrice)}
                </span>
              )}
            </div>
            {discount && (
              <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-500">
                {discount}% OFF — Save {formatCurrency(compareAtPrice! - price)}
              </span>
            )}
          </div>

          {/* Benefits list */}
          <div className="space-y-3 py-4 border-y border-border/60">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-medium text-foreground">{b}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/checkout/${courseId}`}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-[1.01] transition-all"
          >
            Super Warrior 30 Join करें
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Secure checkout • Instant access to LMS dashboard</span>
          </div>
        </div>
      </div>
    </section>
  );
}
