"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { QuizWidget } from "./quiz-widget";
import { QuizResult } from "./quiz-result";
import { trackFunnelEventAction } from "@/server/actions/lead.actions";

interface FunnelClientProps {
  courseId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export function FunnelClient({
  courseId,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
}: FunnelClientProps) {
  const [quizState, setQuizState] = useState<"quiz" | "result">("quiz");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Track landing page visit
  useEffect(() => {
    const sessionId = Math.random().toString(36).substring(2);
    trackFunnelEventAction({
      sessionId,
      eventType: "LANDING_PAGE_VISIT",
      metadata: { utmSource, utmMedium, utmCampaign, utmContent },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuizComplete = (newLeadId: string, answers: Record<string, string>) => {
    setLeadId(newLeadId);
    setQuizAnswers(answers);
    setQuizState("result");
  };

  const handleResultContinue = () => {
    // Track course viewed
    if (leadId) {
      trackFunnelEventAction({
        leadId,
        eventType: "COURSE_VIEWED",
      });
    }
    // Scroll to course section
    document.getElementById("why-sw30")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToQuiz = () => {
    document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToCourse = () => {
    document.getElementById("why-sw30")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ============ HERO SECTION ============ */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28 border-b border-border/40">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="absolute inset-0 -z-10 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A017' fill-opacity='0.08'%3E%3Crect x='29' y='0' width='1' height='60'/%3E%3Crect x='0' y='29' width='60' height='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <span>🧠</span>
              <span>Trading Reality: 80% Psychology • 20% Technicals</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
              Chart देखना तो कोई भी सीख लेता है,
              <br />
              <span className="text-primary">लेकिन 90% Traders Loss सिर्फ Psychology और Risk Management न होने से करते हैं!</span>
            </h1>

            <p className="mx-auto max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Trading 10 अलग-अलग Indicators का खेल नहीं है — यह <span className="text-foreground font-bold">80% Mindset, Emotion Control & Money Management</span> और केवल <span className="text-foreground font-bold">20% Clean Price Action</span> है। Super Warrior 30 में सीखें कि कैसे FOMO और Revenge Trading को जड़ से खत्म करें, 1:2+ Risk:Reward से Capital Protect करें, और एक Disciplined Profitable Trader बनें।
            </p>

            {/* 4 Pillars Highlight Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
                <span>🎯</span>
                <span>15-20-30 Pips Minor SL</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500 shadow-sm">
                <span>🚀</span>
                <span>1:3 to 1:40+ Sky-High R:R</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500 shadow-sm">
                <span>⚡</span>
                <span>60% - 90% Accuracy (Scalp • Day • Swing)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 shadow-sm">
                <span>📓</span>
                <span>Admin-Tracked Trading Journal</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToQuiz}
                className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] cursor-pointer"
              >
                अपना Trading Psychology Profile Check करें
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToCourse}
                className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-bold shadow transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                80/20 Framework समझें
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Minor 15-30 Pips SL • 1:2 to 1:40+ Sky High R:R • 60-90% Win-Rate • In-App Journaling Tracked by Mentor
            </p>
          </div>
        </div>
      </section>

      {/* ============ QUIZ SECTION ============ */}
      <section id="quiz" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
            <div className="mb-6 text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                {quizState === "quiz" ? "पहले अपना Trading Profile Check करें" : ""}
              </h2>
            </div>

            {quizState === "quiz" ? (
              <QuizWidget
                courseId={courseId}
                utmSource={utmSource}
                utmMedium={utmMedium}
                utmCampaign={utmCampaign}
                utmContent={utmContent}
                onComplete={handleQuizComplete}
              />
            ) : (
              <QuizResult
                answers={quizAnswers}
                onContinue={handleResultContinue}
              />
            )}
          </div>
        </div>
      </section>

      {/* ============ STICKY MOBILE CTA ============ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md p-3 sm:hidden">
        <Link
          href={`/checkout/${courseId}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg"
        >
          Super Warrior 30 Join करें
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
