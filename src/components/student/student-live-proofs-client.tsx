"use client";

import { useState } from "react";
import {
  Video,
  ZoomIn,
  X,
  ExternalLink,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Search,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { LiveTradeProofRecord } from "@/components/admin/admin-live-trades-client";

interface StudentLiveProofsClientProps {
  initialTrades: LiveTradeProofRecord[];
}

export function StudentLiveProofsClient({ initialTrades = [] }: StudentLiveProofsClientProps) {
  const [filter, setFilter] = useState<"ALL" | "PROFIT_BOOKED" | "RUNNING_PROFIT">("ALL");
  const [search, setSearch] = useState("");
  const [activeLightbox, setActiveLightbox] = useState<LiveTradeProofRecord | null>(null);

  const filteredTrades = initialTrades.filter((t) => {
    const matchFilter = filter === "ALL" || t.status === filter;
    const matchSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.instrument.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));

    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-background to-card p-6 sm:p-8 space-y-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3.5 py-1 text-xs font-black text-red-500 uppercase tracking-wider">
            <Video className="h-3.5 w-3.5" />
            <span>Mentor Live Executions • YouTube Trading Stream</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            Minor 15-30 Pips SL Rule
          </span>
        </div>

        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Mentor Rahul Sir's YouTube Live Trades & Verifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            यहाँ मेंटर द्वारा YouTube लाइव स्ट्रीम में लिए गए सभी ट्रेड्स का पूरा रिकॉर्ड, चार्ट स्क्रीनशॉट्स, 15-30 Pips Minor SL और 1:3 से 1:40+ Sky-High Risk Reward का विस्तृत ब्रेकडाउन उपलब्ध है। इन चार्ट्स को स्टडी करके अपनी ट्रेडिंग साइकोलॉजी को मजबूत करें!
          </p>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl border border-border/80 bg-card/60 p-3 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Live Verified Trades</span>
            <span className="text-lg font-black text-foreground">{initialTrades.length}+ Setups</span>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-3 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Average Stop Loss</span>
            <span className="text-lg font-black text-red-400">15-20 Pips Only</span>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-3 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Risk:Reward Potential</span>
            <span className="text-lg font-black text-primary">1:3 to 1:40+ R:R</span>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-3 text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Accuracy Range</span>
            <span className="text-lg font-black text-emerald-500">60% - 90% Win</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Live Trades
          </button>
          <button
            type="button"
            onClick={() => setFilter("PROFIT_BOOKED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === "PROFIT_BOOKED"
                ? "bg-emerald-500 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Profit Booked
          </button>
          <button
            type="button"
            onClick={() => setFilter("RUNNING_PROFIT")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === "RUNNING_PROFIT"
                ? "bg-blue-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Running Profit
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by instrument, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Trades Grid */}
      {filteredTrades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No trades found in this category</h3>
          <p className="text-xs text-muted-foreground">Select another tab or search query.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrades.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-primary/50 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Instrument & Status */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">{t.instrument}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                        t.tradeDirection === "BUY"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {t.tradeDirection}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      t.status === "PROFIT_BOOKED"
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                        : t.status === "RUNNING_PROFIT"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {t.status === "PROFIT_BOOKED"
                      ? "PROFIT BOOKED"
                      : t.status === "RUNNING_PROFIT"
                      ? "RUNNING PROFIT"
                      : "BREAKEVEN"}
                  </span>
                </div>

                {/* Screenshot Box */}
                <div
                  onClick={() => setActiveLightbox(t)}
                  className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black/60 cursor-pointer group-hover:border-primary/50 transition-all shadow-inner"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.screenshotUrl}
                    alt={t.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]">
                    <ZoomIn className="h-4 w-4" />
                    <span>Click to Enlarge Chart</span>
                  </div>

                  {/* R:R Floating Badge */}
                  <span className="absolute top-2.5 right-2.5 rounded-lg bg-black/80 border border-primary/40 px-2 py-0.5 text-[11px] font-mono font-black text-primary backdrop-blur-sm shadow">
                    {t.riskRewardRatio} R:R
                  </span>
                </div>

                {/* Session Title & Link */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-foreground line-clamp-1">
                    {t.title}
                  </h3>

                  {t.youtubeUrl && (
                    <a
                      href={t.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400 shrink-0"
                    >
                      <Video className="h-3 w-3" />
                      <span>YouTube</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>

                {/* Key Metrics: SL Pips vs Gain Pips */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-3 border border-border/60 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Stop Loss (Minor):</span>
                    <span className="font-mono font-black text-red-400">
                      {t.slPips} Pips
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {t.status === "RUNNING_PROFIT" ? "Running Target:" : "Realized Profit:"}
                    </span>
                    <span className="font-mono font-black text-emerald-500">
                      +{t.gainPips} Pips
                    </span>
                  </div>
                </div>

                {/* Returns badge */}
                {t.profitAmount && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">Net Returns:</span>
                    <span className="font-mono font-black text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {t.profitAmount}
                    </span>
                  </div>
                )}

                {/* Notes & Mentor Analysis */}
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

              {/* Card Footer */}
              <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Live Verified Execution
                </span>
                <span className="font-mono">
                  {new Date(t.tradedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High-Resolution Lightbox Modal */}
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
    </div>
  );
}
