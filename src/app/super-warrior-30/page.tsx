import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getApprovedTestimonialsAction } from "@/server/actions/testimonial.actions";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { FunnelClient } from "@/components/funnel/funnel-client";
import { PainPoints } from "@/components/funnel/pain-points";
import { PsychologyBreakdown } from "@/components/funnel/psychology-breakdown";
import { MentorAssurance } from "@/components/funnel/mentor-assurance";
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
  Brain,
  Scale,
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
    course?: string;
    courseId?: string;
  }>;
}) {
  const params = await searchParams;
  const utmSource = params.utm_source;
  const utmMedium = params.utm_medium;
  const utmCampaign = params.utm_campaign;
  const utmContent = params.utm_content;
  const requestedCourse = params.course || params.courseId;

  // Fetch the target course dynamically based on URL param or Admin configured default
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
    const courseInclude = {
      modules: {
        where: { isPublished: true },
        orderBy: { position: "asc" as const },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" as const },
            select: {
              id: true,
              title: true,
              contentType: true,
              durationSec: true,
            },
          },
        },
      },
    };

    let raw = null;

    // 1. If explicit course specified in URL (e.g. ?course=sw30 or ?courseId=crs_123)
    if (requestedCourse) {
      raw = await prisma.course.findFirst({
        where: {
          OR: [{ id: requestedCourse }, { slug: requestedCourse }],
          status: "PUBLISHED",
          deletedAt: null,
        },
        include: courseInclude,
      });
    }

    // 2. If not found, check Admin configured default funnel course in SiteSetting
    if (!raw) {
      const defaultSetting = await prisma.siteSetting.findUnique({
        where: { key: "funnel_default_course_id" },
      });

      if (defaultSetting?.value) {
        raw = await prisma.course.findFirst({
          where: {
            id: defaultSetting.value,
            status: "PUBLISHED",
            deletedAt: null,
          },
          include: courseInclude,
        });
      }
    }

    // 3. If not found, check for course with slug 'super-warrior-30'
    if (!raw) {
      raw = await prisma.course.findFirst({
        where: {
          slug: "super-warrior-30",
          status: "PUBLISHED",
          deletedAt: null,
        },
        include: courseInclude,
      });
    }

    // 4. Fallback to latest published course
    if (!raw) {
      raw = await prisma.course.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: courseInclude,
      });
    }

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
  const testimonials = await getApprovedTestimonialsAction("LANDING");

  const courseId = course?.id || "";
  const courseTitle = course?.title || "Super Warrior 30";
  const coursePrice = course?.price || 0;
  const courseComparePrice = course?.compareAtPrice || null;

  // Methodology cards focused on 80% Psychology & Risk Management + 20% Technicals
  const methodologyCards = [
    { num: "01", title: "Trading Psychology", icon: Brain, desc: "Fear, Greed और FOMO को खत्म करना — 80% जीत यहीं से शुरू होती है" },
    { num: "02", title: "Anti-Revenge Protocol", icon: ShieldCheck, desc: "1 Loss के बाद बड़ा ट्रेड न लेना — स्क्रीन बंद करने का सख्त अनुशासन" },
    { num: "03", title: "Risk & Money Management", icon: Scale, desc: "हर ट्रेड में सिर्फ 1-2% रिस्क लेना — Exact Position Sizing का गणित" },
    { num: "04", title: "1:2+ Risk:Reward Formula", icon: Target, desc: "50% Win Rate पर भी नेट प्रॉफिटेबल रहने का प्रूवन सिस्टम" },
    { num: "05", title: "Capital Compounding", icon: BarChart3, desc: "छोटे अकाउंट को बिना जुआ खेले सिस्टमैटिकली ग्रो करना" },
    { num: "06", title: "20% Clean Price Action", icon: BookOpen, desc: "Zero Indicators — बिना RSI/MACD के साफ़ सुथरे चार्ट्स पर ट्रेड" },
    { num: "07", title: "Market Trend & Structure", icon: TrendingUp, desc: "Higher Highs / Lower Lows और ब्रेकआउट vs फेकआउट की पहचान" },
    { num: "08", title: "Smart Money Liquidity", icon: Eye, desc: "मार्केट कहाँ रिटेलर्स का Stop Loss हंट करता है — ट्रैप से बचना" },
    { num: "09", title: "Entry & Exit Confirmation", icon: Target, desc: "रूल-बेस्ड एंट्री ट्रिगर, फिक्स्ड स्टॉप लॉस और प्रॉफिट बुकिंग" },
    { num: "10", title: "Forex, Crypto & Gold", icon: TrendingUp, desc: "तीनों मार्केट्स में एक ही 80/20 साइकोलॉजी फॉर्मूला लागू करना" },
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

      {/* SECTION 2 — Pain Points (Psychology & Risk Focus) */}
      <PainPoints />

      {/* SECTION 3 — The 80/20 Law of Trading (Deep Psychology Breakdown) */}
      <PsychologyBreakdown />

      {/* SECTION 5 — Why Super Warrior 30 */}
      <section id="why-sw30" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
              Random Trading नहीं — <span className="text-primary">80/20 Structured Discipline</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Super Warrior 30 में पहले आपकी Psychology और Money Management को बुलेटप्रूफ बनाया जाता है, फिर Clean 20% Price Action सिखाया जाता है
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {methodologyCards.map((card) => (
              <div
                key={card.num}
                className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-primary/25 font-mono">
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
              { step: "1", title: "Mindset Reset", emoji: "🧠", desc: "पहले FOMO और Revenge Trading की मानसिकता को खत्म करें" },
              { step: "2", title: "Risk Blueprint", emoji: "🛡️", desc: "फिर 1:2+ R:R और Position Sizing का कड़ा नियम बनाएं" },
              { step: "3", title: "20% Price Action", emoji: "📊", desc: "फिर बिना इंडिकेटर्स के साफ़ चार्ट्स पर एंट्री-एग्जिट सीखें" },
              { step: "4", title: "Disciplined Execution", emoji: "🎯", desc: "फिर लाइव मार्केट में रोबोटिक अनुशासन के साथ ट्रेड करें" },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-border bg-card p-6 text-center space-y-3 shadow-sm"
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
            Mindset Reset → Risk Blueprint → 20% Price Action → Disciplined Execution
          </p>
        </div>
      </section>

      {/* SECTION 7 — Mentor's Personal Commitment & Complete Ecosystem */}
      <MentorAssurance courseId={courseId} />

      {/* SECTION 8 — Course Curriculum */}
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
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
              <h3 className="text-base font-bold text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> ये Program आपके लिए है अगर:
              </h3>
              <div className="space-y-2.5">
                {[
                  "आप Revenge Trading और Overtrading को हमेशा के लिए खत्म करना चाहते हैं",
                  "आप Profit में जल्दी भागने और Loss में बैठे रहने की आदत तोड़ना चाहते हैं",
                  "आप 15-30 Pts Minor SL और 1:3 से 1:40+ Sky High Risk:Reward के साथ Capital Compound करना चाहते हैं",
                  "आप Scalping, Intraday और Swing तीनों में 60% से 90% Win-Rate Accuracy पाना चाहते हैं",
                  "आप In-App Trading Journal के ज़रिए Admin/Mentor की निगरानी में अपनी Psychology को मास्टर करना चाहते हैं",
                  "आप Telegram Signals छोड़कर खुद एक Independent Trader बनना चाहते हैं",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NOT FOR */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" /> ये Program आपके लिए नहीं है अगर:
              </h3>
              <div className="space-y-2.5">
                {[
                  "आप रातों-रात अमीर बनने की 'लॉटरी स्कीम' ढूंढ रहे हैं",
                  "आप बिना सोचे-समझे जुआ (Gambling) की तरह ट्रेड करना चाहते हैं",
                  "आप बिना Stop Loss लगाए ट्रेड करते हैं और नियम नहीं मानना चाहते",
                  "आप सिर्फ पकी-पकाई Calls/Signals चाहते हैं और मेहनत नहीं करना चाहते",
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
          isFeatured: t.isFeatured,
          tradingPlatform: t.tradingPlatform,
          accountType: t.accountType,
          tradingResult: t.tradingResult,
          experienceDuration: t.experienceDuration,
          isTestData: t.isTestData,
          createdAt: t.createdAt,
          screenshots: t.screenshots,
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
