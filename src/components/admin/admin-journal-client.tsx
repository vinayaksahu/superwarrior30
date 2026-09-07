"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  Search,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  User,
  Star,
  ZoomIn,
  X,
  Image as ImageIcon,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  addMentorFeedbackAction,
  toggleTradeFeaturedAction,
  adminUpdateTradeAction,
  deleteTradeEntryAction,
} from "@/server/actions/journal.actions";
import { AdminRiskRulesModal } from "@/components/admin/admin-risk-rules-modal";
import type { AcademyRiskRules } from "@/types/risk-manager";
import { DEFAULT_ACADEMY_RISK_RULES } from "@/server/actions/risk-manager.actions";

interface AdminTrade {
  id: string;
  instrument: string;
  market: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  lotSize: number | null;
  pnl: number | null;
  status: string;
  outcome: string;
  riskRewardRatio: string | null;
  setupReason: string | null;
  emotions: string | null;
  mistakes: string | null;
  notes?: string | null;
  screenshotUrl?: string | null;
  mentorFeedback: string | null;
  isFeatured?: boolean;
  tradedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

interface AdminJournalClientProps {
  initialTrades: AdminTrade[];
  total: number;
  initialRiskRules?: AcademyRiskRules;
}

export function AdminJournalClient({
  initialTrades,
  total,
  initialRiskRules,
}: AdminJournalClientProps) {
  const [trades, setTrades] = useState<AdminTrade[]>(initialTrades);
  const [showRiskRulesModal, setShowRiskRulesModal] = useState(false);
  const [riskRules, setRiskRules] = useState<AcademyRiskRules>(
    initialRiskRules || DEFAULT_ACADEMY_RISK_RULES
  );
  const [feedbackTrade, setFeedbackTrade] = useState<AdminTrade | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleFeatured = async (trade: AdminTrade) => {
    const newFeatured = !trade.isFeatured;
    try {
      const res = await toggleTradeFeaturedAction(trade.id, newFeatured);
      if (res.success) {
        toast.success(res.message);
        setTrades((prev) =>
          prev.map((t) => (t.id === trade.id ? { ...t, isFeatured: newFeatured } : t))
        );
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  const handleOpenFeedback = (trade: AdminTrade) => {
    setFeedbackTrade(trade);
    setFeedbackText(trade.mentorFeedback || "");
  };

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTrade || !feedbackText.trim()) return;

    startTransition(async () => {
      const res = await addMentorFeedbackAction(feedbackTrade.id, feedbackText);
      if (res.success) {
        toast.success(res.message);
        setTrades((prev) =>
          prev.map((t) =>
            t.id === feedbackTrade.id ? { ...t, mentorFeedback: feedbackText.trim() } : t
          )
        );
        setFeedbackTrade(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Admin Edit Trade State & Handlers
  const [editingTrade, setEditingTrade] = useState<AdminTrade | null>(null);
  const [editFormData, setEditFormData] = useState({
    instrument: "",
    market: "FOREX",
    direction: "BUY",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    lotSize: "0.01",
    pnl: "",
    status: "CLOSED",
    outcome: "WIN",
    emotions: "CALM",
    mistakes: "NONE",
    notes: "",
    screenshotUrl: "",
    isFeatured: false,
  });

  const handleOpenEdit = (trade: AdminTrade) => {
    setEditingTrade(trade);
    setEditFormData({
      instrument: trade.instrument,
      market: trade.market || "FOREX",
      direction: trade.direction,
      entryPrice: String(trade.entryPrice),
      exitPrice: trade.exitPrice !== null ? String(trade.exitPrice) : "",
      stopLoss: String(trade.stopLoss),
      takeProfit: String(trade.takeProfit),
      lotSize: trade.lotSize !== null ? String(trade.lotSize) : "0.01",
      pnl: trade.pnl !== null ? String(trade.pnl) : "",
      status: trade.status || "CLOSED",
      outcome: trade.outcome || "WIN",
      emotions: trade.emotions || "CALM",
      mistakes: trade.mistakes || "NONE",
      notes: trade.notes || "",
      screenshotUrl: trade.screenshotUrl || "",
      isFeatured: Boolean(trade.isFeatured),
    });
  };

  const handleAdminSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade) return;

    startTransition(async () => {
      const res = await adminUpdateTradeAction(editingTrade.id, {
        instrument: editFormData.instrument,
        market: editFormData.market,
        direction: editFormData.direction as "BUY" | "SELL",
        entryPrice: Number(editFormData.entryPrice),
        exitPrice: Number(editFormData.exitPrice) || undefined,
        stopLoss: Number(editFormData.stopLoss),
        takeProfit: Number(editFormData.takeProfit),
        lotSize: Number(editFormData.lotSize) || undefined,
        pnl: Number(editFormData.pnl) || undefined,
        status: editFormData.status as any,
        outcome: editFormData.outcome as any,
        emotions: editFormData.emotions,
        mistakes: editFormData.mistakes,
        notes: editFormData.notes,
        screenshotUrl: editFormData.screenshotUrl || undefined,
        isFeatured: editFormData.isFeatured,
      });

      if (res.success) {
        toast.success(res.message);
        setTrades((prev) =>
          prev.map((t) =>
            t.id === editingTrade.id
              ? {
                  ...t,
                  ...editFormData,
                  entryPrice: Number(editFormData.entryPrice),
                  exitPrice: Number(editFormData.exitPrice) || null,
                  stopLoss: Number(editFormData.stopLoss),
                  takeProfit: Number(editFormData.takeProfit),
                  lotSize: Number(editFormData.lotSize) || null,
                  pnl: Number(editFormData.pnl) || null,
                  screenshotUrl: editFormData.screenshotUrl || null,
                }
              : t
          )
        );
        setEditingTrade(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleAdminDeleteTrade = (trade: AdminTrade) => {
    if (!confirm(`Are you sure you want to permanently delete trade record for student ${trade.user.name || trade.user.email}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteTradeEntryAction(trade.id);
      if (res.success) {
        toast.success("Trade entry deleted successfully by Admin.");
        setTrades((prev) => prev.filter((t) => t.id !== trade.id));
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Students' Trading Journals & Mentor Review
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitor students' trade discipline, spot emotional traps (FOMO, Revenge Trading), and leave direct mentorship feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRiskRulesModal(true)}
            className="rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500 hover:text-white px-3.5 py-1.5 text-xs font-black text-orange-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-orange-500/10"
          >
            <span>🛡️</span>
            <span>Configure Risk Rules</span>
          </button>
          <span className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
            {total} Total Recorded Trades
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Student</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Pair & Type</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Entry / SL / TP</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">R:R & PnL</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Chart</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Emotion & Mistakes</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Mentor Feedback</th>
                <th className="px-4 py-3.5 text-center font-bold text-muted-foreground">Showcase</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground">No student trade journals found yet.</p>
                    <p className="text-xs mt-1">When students log their trades in their dashboard, they will appear here for your review.</p>
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-foreground">{t.user.name || "Student"}</p>
                        <p className="text-[11px] text-muted-foreground">{t.user.email}</p>
                        {t.user.phone && <p className="text-[10px] text-muted-foreground">📞 {t.user.phone}</p>}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-bold text-foreground">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span>{t.instrument}</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              t.direction === "BUY"
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-red-500/15 text-red-500"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{t.market} • Lot: {t.lotSize || 0.01}</p>
                      </div>
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

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-primary">{t.riskRewardRatio || "1:2"}</span>
                        <p className={`font-mono font-bold text-xs ${t.pnl && t.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {t.outcome} {t.pnl !== null ? `(${t.pnl >= 0 ? `+${t.pnl}` : t.pnl})` : ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {t.screenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImage(t.screenshotUrl || null)}
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
                      <div className="space-y-1">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            t.emotions === "REVENGE" || t.emotions === "FOMO"
                              ? "bg-red-500/15 text-red-500 border border-red-500/30"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          Mindset: {t.emotions || "Calm"}
                        </span>
                        {t.mistakes && t.mistakes !== "NONE" && (
                          <span className="block text-[10px] text-amber-500 font-medium">⚠️ {t.mistakes}</span>
                        )}
                        {t.setupReason && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{t.setupReason}"</p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {t.mentorFeedback ? (
                        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs space-y-0.5">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Rahul Sir's Feedback:
                          </span>
                          <p className="text-[11px] text-foreground leading-snug">{t.mentorFeedback}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Not reviewed yet</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(t)}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          t.isFeatured
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border"
                        }`}
                        title={t.isFeatured ? "Currently featured on Home & Landing Page" : "Click to feature on Home & Landing Page"}
                      >
                        <Star className={`h-3 w-3 ${t.isFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span>{t.isFeatured ? "Featured" : "Feature"}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="inline-flex items-center gap-1 rounded-xl bg-muted border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                          title="Edit Trade Details"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-primary" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenFeedback(t)}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                          title="Give Mentorship Feedback"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{t.mentorFeedback ? "Feedback" : "Review"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminDeleteTrade(t)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                          title="Delete Trade Record (Admin Only)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Trade Modal */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Edit2 className="h-4 w-4 text-primary" /> Edit Student Trade (Admin Master Control)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Student: {editingTrade.user.name || editingTrade.user.email} • ID: {editingTrade.id.slice(0, 8)}...
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrade(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminSaveTrade} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Pair / Instrument</label>
                  <input
                    type="text"
                    required
                    value={editFormData.instrument}
                    onChange={(e) => setEditFormData({ ...editFormData, instrument: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Market</label>
                  <select
                    value={editFormData.market}
                    onChange={(e) => setEditFormData({ ...editFormData, market: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="FOREX">FOREX</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="INDIAN_STOCKS">INDIAN STOCKS</option>
                    <option value="COMMODITIES">COMMODITIES</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Direction</label>
                  <select
                    value={editFormData.direction}
                    onChange={(e) => setEditFormData({ ...editFormData, direction: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground font-sans">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editFormData.entryPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, entryPrice: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground font-sans">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editFormData.stopLoss}
                    onChange={(e) => setEditFormData({ ...editFormData, stopLoss: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none text-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground font-sans">Take Profit</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editFormData.takeProfit}
                    onChange={(e) => setEditFormData({ ...editFormData, takeProfit: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none text-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground font-sans">Exit Price</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.exitPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, exitPrice: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Lot Size</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.lotSize}
                    onChange={(e) => setEditFormData({ ...editFormData, lotSize: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">PnL ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.pnl}
                    onChange={(e) => setEditFormData({ ...editFormData, pnl: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Trade Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Outcome</label>
                  <select
                    value={editFormData.outcome}
                    onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BREAKEVEN">BREAKEVEN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Emotions / Psychology</label>
                  <select
                    value={editFormData.emotions}
                    onChange={(e) => setEditFormData({ ...editFormData, emotions: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="CALM">CALM & DISCIPLINED</option>
                    <option value="CONFIDENT">CONFIDENT</option>
                    <option value="FOMO">FOMO (Chased the move)</option>
                    <option value="GREED">GREED (Held too long)</option>
                    <option value="FEAR">FEAR (Exited too early)</option>
                    <option value="REVENGE">REVENGE TRADING</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Mistakes</label>
                  <select
                    value={editFormData.mistakes}
                    onChange={(e) => setEditFormData({ ...editFormData, mistakes: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="NONE">NONE (Followed Rules 100%)</option>
                    <option value="OVERTRADING">Overtrading</option>
                    <option value="OVERSIZED_LOT">Oversized Lot / High Risk</option>
                    <option value="MOVED_STOP_LOSS">Moved Stop Loss</option>
                    <option value="CHASED_CANDLE">Chased Green/Red Candle</option>
                    <option value="NO_SETUP">No Valid Setup / Random Trade</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Trade Notes / Strategy Explanation</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Notes from student or notes regarding correction..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Chart Screenshot URL</label>
                <input
                  type="url"
                  value={editFormData.screenshotUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, screenshotUrl: e.target.value })}
                  placeholder="https://... image link"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                <input
                  type="checkbox"
                  id="adminFeaturedCheckbox"
                  checked={editFormData.isFeatured}
                  onChange={(e) => setEditFormData({ ...editFormData, isFeatured: e.target.checked })}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="adminFeaturedCheckbox" className="font-semibold text-foreground cursor-pointer">
                  Approve & Showcase on Public Landing / Home Page
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentor Feedback Modal */}
      {feedbackTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Give Mentor Feedback
                </h3>
                <p className="text-xs text-muted-foreground">
                  Trade: {feedbackTrade.instrument} ({feedbackTrade.direction}) • Student: {feedbackTrade.user.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackTrade(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Mentor Guidance / Correction Notes</label>
                <textarea
                  rows={4}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Good patience on SNR entry, but lot size was too big. Stick to 0.01 lot for your capital size to protect against drawdown."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFeedbackTrade(null)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Feedback"}
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

      {/* Admin Risk Rules Configuration Modal */}
      <AdminRiskRulesModal
        initialRules={riskRules}
        isOpen={showRiskRulesModal}
        onClose={() => setShowRiskRulesModal(false)}
        onSaved={(newRules) => setRiskRules(newRules)}
      />
    </div>
  );
}
