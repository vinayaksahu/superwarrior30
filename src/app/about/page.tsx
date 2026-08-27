import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { Award, ShieldCheck, Target, TrendingUp, BookOpen, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — Rahul Trade Warrior Academy",
  description: "Learn about Rahul Trade Warrior Academy, our institutional price-action methodology, and our mission to provide structured trading mentorship.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <Target className="h-3.5 w-3.5" />
            <span>Our Educational Mission</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Structured Trading Education Built on Realistic Execution
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Super Warrior 30 was created to demystify complex financial markets through clean price-action analysis,
            disciplined risk models, and practical trade setup frameworks.
          </p>
        </div>
      </section>

      {/* Core Philosophy */}
      <section className="py-16 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-4xl space-y-12">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Capital Preservation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trading is a game of survival before profitability. We prioritize strict mathematical risk control on every setup.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Price Action First</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We trade market microstructure, liquidity sweeps, and price behavior rather than relying on delayed lagging indicators.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Disciplined Process</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sustainable trading is achieved through repeatable journaling, systematic rules, and emotional detachment.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Our Mentorship Philosophy</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We do not promote overnight wealth or unrealistic get-rich-quick promises. Financial markets require patience,
              rigorous risk containment, and a solid statistical edge. Our masterclasses are designed to equip you with the practical
              skills required to navigate volatility across index options, equities, and commodities.
            </p>
            <div className="pt-4">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                Browse Masterclasses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Super Warrior 30. All rights reserved.</p>
      </footer>
    </div>
  );
}
