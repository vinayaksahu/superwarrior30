"use client";

import { useState } from "react";
import {
  Video,
  ZoomIn,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Target,
  Sparkles,
  Flame,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import type { LiveTradeProofRecord } from "@/components/admin/admin-live-trades-client";

interface YouTubeLiveTradesShowcaseProps {
  trades: LiveTradeProofRecord[];
  title?: string;
  subtitle?: string;
  isLandingPage?: boolean;
}

export function YouTubeLiveTradesShowcase({
  trades = [],
  title = "YouTube Live Trading Proofs • 15-30 Pips Minor SL से Sky-High R:R",
  subtitle = "Super Warrior 30 मेंटोरशिप में ट्रेड का कोई टेंशन नहीं! मेंटर राहुल के साथ लाइव यूट्यूब सेशंस में देखें कैसे 15-30 Pips SL से 1:3 से लेकर 1:10, 1:20, 1:40+ तक के हाई-एक्यूरेसी ट्रेड्स निकलते हैं:",
  isLandingPage = false,
}: YouTubeLiveTradesShowcaseProps) {
  const [activeLightbox, setActiveLightbox] = useState<LiveTradeProofRecord | null>(null);

  if (trades.length === 0) {
    return null;
  }

  return (
    <section
      id="live-trade-proofs"
      className="py-16 md:py-24 border-b border-border/40 bg-gradient-to-b from-background via-red-500/[0.02] to-background relative overflow-hidden"
    >
      {/* Background Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-black text-red-500 uppercase tracking-wider shadow-sm">
            <Video className="h-4 w-4 animate-pulse" />
            <span>YouTube Live Trading Proofs • Zero Tension Trading</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>

          {/* Golden Stats Banner */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-black text-red-400">
              15-30 Pips Minor SL
            </span>
            <span className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-black text-primary">
              1:3 to 1:40+ Sky High R:R
            </span>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-black text-emerald-400">
              60% - 90% Win Rate
            </span>
            <span className="rounded-xl border border-border bg-card px-3.5 py-1 text-xs font-bold text-foreground">
              Admin Journal Tracked
            </span>
          </div>
        </div>

        {/* Trade Proofs Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trades.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-3xl border border-border bg-card/90 overflow-hidden shadow-lg space-y-4 hover:border-red-500/40 hover:shadow-2xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Screenshot Box */}
                <div
                  onClick={() => setActiveLightbox(t)}
                  className="relative aspect-video w-full overflow-hidden bg-black/60 cursor-pointer border-b border-border/80 group-hover:opacity-95 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.screenshotUrl}
                    alt={t.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]">
                    <ZoomIn className="h-4 w-4" />
                    <span>Click to Zoom Chart</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`absolute top-3 left-3 rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm shadow z-10 ${
                      t.status === "PROFIT_BOOKED"
                        ? "bg-emerald-500 text-white"
                        : t.status === "RUNNING_PROFIT"
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-amber-500 text-black"
                    }`}
                  >
                    {t.status === "PROFIT_BOOKED"
                      ? "PROFIT BOOKED"
                      : t.status === "RUNNING_PROFIT"
                      ? "RUNNING PROFIT"
                      : "BREAKEVEN"}
                  </span>

                  {/* R:R Floating Badge */}
                  <span className="absolute top-3 right-3 rounded-lg bg-black/85 border border-primary/50 px-2.5 py-1 text-xs font-mono font-black text-primary backdrop-blur-sm shadow z-10">
                    {t.riskRewardRatio} R:R
                  </span>
                </div>

                <div className="p-5 pt-1 space-y-3">
                  {/* Title & Direction */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-foreground">{t.instrument}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                            t.tradeDirection === "BUY"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-red-500/15 text-red-500"
                          }`}
                        >
                          {t.tradeDirection}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-muted-foreground line-clamp-1 mt-0.5">
                        {t.title}
                      </h3>
                    </div>

                    {t.youtubeUrl && (
                      <a
                        href={t.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 px-2 py-1 text-[10px] font-bold transition-colors shrink-0"
                      >
                        <Video className="h-3 w-3" />
                        <span>Replay</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Metrics Box: 15-30 Pips SL vs Gain Pips */}
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-3 border border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Stop Loss (Minor):</span>
                      <span className="font-mono font-black text-red-400">
                        {t.slPips} Pips
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        {t.status === "RUNNING_PROFIT" ? "Running Move:" : "Realized Gain:"}
                      </span>
                      <span className="font-mono font-black text-emerald-500">
                        +{t.gainPips} Pips
                      </span>
                    </div>
                  </div>

                  {/* Profit Amount Banner */}
                  {t.profitAmount && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Live Profit:</span>
                      <span className="font-mono font-black text-foreground bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                        {t.profitAmount}
                      </span>
                    </div>
                  )}

                  {/* Mentor Strategy & Psychology Note */}
                  {t.notes && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-wider">
                        <ShieldCheck className="h-3 w-3" /> Mentor Rahul Sir's Note:
                      </span>
                      <p className="text-[11px] text-foreground leading-relaxed italic">
                        "{t.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 pt-0 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> YouTube Live Verified
                </span>
                <span className="font-mono">
                  {new Date(t.tradedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Banner */}
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-10 text-center space-y-4 max-w-4xl mx-auto shadow-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-black text-primary uppercase">
            <Flame className="h-3.5 w-3.5" />
            <span>Psychology Trap Solution • Sky High is the Limit</span>
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
            ट्रेड की टेंशन छोड़ें — केवल साइकोलॉजी और मनी मैनेजमेंट पर फोकस करें!
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Super Warrior 30 में आपको 15-30 Pips के छोटे स्टॉप लॉस से 1:3, 1:5, 1:10 से लेकर 1:40+ तक के बिग विनर ट्रेड्स मिलते हैं। प्रॉपर <strong>In-App Trading Journal</strong> और मेंटर द्वारा लाइव ट्रैकिंग से आप लूज़र लूप से हमेशा के लिए बाहर निकलेंगे।
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isLandingPage ? (
              <a
                href="#offer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-xs sm:text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer w-full sm:w-auto"
              >
                <span>Super Warrior 30 Mentorship जॉइन करें</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link
                href="/super-warrior-30"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-xs sm:text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer w-full sm:w-auto"
              >
                <span>Super Warrior 30 Mentorship देखें</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-8 py-3.5 text-xs sm:text-sm font-black text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer w-full sm:w-auto"
            >
              <span>Free Affiliate Program में जुड़ें (Zero Investment)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-3xl border border-border overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{activeLightbox.instrument}</span>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black text-primary">
                  {activeLightbox.riskRewardRatio} R:R
                </span>
                <span className="text-xs text-muted-foreground">
                  • SL: {activeLightbox.slPips} Pips | Target: +{activeLightbox.gainPips} Pips
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightbox(null)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLightbox.screenshotUrl}
                alt={activeLightbox.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl border border-border shadow-2xl"
              />
            </div>

            {activeLightbox.notes && (
              <div className="p-4 border-t border-border bg-card text-xs space-y-1">
                <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px]">
                  Mentor's Live Note:
                </span>
                <p className="text-muted-foreground leading-relaxed">{activeLightbox.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
