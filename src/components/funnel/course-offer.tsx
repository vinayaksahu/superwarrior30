"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
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
    "Complete structured course",
    "All course modules & video lessons",
    "PDF resources where applicable",
    "Practical chart-based learning",
    "Risk management training",
    "Trading psychology",
    "Full LMS access",
  ];

  return (
    <section id="offer" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        <div className="rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8 shadow-xl shadow-primary/5 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {courseTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete Trading Education Program
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
              <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
                {discount}% OFF — Save {formatCurrency(compareAtPrice! - price)}
              </span>
            )}
          </div>

          {/* Benefits list */}
          <div className="space-y-2.5 py-4 border-y border-border">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/checkout/${courseId}`}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            Super Warrior 30 Join करें
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Secure checkout • Instant access after payment</span>
          </div>
        </div>
      </div>
    </section>
  );
}
