import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getApprovedTestimonialsAction } from "@/server/actions/testimonial.actions";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { FunnelClient } from "@/components/funnel/funnel-client";
import { PainPoints } from "@/components/funnel/pain-points";
import { CurriculumAccordion } from "@/components/funnel/curriculum-accordion";
import { TestimonialsSection } from "@/components/funnel/testimonials-section";
import { CourseOffer } from "@/components/funnel/course-offer";
import { FaqSection } from "@/components/funnel/faq-section";
import {
  TrendingUp,
  BookOpen,
  Eye,
  Target,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Super Warrior 30 — Practical Trading Training Program | Rahul Trade Warrior Academy",
  description:
    "Trading Basics से लेकर Market Trend, Support & Resistance, Liquidity, Entry & Exit और Risk Management तक step-by-step सीखें। Super Warrior 30 — Rahul Trade Warrior Academy.",
};

export default async function SuperWarrior30FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  }>;
}) {
  const params = await searchParams;
  const utmSource = params.utm_source;
  const utmMedium = params.utm_medium;
  const utmCampaign = params.utm_campaign;
  const utmContent = params.utm_content;

  // Fetch the Super Warrior 30 course dynamically
  let course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    modules: {
      id: string;
      title: string;
      position: number;
      lessons: { id: string; title: string; contentType: string; durationSec: number }[];
    }[];
  } | null = null;

  try {
    const raw = await prisma.course.findFirst({
      where: {
        OR: [
          { slug: "super-warrior-30" },
          { status: "PUBLISHED" },
        ],
      },
      orderBy: [{ slug: "asc" }, { createdAt: "desc" }],
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                contentType: true,
                durationSec: true,
              },
            },
          },
        },
      },
    });

    if (raw) {
      course = {
        id: raw.id,
        title: raw.title,
        slug: raw.slug,
        price: Number(raw.price),
        compareAtPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : null,
        modules: raw.modules.map((m) => ({
          id: m.id,
          title: m.title,
          position: m.position,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            contentType: l.contentType,
            durationSec: l.durationSec,
          })),
        })),
      };
    }
  } catch (err) {
    console.warn("Could not fetch course for funnel:", err);
  }

  // Fetch testimonials
  const testimonials = await getApprovedTestimonialsAction();

  const courseId = course?.id || "";
  const courseTitle = course?.title || "Super Warrior 30";
  const coursePrice = course?.price || 0;
  const courseComparePrice = course?.compareAtPrice || null;

  // Methodology cards
  const methodologyCards = [
    { num: "01", title: "Trading Foundation", icon: BookOpen, desc: "बिल्कुल basics से शुरुआत — market structure, candlestick patterns, timeframes" },
    { num: "02", title: "Market Trend", icon: TrendingUp, desc: "Trend कैसे identify करें, bullish vs bearish structure को कैसे पहचानें" },
    { num: "03", title: "Support & Resistance", icon: BarChart3, desc: "Key levels find करना, zones mark करना, breakout vs fakeout" },
    { num: "04", title: "Liquidity", icon: Target, desc: "Smart money कहाँ liquidity लेता है — और आप इसे कैसे use कर सकते हैं" },
    { num: "05", title: "Candlestick Confirmation", icon: Eye, desc: "Entry से पहले confirmation candle कैसे देखें" },
    { num: "06", title: "Entry & Exit Strategy", icon: Target, desc: "कब enter करें, कहाँ stop loss रखें, कब profit book करें" },
    { num: "07", title: "Risk Management", icon: ShieldCheck, desc: "Position sizing, risk:reward ratio, capital protection" },
    { num: "08", title: "Live Market Practice", icon: BarChart3, desc: "Real charts पर practice, live market analysis" },
    { num: "09", title: "Forex, Crypto & Gold", icon: TrendingUp, desc: "तीनों markets में same methodology कैसे apply करें" },
    { num: "10", title: "Trading Psychology", icon: ShieldCheck, desc: "Emotions control, discipline, patience — long-term success के लिए" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <PublicNavbar />

      {/* Hero + Quiz — Client Component */}
      <FunnelClient
        courseId={courseId}
        utmSource={utmSource}
        utmMedium={utmMedium}
        utmCampaign={utmCampaign}
        utmContent={utmContent}
      />

      {/* SECTION 2 — Pain Points */}
      <PainPoints />

      {/* SECTION 5 — Why Super Warrior 30 */}
      <section id="why-sw30" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
              Random Trading नहीं — <span className="text-primary">Structured Learning</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Super Warrior 30 में हर topic को systematic order में सिखाया जाता है — ताकि आप step-by-step बेहतर trader बन सकें
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {methodologyCards.map((card) => (
              <div
                key={card.num}
                className="group rounded-xl border border-border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-primary/20 font-mono">
                    {card.num}
                  </span>
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — How The Program Works */}
      <section className="py-16 md:py-24 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Program कैसे काम करता है?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Learn", emoji: "📖", desc: "पहले concept को अच्छे से समझें" },
              { step: "2", title: "Understand", emoji: "💡", desc: "फिर chart पर देखें कि ये कैसे काम करता है" },
              { step: "3", title: "Practice", emoji: "📊", desc: "फिर practice करें — demo या real charts पर" },
              { step: "4", title: "Execute", emoji: "🎯", desc: "फिर disciplined execution सीखें" },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-border bg-card p-6 text-center space-y-3"
              >
                <span className="text-3xl">{item.emoji}</span>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                <span className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                  {item.step}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            पहले concept समझें → फिर chart पर देखें → फिर practice करें → फिर disciplined execution सीखें
          </p>
        </div>
      </section>

      {/* SECTION 7 — Course Curriculum */}
      <CurriculumAccordion modules={course?.modules} />

      {/* SECTION 8 — Who Is This For */}
      <section className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              ये Program किसके लिए है?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* FOR */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
              <h3 className="text-base font-bold text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> ये Program आपके लिए है अगर:
              </h3>
              <div className="space-y-2.5">
                {[
                  "आप Beginner हैं और trading सीखना चाहते हैं",
                  "आपको structured learning की जरूरत है",
                  "आप Entry & Exit समझना चाहते हैं",
                  "आप Market movement को समझना चाहते हैं",
                  "आप Risk Management improve करना चाहते हैं",
                  "आप practical chart-based learning चाहते हैं",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NOT FOR */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" /> ये Program आपके लिए नहीं है अगर:
              </h3>
              <div className="space-y-2.5">
                {[
                  "आप guaranteed profits चाहते हैं",
                  "आप सिर्फ signals/calls service खोज रहे हैं",
                  "आप overnight success expect करते हैं",
                  "आप practice करने को तैयार नहीं हैं",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FAQ / Objection Handling */}
      <FaqSection />

      {/* SECTION 10 — Testimonials (conditional) */}
      <TestimonialsSection
        testimonials={testimonials.map((t) => ({
          id: t.id,
          studentName: t.studentName,
          content: t.content,
          photoUrl: t.photoUrl,
          rating: t.rating,
        }))}
      />

      {/* SECTION 11 — Course Offer */}
      {courseId && (
        <CourseOffer
          courseId={courseId}
          courseTitle={courseTitle}
          price={coursePrice}
          compareAtPrice={courseComparePrice}
        />
      )}

      {/* SECTION 13 — Final CTA */}
      <section className="py-20 md:py-28 border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground leading-tight">
            अगर आप Trading को seriously सीखना चाहते हैं,
            <br />
            <span className="text-primary">तो अगला कदम आपके हाथ में है.</span>
          </h2>

          {courseId && (
            <Link
              href={`/checkout/${courseId}`}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-10 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              Super Warrior 30 में Join करें
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}

          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            Trading involves risk. This program is for educational purposes and does not guarantee profits.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-10 text-xs text-muted-foreground">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-3">
          <p>© {new Date().getFullYear()} Rahul Trade Warrior Academy — Super Warrior 30. All rights reserved.</p>
          <p className="text-muted-foreground/70 max-w-lg mx-auto">
            Disclaimer: Educational content only. Trading financial markets involves significant risk of loss. Past performance does not guarantee future results. This program provides education and does not constitute financial advice.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>

      {/* Bottom padding for mobile sticky CTA */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}
