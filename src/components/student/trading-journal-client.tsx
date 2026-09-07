"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Brain,
  Scale,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  MessageSquare,
  Sparkles,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createTradeEntryAction, deleteTradeEntryAction } from "@/server/actions/journal.actions";

interface Trade {
  id: string;
  instrument: string;
  market: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  lotSize: number | null;
  riskAmount: number | null;
  pnl: number | null;
  status: string;
  outcome: string;
  riskRewardRatio: string | null;
  setupReason: string | null;
  emotions: string | null;
  mistakes: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  mentorFeedback: string | null;
  isFeatured?: boolean;
  tradedAt: Date;
}

interface JournalStats {
  totalTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnL: number;
  disciplineScore: number;
}

interface TradingJournalClientProps {
  initialTrades: Trade[];
  stats: JournalStats | null;
}

export function TradingJournalClient({
  initialTrades,
  stats,
}: TradingJournalClientProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [filter, setFilter] = useState<string>("ALL");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // New trade form state
  const [formData, setFormData] = useState({
    instrument: "XAUUSD",
    market: "GOLD",
    direction: "BUY" as "BUY" | "SELL",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    lotSize: "0.01",
    pnl: "",
    status: "CLOSED" as "OPEN" | "CLOSED",
    outcome: "WIN" as "WIN" | "LOSS" | "BREAKEVEN" | "PENDING",
    emotions: "CALM",
    mistakes: "NONE",
    setupReason: "",
    notes: "",
    screenshotUrl: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Screenshot size must be under 15MB");
      return;
    }

    setUploadingScreenshot(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("category", "journal");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.success && (json.url || json.cdnUrl)) {
        const url = json.url || json.cdnUrl;
        setFormData((prev) => ({ ...prev, screenshotUrl: url }));
        toast.success("Chart screenshot uploaded successfully!");
      } else {
        toast.error(json.error || "Failed to upload chart screenshot");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Network error while uploading screenshot");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instrument || !formData.entryPrice || !formData.stopLoss || !formData.takeProfit) {
      toast.error("Please fill required fields (Pair, Entry, Stop Loss, Target).");
      return;
    }

    startTransition(async () => {
      const res = await createTradeEntryAction({
        instrument: formData.instrument,
        market: formData.market,
        direction: formData.direction,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit: parseFloat(formData.takeProfit),
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : undefined,
        pnl: formData.pnl ? parseFloat(formData.pnl) : undefined,
        status: formData.status,
        outcome: formData.outcome,
        emotions: formData.emotions,
        mistakes: formData.mistakes,
        setupReason: formData.setupReason,
        notes: formData.notes,
        screenshotUrl: formData.screenshotUrl || undefined,
      });

      if (res.success) {
        toast.success(res.message);
        setShowModal(false);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = (tradeId: string) => {
    if (!confirm("Are you sure you want to remove this trade record?")) return;
    startTransition(async () => {
      const res = await deleteTradeEntryAction(tradeId);
      if (res.success) {
        toast.success(res.message);
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      } else {
        toast.error(res.message);
      }
    });
  };

  const filteredTrades = trades.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "WINS") return t.outcome === "WIN";
    if (filter === "LOSSES") return t.outcome === "LOSS";
    if (filter === "OPEN") return t.status === "OPEN";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            My Trading Journal & Discipline Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Record every trade, calculate risk:reward, track emotions, and receive direct mentor reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Log New Trade
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-black text-foreground">{stats.totalTrades}</p>
            <p className="text-[10px] text-muted-foreground">{stats.openTrades} Active Open</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-black text-primary">{stats.winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Net P&L</p>
            <p className={`text-2xl font-black ${stats.totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {stats.totalPnL >= 0 ? `+${stats.totalPnL}` : stats.totalPnL}
            </p>
            <p className="text-[10px] text-muted-foreground">Recorded Profit/Loss</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Discipline Score</p>
            <p className="text-2xl font-black text-amber-500">{stats.disciplineScore}%</p>
            <p className="text-[10px] text-muted-foreground">Zero-Emotion Trades</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 col-span-2 sm:col-span-4 lg:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mentor Review</p>
            <div className="flex items-center gap-1.5 pt-1 text-emerald-500 text-xs font-bold">
              <Sparkles className="h-4 w-4" /> Active Mentorship
            </div>
            <p className="text-[10px] text-muted-foreground">Mentor checks your mistakes</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[
          { label: "All Trades", value: "ALL" },
          { label: "Winning Trades (W)", value: "WINS" },
          { label: "Losing Trades (L)", value: "LOSSES" },
          { label: "Open Positions", value: "OPEN" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === tab.value
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Pair / Market</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Direction</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Entry / SL / TP</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">R:R Ratio</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Outcome & PnL</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Chart</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Mindset / Emotion</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Mentor Feedback</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground">No trades found in your journal.</p>
                    <p className="text-xs mt-1">Click "Log New Trade" to record your setup, entry, and emotions.</p>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">
                      <div>
                        <span>{t.instrument}</span>
                        <span className="block text-[10px] text-muted-foreground font-medium uppercase">{t.market}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          t.direction === "BUY"
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-500 border border-red-500/30"
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      <div>
                        <span className="text-foreground">E: {t.entryPrice}</span>
                        <div className="text-[10px] text-muted-foreground flex gap-2">
                          <span className="text-red-400">SL: {t.stopLoss}</span>
                          <span className="text-emerald-400">TP: {t.takeProfit}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {t.riskRewardRatio || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.outcome === "WIN"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : t.outcome === "LOSS"
                              ? "bg-red-500/15 text-red-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.outcome}
                        </span>
                        {t.pnl !== null && (
                          <p className={`font-mono text-xs font-bold ${t.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {t.pnl >= 0 ? `+${t.pnl}` : t.pnl}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {t.screenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImage(t.screenshotUrl)}
                          className="relative h-11 w-16 rounded-lg overflow-hidden border border-border bg-black/40 group cursor-pointer hover:border-primary transition-all shadow-sm block text-left"
                          title="Click to view chart screenshot"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.screenshotUrl}
                            alt="Chart"
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No image</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-medium text-foreground">{t.emotions || "Calm"}</span>
                        {t.mistakes && t.mistakes !== "NONE" && (
                          <span className="block text-[10px] text-amber-500 font-semibold">⚠️ {t.mistakes}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {t.mentorFeedback ? (
                        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Sparkles className="h-3 w-3" /> Rahul Sir:
                          </div>
                          <p className="text-[11px] text-foreground leading-snug">{t.mentorFeedback}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Pending mentor review</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Trade Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> Log Trade in Journal
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrade} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Pair / Instrument *</label>
                  <input
                    type="text"
                    required
                    value={formData.instrument}
                    onChange={(e) => setFormData((p) => ({ ...p, instrument: e.target.value }))}
                    placeholder="e.g. XAUUSD, EURUSD"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 uppercase font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Market</label>
                  <select
                    value={formData.market}
                    onChange={(e) => setFormData((p) => ({ ...p, market: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-medium focus:border-primary focus:outline-none"
                  >
                    <option value="GOLD">Gold (XAUUSD)</option>
                    <option value="FOREX">Forex</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="STOCKS">Indices / Stocks</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Direction *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, direction: "BUY" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all ${
                        formData.direction === "BUY"
                          ? "bg-emerald-500 text-white shadow"
                          : "border border-border bg-background text-muted-foreground"
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, direction: "SELL" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all ${
                        formData.direction === "SELL"
                          ? "bg-red-500 text-white shadow"
                          : "border border-border bg-background text-muted-foreground"
                      }`}
                    >
                      SELL / SHORT
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Lot Size</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lotSize}
                    onChange={(e) => setFormData((p) => ({ ...p, lotSize: e.target.value }))}
                    placeholder="0.01"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Entry Price *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.entryPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, entryPrice: e.target.value }))}
                    placeholder="2650.50"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-red-400">Stop Loss *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.stopLoss}
                    onChange={(e) => setFormData((p) => ({ ...p, stopLoss: e.target.value }))}
                    placeholder="2645.00"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-emerald-400">Take Profit *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.takeProfit}
                    onChange={(e) => setFormData((p) => ({ ...p, takeProfit: e.target.value }))}
                    placeholder="2662.00"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Outcome</label>
                  <select
                    value={formData.outcome}
                    onChange={(e) => setFormData((p) => ({ ...p, outcome: e.target.value as any }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="WIN">WIN (Profit)</option>
                    <option value="LOSS">LOSS (Stop Loss)</option>
                    <option value="BREAKEVEN">BREAKEVEN (Cost-to-Cost)</option>
                    <option value="PENDING">STILL OPEN / PENDING</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">P&L Amount ($ or ₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.pnl}
                    onChange={(e) => setFormData((p) => ({ ...p, pnl: e.target.value }))}
                    placeholder="+25.00 or -10.00"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Emotions During Trade</label>
                  <select
                    value={formData.emotions}
                    onChange={(e) => setFormData((p) => ({ ...p, emotions: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="CALM">Calm & Disciplined ✓</option>
                    <option value="FOMO">FOMO (Chased the candle)</option>
                    <option value="REVENGE">Revenge Trade (Anger)</option>
                    <option value="ANXIOUS">Anxious / Scared</option>
                    <option value="GREED">Greedy (Wanted more)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Mistake Tag</label>
                  <select
                    value={formData.mistakes}
                    onChange={(e) => setFormData((p) => ({ ...p, mistakes: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="NONE">No Mistake (Followed Rules) ✓</option>
                    <option value="EARLY_EXIT">Exited Too Early in Profit</option>
                    <option value="MOVED_SL">Moved Stop Loss / Held Loser</option>
                    <option value="OVERTRADING">Overtrading</option>
                    <option value="OVER_LEVERAGED">Too Big Lot Size</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Technical Setup Reason & Notes</label>
                <textarea
                  rows={2}
                  value={formData.setupReason}
                  onChange={(e) => setFormData((p) => ({ ...p, setupReason: e.target.value }))}
                  placeholder="e.g. Liquidity sweep on 15m SNR with rejection candle confirmation"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Trade / Chart Screenshot Upload */}
              <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Chart Screenshot (PNG, JPG, WEBP)</span>
                  </label>
                  {formData.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, screenshotUrl: "" }))}
                      className="text-[10px] text-destructive hover:underline cursor-pointer font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {formData.screenshotUrl ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black/40 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.screenshotUrl}
                      alt="Trade preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1 backdrop-blur-xs">
                      <CheckCircle2 className="h-3 w-3" /> Screenshot Attached
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingScreenshot}
                        onChange={handleFileUpload}
                      />
                      {uploadingScreenshot ? (
                        <div className="flex items-center gap-2 text-primary text-xs font-semibold py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading screenshot to CDN...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center py-1">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">Click to upload chart screenshot</span>
                          <span className="text-[10px] text-muted-foreground">PNG, JPG, JPEG, WEBP up to 15MB</span>
                        </div>
                      )}
                    </label>

                    <input
                      type="url"
                      value={formData.screenshotUrl}
                      onChange={(e) => setFormData((p) => ({ ...p, screenshotUrl: e.target.value }))}
                      placeholder="Or paste screenshot URL (TradingView, Lightshot, etc.)"
                      className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || uploadingScreenshot}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Res Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl border border-border overflow-hidden p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black cursor-pointer shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Trade chart screenshot"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
