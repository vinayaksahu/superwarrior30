"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit2,
  TrendingUp,
  Target,
  Sparkles,
  ShieldCheck,
  ZoomIn,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Eye,
  Flame,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import {
  createLiveTradeProofAction,
  updateLiveTradeProofAction,
  deleteLiveTradeProofAction,
} from "@/server/actions/live-trades.actions";
import type { LiveTradeProofInput } from "@/types";

export interface LiveTradeProofRecord {
  id: string;
  title: string;
  instrument: string;
  market: string;
  tradeDirection: "BUY" | "SELL";
  sessionType: string;
  youtubeUrl?: string | null;
  screenshotUrl: string;
  slPips: number;
  gainPips: number;
  riskRewardRatio: string;
  status: "PROFIT_BOOKED" | "RUNNING_PROFIT" | "BREAKEVEN";
  profitAmount?: string | null;
  notes?: string | null;
  showOnHome: boolean;
  showOnLanding: boolean;
  showOnDashboard: boolean;
  isFeatured: boolean;
  displayOrder: number;
  tradedAt: string | Date;
  createdAt: string | Date;
}

interface AdminLiveTradesClientProps {
  initialTrades: LiveTradeProofRecord[];
  total: number;
}

export function AdminLiveTradesClient({
  initialTrades = [],
  total: initialTotal = 0,
}: AdminLiveTradesClientProps) {
  const [trades, setTrades] = useState<LiveTradeProofRecord[]>(initialTrades);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<LiveTradeProofRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<LiveTradeProofInput>({
    title: "",
    instrument: "XAUUSD",
    market: "GOLD",
    tradeDirection: "BUY",
    sessionType: "YouTube Live Session",
    youtubeUrl: "",
    screenshotUrl: "",
    slPips: 15,
    gainPips: 75,
    riskRewardRatio: "1:5",
    status: "PROFIT_BOOKED",
    profitAmount: "+75 Pips",
    notes: "",
    showOnHome: true,
    showOnLanding: true,
    showOnDashboard: true,
    isFeatured: true,
    tradedAt: new Date().toISOString().split("T")[0],
  });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<LiveTradeProofRecord | null>(null);

  // Quick stats
  const totalCount = trades.length;
  const bookedCount = trades.filter((t) => t.status === "PROFIT_BOOKED").length;
  const runningCount = trades.filter((t) => t.status === "RUNNING_PROFIT").length;
  const avgSL =
    totalCount > 0
      ? (trades.reduce((acc, t) => acc + (t.slPips || 15), 0) / totalCount).toFixed(1)
      : "15";

  // Filtered trades
  const filteredTrades = trades.filter((trade) => {
    const matchSearch =
      !search.trim() ||
      trade.title.toLowerCase().includes(search.toLowerCase()) ||
      trade.instrument.toLowerCase().includes(search.toLowerCase()) ||
      (trade.notes && trade.notes.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === "all" || trade.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreateModal = () => {
    setEditingTrade(null);
    setFormData({
      title: "",
      instrument: "XAUUSD",
      market: "GOLD",
      tradeDirection: "BUY",
      sessionType: "YouTube Live Session",
      youtubeUrl: "",
      screenshotUrl: "",
      slPips: 15,
      gainPips: 75,
      riskRewardRatio: "1:5",
      status: "PROFIT_BOOKED",
      profitAmount: "+75 Pips",
      notes: "",
      showOnHome: true,
      showOnLanding: true,
      showOnDashboard: true,
      isFeatured: true,
      tradedAt: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (trade: LiveTradeProofRecord) => {
    setEditingTrade(trade);
    const dateStr = trade.tradedAt
      ? new Date(trade.tradedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setFormData({
      title: trade.title,
      instrument: trade.instrument,
      market: trade.market,
      tradeDirection: trade.tradeDirection,
      sessionType: trade.sessionType,
      youtubeUrl: trade.youtubeUrl || "",
      screenshotUrl: trade.screenshotUrl,
      slPips: trade.slPips,
      gainPips: trade.gainPips,
      riskRewardRatio: trade.riskRewardRatio,
      status: trade.status,
      profitAmount: trade.profitAmount || "",
      notes: trade.notes || "",
      showOnHome: trade.showOnHome,
      showOnLanding: trade.showOnLanding,
      showOnDashboard: trade.showOnDashboard,
      isFeatured: trade.isFeatured,
      tradedAt: dateStr,
    });
    setIsModalOpen(true);
  };

  // Recalculate R:R when SL or Gain changes
  const handlePipsChange = (type: "sl" | "gain", value: number) => {
    const sl = type === "sl" ? value : formData.slPips;
    const gain = type === "gain" ? value : formData.gainPips;
    let rr = formData.riskRewardRatio;
    if (sl > 0 && gain > 0) {
      const ratio = (gain / sl).toFixed(1);
      rr = `1:${ratio.endsWith(".0") ? ratio.slice(0, -2) : ratio}`;
    }

    setFormData((prev) => ({
      ...prev,
      [type === "sl" ? "slPips" : "gainPips"]: value,
      riskRewardRatio: rr,
    }));
  };

  // Upload screenshot via /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", "screenshot");

      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload screenshot");
      }

      setFormData((prev) => ({
        ...prev,
        screenshotUrl: json.url || json.cdnUrl,
      }));
      toast.success("Screenshot uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload trade screenshot.");
    } finally {
      setIsUploading(false);
    }
  };

  // Save (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a trade title or live session name.");
      return;
    }
    if (!formData.instrument.trim()) {
      toast.error("Please enter an instrument (e.g. XAUUSD, EURUSD).");
      return;
    }
    if (!formData.screenshotUrl.trim()) {
      toast.error("Please upload or provide a trade screenshot.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingTrade) {
          const res = await updateLiveTradeProofAction(editingTrade.id, formData);
          if (!res.success) throw new Error(res.message);

          setTrades((prev) =>
            prev.map((t) =>
              t.id === editingTrade.id
                ? {
                    ...t,
                    ...formData,
                    sessionType: formData.sessionType || t.sessionType,
                    riskRewardRatio: formData.riskRewardRatio || t.riskRewardRatio,
                    tradedAt: formData.tradedAt ? new Date(formData.tradedAt) : t.tradedAt,
                  }
                : t
            )
          );
          toast.success("YouTube live trade updated!");
        } else {
          const res = await createLiveTradeProofAction(formData);
          if (!res.success) throw new Error(res.message);

          const newTrade: LiveTradeProofRecord = {
            id: res.tradeId || `trade_${Date.now()}`,
            ...formData,
            sessionType: formData.sessionType || "YouTube Live Session",
            riskRewardRatio: formData.riskRewardRatio || "1:4",
            youtubeUrl: formData.youtubeUrl || null,
            profitAmount: formData.profitAmount || null,
            notes: formData.notes || null,
            market: formData.market || "FOREX",
            status: formData.status || "PROFIT_BOOKED",
            showOnHome: formData.showOnHome ?? true,
            showOnLanding: formData.showOnLanding ?? true,
            showOnDashboard: formData.showOnDashboard ?? true,
            isFeatured: formData.isFeatured ?? true,
            displayOrder: 0,
            tradedAt: formData.tradedAt ? new Date(formData.tradedAt) : new Date(),
            createdAt: new Date(),
          };

          setTrades((prev) => [newTrade, ...prev]);
          toast.success("YouTube Live Trade published successfully!");
        }

        setIsModalOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to save trade proof.");
      }
    });
  };

  // Delete
  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this YouTube live trade proof?")) return;

    startTransition(async () => {
      try {
        const res = await deleteLiveTradeProofAction(id);
        if (!res.success) throw new Error(res.message);

        setTrades((prev) => prev.filter((t) => t.id !== id));
        toast.success("Trade proof deleted.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete trade.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                YouTube Live Trade Proofs
                <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-black text-red-500 border border-red-500/20">
                  LIVE PROOF
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                YouTube Live stream ke trading screenshots, 15-30 Pips SL, Profit Pips, Risk-Reward & Notes manage karein
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Upload YouTube Live Trade</span>
        </button>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Live Proofs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <span className="text-xs text-muted-foreground">Verified trades</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-emerald-500 uppercase">Profit Booked</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500">{bookedCount}</span>
            <span className="text-xs text-emerald-600/70">Targets Hit ✓</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-blue-400 uppercase">Running Trades</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400">{runningCount}</span>
            <span className="text-xs text-blue-500/70">Trail SL Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-amber-500 uppercase">Avg SL Rule</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500">{avgSL} Pips</span>
            <span className="text-xs text-amber-600/70">Minor 15-30 Pips</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, instrument (e.g. XAUUSD), or strategy notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="PROFIT_BOOKED">Profit Booked (बुक किया)</option>
            <option value="RUNNING_PROFIT">Running Profit (रनिंग)</option>
            <option value="BREAKEVEN">Breakeven</option>
          </select>
        </div>
      </div>

      {/* Grid of Live Trade Proofs */}
      {filteredTrades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No YouTube live trade proofs found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Abhi koi trade proof nahi mila. Upar "Upload YouTube Live Trade" button se apna pehla trade screenshot upload karein!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrades.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Screenshot with Lightbox trigger */}
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
                    <span>Zoom Screenshot</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`absolute top-3 left-3 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm shadow z-10 ${
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

                  {/* R:R Badge */}
                  <span className="absolute top-3 right-3 rounded-md bg-black/80 border border-primary/40 px-2 py-0.5 text-[11px] font-mono font-black text-primary backdrop-blur-sm shadow z-10">
                    {t.riskRewardRatio} R:R
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Title & Instrument */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-foreground">{t.instrument}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold ${
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

                  {/* Metric Box: SL Pips vs Gain Pips */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5 border border-border/60 text-[11px]">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Stop Loss (Minor):</span>
                      <span className="font-mono font-bold text-red-400">
                        {t.slPips} Pips
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        {t.status === "RUNNING_PROFIT" ? "Running Gain:" : "Realized Gain:"}
                      </span>
                      <span className="font-mono font-black text-emerald-500">
                        +{t.gainPips} Pips
                      </span>
                    </div>
                  </div>

                  {/* Profit Amount Note */}
                  {t.profitAmount && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[10px]">Net Returns:</span>
                      <span className="font-mono font-black text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {t.profitAmount}
                      </span>
                    </div>
                  )}

                  {/* Notes / Strategy */}
                  {t.notes && (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      "{t.notes}"
                    </div>
                  )}

                  {/* Visibility Badges */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.showOnHome && (
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
                        Home ✓
                      </span>
                    )}
                    {t.showOnLanding && (
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
                        Landing ✓
                      </span>
                    )}
                    {t.showOnDashboard && (
                      <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400">
                        Student Dash ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0 border-t border-border/60 flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(t.tradedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(t)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Edit Trade Proof"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                    title="Delete Trade Proof"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingTrade ? "Edit YouTube Live Trade Proof" : "New YouTube Live Trade Proof"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Screenshot, SL/Target Pips, R:R aur psychology notes upload karein
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Trade Title / Live Session Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. XAUUSD Gold 15 Pips SL Blast - London Session"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Instrument & Market */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Instrument <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XAUUSD, EURUSD"
                    value={formData.instrument}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instrument: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Market Category</label>
                  <select
                    value={formData.market}
                    onChange={(e) => setFormData((prev) => ({ ...prev, market: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    <option value="GOLD">GOLD / COMMODITY</option>
                    <option value="FOREX">FOREX</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="INDICES">INDICES / NIFTY / BANKNIFTY</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Trade Direction</label>
                  <select
                    value={formData.tradeDirection}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tradeDirection: e.target.value as "BUY" | "SELL",
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    <option value="BUY">BUY (Long)</option>
                    <option value="SELL">SELL (Short)</option>
                  </select>
                </div>
              </div>

              {/* SL Pips, Gain Pips, Risk-Reward Ratio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Stop Loss (Pips) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="15"
                    value={formData.slPips}
                    onChange={(e) => handlePipsChange("sl", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Minor SL (15, 20, 30 max)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Profit / Gain (Pips) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="75"
                    value={formData.gainPips}
                    onChange={(e) => handlePipsChange("gain", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Target or Running Pips</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Risk:Reward Ratio</label>
                  <input
                    type="text"
                    placeholder="1:5"
                    value={formData.riskRewardRatio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, riskRewardRatio: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono font-bold text-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Auto-calculated or custom</span>
                </div>
              </div>

              {/* Status & Profit Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Trade Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as "PROFIT_BOOKED" | "RUNNING_PROFIT" | "BREAKEVEN",
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    <option value="PROFIT_BOOKED">PROFIT BOOKED (बुक किया)</option>
                    <option value="RUNNING_PROFIT">RUNNING PROFIT (रनिंग प्रॉफिट)</option>
                    <option value="BREAKEVEN">BREAKEVEN</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Profit Amount / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. +₹45,000 or +150 Pips"
                    value={formData.profitAmount || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, profitAmount: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Screenshot Upload / Input */}
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Trade Screenshot <span className="text-red-500">*</span>
                  </label>
                  {isUploading && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading image...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <label className="flex-1 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-primary" />
                    <span>Choose Screenshot from Computer / Phone</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>

                  <span className="text-xs text-muted-foreground font-bold">OR</span>

                  <input
                    type="url"
                    placeholder="Paste Screenshot Image URL"
                    value={formData.screenshotUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, screenshotUrl: e.target.value }))
                    }
                    className="flex-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {formData.screenshotUrl && (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border mt-2 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.screenshotUrl}
                      alt="Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* YouTube URL & Traded Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    YouTube Live Link / Replay URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/live/..."
                    value={formData.youtubeUrl || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Trade Date</label>
                  <input
                    type="date"
                    value={
                      typeof formData.tradedAt === "string"
                        ? formData.tradedAt
                        : new Date(formData.tradedAt || Date.now()).toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tradedAt: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes & Strategy Explanation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Psychology & Strategy Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this trade was taken on YouTube live, how 15-30 Pips SL was managed, patience, liquidity sweep, and psychology..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              {/* Visibility Switches */}
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                <span className="text-xs font-bold text-foreground block mb-1">
                  Where should this proof be visible?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.showOnHome}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, showOnHome: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                    />
                    <span>Homepage (/)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.showOnLanding}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, showOnLanding: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                    />
                    <span>Landing Page (/super-warrior-30)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.showOnDashboard}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, showOnDashboard: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                    />
                    <span>Student Dashboard</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-red-600/20"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Trade...
                    </>
                  ) : editingTrade ? (
                    "Save Changes"
                  ) : (
                    "Publish YouTube Trade"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
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
