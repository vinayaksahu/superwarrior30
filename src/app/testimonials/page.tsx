import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { getApprovedTestimonialsAction } from "@/server/actions/testimonial.actions";
import { TestimonialsSection } from "@/components/funnel/testimonials-section";
import { Sparkles, MessageSquarePlus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Testimonials & Reviews — Rahul Trade Warrior Academy",
  description:
    "Read real reviews, verified trading results, and P&L proof from students of Rahul Trade Warrior Academy and Super Warrior 30.",
};

export default async function TestimonialsPage() {
  const testimonials = await getApprovedTestimonialsAction("ALL");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <PublicNavbar />

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-16 pb-14 md:pt-24 md:pb-20 border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Verified Student Reviews & Trade Proofs</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Real Traders. Real Results.{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Verified Stories.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Discover how traders transformed their price-action psychology, mastered institutional liquidity, and achieved funded prop firm milestones with Rahul Trade Warrior Academy.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/testimonials"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Submit Your Review / P&L Proof</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-xs font-bold shadow transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span>Explore Masterclasses</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Testimonials Section */}
      <TestimonialsSection
        testimonials={testimonials.map((t) => ({
          id: t.id,
          studentName: t.studentName,
          content: t.content,
          photoUrl: t.photoUrl,
          rating: t.rating,
          isFeatured: t.isFeatured,
          tradingPlatform: t.tradingPlatform,
          accountType: t.accountType,
          tradingResult: t.tradingResult,
          experienceDuration: t.experienceDuration,
          isTestData: t.isTestData,
          createdAt: t.createdAt,
          screenshots: t.screenshots,
        }))}
        title="All Student Reviews & Trade Setups"
        subtitle="100% verified student feedback with chart proof and execution details"
      />

      {/* CTA Footer Section */}
      <section className="py-16 md:py-24 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Ready to Build Your Own Trading Success Story?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Join the Super Warrior 30 batch today and learn high-probability price-action strategies directly from Rahul Sir.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/super-warrior-30"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-xs font-bold text-primary-foreground shadow-xl transition-all hover:bg-primary/90"
            >
              <span>Join Super Warrior 30</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
