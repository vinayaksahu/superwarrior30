import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  GitBranch,
  PlayCircle,
  HelpCircle,
  BarChart3,
  Flame,
  Zap,
} from "lucide-react";
import { resolvePublicHomepageEnvironment, withEnvironmentContext } from "@/lib/env-context";
import { getApprovedTestimonialsAction } from "@/server/actions/testimonial.actions";
import { TestimonialsSection } from "@/components/funnel/testimonials-section";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const homepageEnv = await resolvePublicHomepageEnvironment();

  // Fetch real published courses with safe fallback respecting homepage environment
  let featuredCourses: Array<{
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    price: number | string | { toString(): string };
    compareAtPrice: number | string | { toString(): string } | null;
    difficulty: string;
    thumbnailCdnUrl?: string | null;
    thumbnailKey?: string | null;
    _count: { modules: number };
  }> = [];

  try {
    featuredCourses = await withEnvironmentContext(homepageEnv, async () => {
      return await prisma.course.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: {
          _count: { select: { modules: true } },
        },
      });
    });
  } catch (err) {
    console.warn("Could not load featured courses at build time:", err);
  }

  const testimonials = await withEnvironmentContext(homepageEnv, async () => {
    return await getApprovedTestimonialsAction("HOME");
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* 1. Header Navigation */}
      <PublicNavbar isTestMode={homepageEnv === "TEST"} />

      {/* 2. Hero Section: Terminal Aesthetic */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-36 border-b border-border/40">
        {/* Glow & Grid background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Professional Trading Mentorship & Masterclasses</span>
              </div>
              {homepageEnv === "TEST" && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  <span>TEST MODE ACTIVE</span>
                </div>
              )}
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              Master the Markets with{" "}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Institutional Precision
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg leading-relaxed">
              Step into the mindset of professional price-action traders. Structured video masterclasses, 
              curated strategies, and systematic risk management designed to elevate your trading execution.
            </p>

            <div className="pt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                Explore Courses
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-bold shadow transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Join Academy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Pillars / Benefits */}
      <section className="border-b border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BarChart3,
                title: "Pure Price Action",
                desc: "Decode market microstructure and candlestick dynamics without lagging indicators.",
              },
              {
                icon: ShieldCheck,
                title: "Risk-First Framework",
                desc: "Strict position sizing and mathematical risk-to-reward models that protect capital.",
              },
              {
                icon: PlayCircle,
                title: "Structured Video Lessons",
                desc: "HD chaptered video breakdowns with companion study guides and PDF cheat sheets.",
              },
              {
                icon: GitBranch,
                title: "Affiliate Growth Network",
                desc: "Earn multi-tier referral commissions as you share your education with fellow traders.",
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-3 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-base">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Masterclasses */}
      <section id="courses" className="py-20 border-b border-border/40 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Flame className="h-4 w-4" />
                <span>Featured Curriculum</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                Trading Masterclasses
              </h2>
            </div>

            <Link
              href="/courses"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Browse All Courses
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {featuredCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
              New masterclasses are currently being scheduled. Check back shortly.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course) => {
                const discount =
                  course.compareAtPrice && Number(course.compareAtPrice) > Number(course.price)
                    ? Math.round(
                        ((Number(course.compareAtPrice) - Number(course.price)) /
                          Number(course.compareAtPrice)) *
                          100
                      )
                    : null;

                return (
                  <div
                    key={course.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all hover:border-primary/40 hover:shadow-lg group"
                  >
                    <div className="space-y-4">
                      {/* Image / Thumbnail */}
                      <div className="relative aspect-video w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border/60">
                        {course.thumbnailCdnUrl ? (
                          <img
                            src={course.thumbnailCdnUrl}
                            alt={course.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <PlayCircle className="h-12 w-12 text-muted-foreground/30 group-hover:text-primary/70 transition-colors" />
                        )}
                        <span className="absolute top-3 left-3 rounded-md bg-background/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-border/60 backdrop-blur-sm z-10">
                          {course.difficulty}
                        </span>
                        {discount && (
                          <span className="absolute top-3 right-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white z-10">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      <div className="p-5 space-y-2">
                        <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.shortDescription || "Comprehensive video trading course."}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="flex items-center justify-between border-t border-border/60 pt-4">
                        <div>
                          <span className="text-lg font-extrabold text-foreground">
                            {formatCurrency(Number(course.price))}
                          </span>
                          {course.compareAtPrice && (
                            <span className="ml-2 text-xs text-muted-foreground line-through">
                              {formatCurrency(Number(course.compareAtPrice))}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. 3-Step Methodology */}
      <section id="about" className="py-20 bg-muted/20 border-b border-border/40 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              The Super Warrior 30 Methodology
            </h2>
            <p className="text-xs text-muted-foreground">
              A structured roadmap from raw price charts to disciplined market execution
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Deconstruct Market Structure",
                desc: "Identify liquidity pools, order flow dynamics, and key institutional support/resistance levels.",
              },
              {
                step: "02",
                title: "Execute High-Probability Setups",
                desc: "Filter market noise with predefined entry triggers, stop placements, and tiered take-profit targets.",
              },
              {
                step: "03",
                title: "Scale Psychology & Capital",
                desc: "Master emotional detachment, trade journaling, and capital management for sustainable long-term trading.",
              },
            ].map((m) => (
              <div
                key={m.step}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3"
              >
                <span className="text-3xl font-black text-primary/20 font-mono block">
                  {m.step}
                </span>
                <h3 className="font-bold text-foreground text-base">{m.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5b. Student Testimonials & Success Stories */}
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

      {/* 6. Referral Affiliate Section */}
      <section className="py-20 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 p-8 sm:p-12 shadow-xl">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Affiliate Partnership Program</span>
                </div>
                <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                  Learn with Us. Share with Peers. <br />
                  <span className="text-primary">Earn Multi-Tier Commissions.</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Every enrolled student receives a unique referral code. Earn automated commission payouts
                  directly to your wallet whenever peers join through your invitation.
                </p>
                <div className="pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
                  >
                    Join Referral Program
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-2xl border border-border bg-background/80 p-5 space-y-1">
                  <p className="text-2xl font-extrabold text-primary">Tier 1</p>
                  <p className="text-xs font-semibold text-foreground">Direct Referrals</p>
                  <p className="text-[11px] text-muted-foreground">Highest payout rate</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-5 space-y-1">
                  <p className="text-2xl font-extrabold text-emerald-500">Multi-Tier</p>
                  <p className="text-xs font-semibold text-foreground">Network Depth</p>
                  <p className="text-[11px] text-muted-foreground">Earnings down the tree</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-5 space-y-1">
                  <p className="text-2xl font-extrabold text-amber-500">₹ INR</p>
                  <p className="text-xs font-semibold text-foreground">Direct Bank Payouts</p>
                  <p className="text-[11px] text-muted-foreground">Fast UPI & IMPS transfers</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-5 space-y-1">
                  <p className="text-2xl font-extrabold text-sky-500">100%</p>
                  <p className="text-xs font-semibold text-foreground">Transparent Ledger</p>
                  <p className="text-[11px] text-muted-foreground">Real-time audit tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Accordion Section */}
      <section id="faq" className="py-20 border-b border-border/40 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything you need to know about course access, streaming, and affiliate payouts
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How do I access course videos and PDFs after purchase?",
                a: "Access is unlocked automatically the moment your payment is verified. You can stream videos and download cheat sheets anytime from your student dashboard.",
              },
              {
                q: "Are the courses suitable for complete beginners?",
                a: "Yes. Our curriculum begins with market structure and candlestick fundamentals before advancing to complex multi-timeframe trade setups.",
              },
              {
                q: "How does the multi-level referral program work?",
                a: "When you share your unique referral link, you earn commissions on direct course enrollments, as well as downstream affiliate tiers configured on the platform.",
              },
              {
                q: "What payment methods are supported for withdrawals?",
                a: "You can request wallet withdrawals directly to your Indian bank account via UPI or NEFT/IMPS bank transfer with a minimum threshold of ₹500.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-border bg-card p-5 transition-colors open:border-primary/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-foreground">
                  <span>{faq.q}</span>
                  <span className="transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Contact & Mentorship Desk Section */}
      <section id="contact" className="py-20 border-b border-border/40 bg-card/60 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-10">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Contact & Student Support</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Have Questions? Get in Touch
            </h2>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Our mentorship desk and student support team are available to help you with enrollment, masterclass access, and technical inquiries.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-5 text-center space-y-2 hover:border-primary/40 transition-colors">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Student Help Desk</h3>
              <p className="text-[11px] text-muted-foreground">Direct portal support & inquiries</p>
              <Link href="/contact" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
                Open Support Desk →
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5 text-center space-y-2 hover:border-primary/40 transition-colors">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Community & Updates</h3>
              <p className="text-[11px] text-muted-foreground">Official announcements & trade insights</p>
              <a href="https://t.me/rahultradewarrior" target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-emerald-400 hover:underline pt-1">
                Join Telegram Channel →
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5 text-center space-y-2 hover:border-primary/40 transition-colors">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Mentorship Guidance</h3>
              <p className="text-[11px] text-muted-foreground">Learn directly with Rahul Sir</p>
              <Link href="/super-warrior-30" className="inline-block text-xs font-bold text-amber-400 hover:underline pt-1">
                Super Warrior 30 Batch →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Conversion CTA */}
      <section className="py-20 border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-foreground">
            Ready to Transform Your Trading Journey?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Join hundreds of ambitious traders mastering the markets through structured price-action education.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-xs font-bold text-primary-foreground shadow-xl hover:bg-primary/90 transition-all"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-card py-12 text-xs text-muted-foreground">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 border-b border-border pb-8">
            <div className="space-y-2">
              <BrandLogo href="/" size="sm" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Elite trading masterclasses and affiliate mentorship ecosystem.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-3 text-xs">Curriculum</h4>
              <ul className="space-y-2">
                <li><Link href="/courses" className="hover:text-foreground">All Masterclasses</Link></li>
                <li><Link href="/testimonials" className="hover:text-foreground">Student Reviews & P&L</Link></li>
                <li><Link href="/about" className="hover:text-foreground">Methodology</Link></li>
                <li><Link href="/faq" className="hover:text-foreground">Student FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-3 text-xs">Support</h4>
              <ul className="space-y-2">
                <li><Link href="/contact" className="hover:text-foreground">Contact Desk</Link></li>
                <li><Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Student Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-3 text-xs">Legal & Compliance</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} Super Warrior 30. All rights reserved.</p>
            <p className="text-muted-foreground/70">
              Disclaimer: Educational content only. Trading financial markets involves risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
