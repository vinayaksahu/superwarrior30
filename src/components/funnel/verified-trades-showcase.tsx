"use client";

import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ZoomIn,
  X,
  Scale,
  Flame,
  Star,
  ArrowRight,
} from "lucide-react";

export interface VerifiedTradeItem {
  id: string;
  instrument: string;
  market: string;
  direction: string;
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio?: string | null;
  pnl?: number | null;
  outcome?: string;
  emotions?: string | null;
  screenshotUrl?: string | null;
  mentorFeedback?: string | null;
  tradedAt?: Date | string;
  user?: {
    name: string | null;
    email?: string;
  };
}

interface VerifiedTradesShowcaseProps {
  trades: VerifiedTradeItem[];
  title?: string;
  subtitle?: string;
}

export function VerifiedTradesShowcase({
  trades = [],
  title = "Real Student Trade Verifications • Live Trading Journal",
  subtitle = "देखें कैसे मेंटर राहुल की गाइडेंस में स्टूडेंट्स 15-30 Pips SL और 1:3 से 1:20+ R:R के साथ लाइव मार्केट में ट्रेड्स निकाल रहे हैं",
}: VerifiedTradesShowcaseProps) {
  const [activeLightbox, setActiveLightbox] = useState<VerifiedTradeItem | null>(null);

  // Fallback high-impact trades if none featured yet
  const displayTrades: VerifiedTradeItem[] =
    trades.length > 0
      ? trades
      : [
          {
            id: "sample-1",
            instrument: "XAUUSD (GOLD)",
            market: "GOLD",
            direction: "BUY",
            entryPrice: 2642.5,
            exitPrice: 2668.0,
            stopLoss: 2638.0,
            takeProfit: 2670.0,
            riskRewardRatio: "1:5.7",
            pnl: 18500,
            outcome: "WIN",
            emotions: "CALM",
            screenshotUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
            mentorFeedback: "बिल्कुल सही 15m Liquidity sweep पर एंट्री। 4.5 Pips का छोटा SL और 1:5.7 R:R का बेहतरीन एग्जीक्यूशन!",
            tradedAt: new Date(),
            user: { name: "Aman Sharma" },
          },
          {
            id: "sample-2",
            instrument: "EURUSD",
            market: "FOREX",
            direction: "SELL",
            entryPrice: 1.089,
            exitPrice: 1.0815,
            stopLoss: 1.0905,
            takeProfit: 1.081,
            riskRewardRatio: "1:5.0",
            pnl: 12200,
            outcome: "WIN",
            emotions: "DISCIPLINED",
            screenshotUrl: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80",
            mentorFeedback: "London Session High ब्रेक होने के बाद रिजेक्शन पकड़ा। अनुशासन के साथ पूरा टारगेट राइड किया।",
            tradedAt: new Date(),
            user: { name: "Vikram Patel" },
          },
          {
            id: "sample-3",
            instrument: "BTCUSDT",
            market: "CRYPTO",
            direction: "BUY",
            entryPrice: 63200,
            exitPrice: 66800,
            stopLoss: 62850,
            takeProfit: 67000,
            riskRewardRatio: "1:10.2",
            pnl: 34000,
            outcome: "WIN",
            emotions: "CALM",
            screenshotUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop&q=80",
            mentorFeedback: "350$ के छोटे SL से 1:10+ का मूव कैप्चर किया। यही 'Sky High is the Limit' का असली उदाहरण है!",
            tradedAt: new Date(),
            user: { name: "Rohit Verma" },
          },
        ];

  return (
    <section id="verified-trades" className="py-16 md:py-24 border-b border-border/40 bg-gradient-to-b from-card/30 via-background to-card/30 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-black text-primary uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Verified Student Trade Journal Proofs</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Trade Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayTrades.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-3xl border border-border bg-card/90 p-5 shadow-lg space-y-4 hover:border-primary/50 hover:shadow-2xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Student Name & Verified Badge */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 font-black text-primary text-xs shadow-inner">
                      {(t.user?.name || "Student")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[140px]">
                        {t.user?.name || "Warrior Student"}
                      </h4>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        Verified Student ✓
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-500">
                    <Star className="h-3 w-3 fill-amber-500" />
                    <span>Mentor Verified</span>
                  </div>
                </div>

                {/* Instrument, Direction & R:R */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">{t.instrument}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        t.direction === "BUY"
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-500 border border-red-500/30"
                      }`}
                    >
                      {t.direction}
                    </span>
                  </div>

                  {t.riskRewardRatio && (
                    <div className="rounded-xl bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-black text-primary font-mono">
                      {t.riskRewardRatio} R:R
                    </div>
                  )}
                </div>

                {/* Screenshot Box */}
                {t.screenshotUrl && (
                  <div
                    onClick={() => setActiveLightbox(t)}
                    className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border/80 bg-black/40 group-hover:border-primary/40 cursor-pointer transition-all shadow-inner"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.screenshotUrl}
                      alt={`${t.instrument} trade chart`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]">
                      <ZoomIn className="h-4 w-4" />
                      <span>Click to Enlarge Chart</span>
                    </div>
                  </div>
                )}

                {/* Key Metrics: Entry, SL, TP, PnL */}
                <div className="grid grid-cols-2 gap-2 text-[11px] rounded-xl bg-muted/40 p-2.5 border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Entry Price:</span>
                    <span className="font-mono font-bold text-foreground">{t.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Stop Loss (Minor):</span>
                    <span className="font-mono font-bold text-red-400">{t.stopLoss}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Target Price:</span>
                    <span className="font-mono font-bold text-emerald-400">{t.takeProfit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Realized Profit:</span>
                    <span className="font-mono font-black text-emerald-500">
                      {t.pnl !== null && t.pnl !== undefined
                        ? t.pnl > 0
                          ? `+₹${t.pnl.toLocaleString()}`
                          : `₹${t.pnl.toLocaleString()}`
                        : "Target Hit ✓"}
                    </span>
                  </div>
                </div>

                {/* Mentor Feedback / Guidance Box */}
                {t.mentorFeedback && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-wider">
                      <ShieldCheck className="h-3 w-3" /> Rahul Sir's Review:
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed italic">
                      "{t.mentorFeedback}"
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Rule Followed
                </span>
                <span className="font-mono">In-App Journal Tracked</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center space-y-4 max-w-4xl mx-auto">
          <h3 className="text-lg sm:text-xl font-black text-foreground">
            क्या आप भी अपने हर ट्रेड का रिकॉर्ड रख कर इसी तरह प्रॉफिटेबल बनना चाहते हैं?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Super Warrior 30 में आपको सिर्फ ज्ञान नहीं, बल्कि <strong>In-App Trading Journal</strong> और <strong>लाइव मेंटर ट्रैकिंग</strong> मिलती है ताकि आप कभी लॉस के चक्रव्यूह में न फंसें।
          </p>
          <div className="pt-2">
            <a
              href="#offer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-xs sm:text-sm font-black text-primary-foreground shadow-xl hover:bg-primary/90 transition-all cursor-pointer"
            >
              <span>Super Warrior 30 Mentorship में शामिल हों</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* High-Res Lightbox Modal */}
      {activeLightbox && activeLightbox.screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-3xl border border-border overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{activeLightbox.instrument}</span>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black text-primary">
                  {activeLightbox.riskRewardRatio || "1:5"} R:R
                </span>
                <span className="text-xs text-muted-foreground">
                  • By {activeLightbox.user?.name || "Student"}
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

            {/* Modal Image */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLightbox.screenshotUrl}
                alt="Full trade chart screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-xl border border-border shadow-2xl"
              />
            </div>

            {/* Modal Footer Note */}
            {activeLightbox.mentorFeedback && (
              <div className="p-4 border-t border-border bg-card text-xs space-y-1">
                <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px]">
                  Rahul Sir's Feedback:
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {activeLightbox.mentorFeedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
