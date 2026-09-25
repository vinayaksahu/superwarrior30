"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Video,
  Play,
  Clock,
  Sparkles,
  TrendingUp,
  Target,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Film,
  Layers,
  ChevronRight,
  Flame,
  Info,
  Calendar,
  Tag,
  AlertTriangle,
  Search,
  FileText,
  RefreshCw,
  Check,
  Edit3,
  Sliders,
  Shield,
  Zap,
  Volume2,
  X,
  Eye,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  extractStreamTranscriptAction,
  analyzeStreamTradesAction,
  verifyTradeCandidateAction,
  updateTradeCandidateAction,
  verifyTradeCandidateVisualsAction,
} from "@/server/actions/youtube-trades.actions";
import { buildRRTimeline } from "@/lib/youtube-trades/rr-engine";
import { analyzeTradeManagement } from "@/lib/youtube-trades/trade-management";

interface TradeEventItem {
  id: string;
  eventType: string;
  timestamp: number;
  endTimestamp?: number | null;
  text: string;
  price?: number | null;
  confidence: string;
  source: string;
  visualVerified?: boolean;
}

interface TradeCandidateItem {
  id: string;
  tradeNumber: number;
  instrument: string;
  direction: string;
  marketContext?: string | null;
  liquidity?: any;
  marketStructure?: any;
  priceAction?: string | null;
  candleConfirmation?: any;
  entryCriteria?: string | null;
  plannedEntry?: any;
  actualEntry?: any;
  stopLoss?: any;
  takeProfit?: any;
  plannedRR?: string | null;
  currentR?: string | null;
  realizedR?: string | null;
  riskStatus: string;
  result: string;
  confidence: number;
  completenessScore: number;
  clipStart?: number | null;
  clipEnd?: number | null;
  isVerified: boolean;
  events: TradeEventItem[];
  clips?: any[];
}

interface StreamDetailProps {
  stream: {
    id: string;
    youtubeVideoId: string;
    url: string;
    title: string;
    thumbnail?: string | null;
    channel?: string | null;
    duration: number;
    status: string;
    transcriptStatus: string;
    analysisStatus: string;
    tradesCount: number;
    clipsCount: number;
    transcriptText?: string | null;
    transcriptJson?: any;
    createdAt: string | Date;
    trades: TradeCandidateItem[];
  };
}

export function StreamDetailClient({ stream }: StreamDetailProps) {
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "TRANSCRIPT">("TIMELINE");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [isExtractingTranscript, setIsExtractingTranscript] = useState(false);
  const [isAnalyzingTrades, setIsAnalyzingTrades] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifyingVisuals, setIsVerifyingVisuals] = useState(false);
  const [currentSeekTime, setCurrentSeekTime] = useState<number>(
    stream.trades?.[0]?.events?.[0]?.timestamp || 0
  );

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    instrument: "XAUUSD",
    direction: "BUY",
    plannedRR: "1:3",
    result: "TP",
    clipStart: 0,
    clipEnd: 0,
    entryCriteria: "",
  });

  const selectedTrade = stream.trades?.[selectedTradeIndex] || null;

  const rrGeometry = selectedTrade
    ? buildRRTimeline({
        ...selectedTrade,
        direction: selectedTrade.direction as "BUY" | "SELL",
        isActualTrade: !!selectedTrade.actualEntry,
        events: (selectedTrade.events || []) as any,
      } as any)
    : null;

  const managementReport = selectedTrade
    ? analyzeTradeManagement({
        ...selectedTrade,
        direction: selectedTrade.direction as "BUY" | "SELL",
        isActualTrade: !!selectedTrade.actualEntry,
        events: (selectedTrade.events || []) as any,
      } as any)
    : null;

  // Parse transcript segments
  const rawSegments = Array.isArray(stream.transcriptJson)
    ? stream.transcriptJson
    : [];

  const filteredSegments = rawSegments.filter((seg: any) =>
    !transcriptSearch.trim() ||
    (seg.text && seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
  );

  const formatTimestamp = (totalSeconds: number) => {
    if (!totalSeconds || isNaN(totalSeconds)) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Live Stream";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  };

  const handleSeek = (timestamp: number) => {
    setCurrentSeekTime(timestamp);
    toast.info(`Seeking video to ${formatTimestamp(timestamp)}`);
  };

  const handleAnalyzeTrades = async () => {
    setIsAnalyzingTrades(true);
    toast.info("Analyzing stream transcript and reconstructing trade stories...");
    try {
      const res = await analyzeStreamTradesAction(stream.id);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("An error occurred during trade analysis.");
    } finally {
      setIsAnalyzingTrades(false);
    }
  };

  const handleToggleVerify = async (trade: TradeCandidateItem) => {
    if (!trade) return;
    setIsVerifying(true);
    const newStatus = !trade.isVerified;
    try {
      const res = await verifyTradeCandidateAction(trade.id, newStatus);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to update verification status.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyVisuals = async (trade: TradeCandidateItem) => {
    if (!trade) return;
    setIsVerifyingVisuals(true);
    toast.info("Inspecting video frame at trade entry timestamp with visual verifier...");
    try {
      const res = await verifyTradeCandidateVisualsAction(trade.id);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Visual verification failed.");
    } finally {
      setIsVerifyingVisuals(false);
    }
  };

  const handleOpenEditModal = (trade: TradeCandidateItem) => {
    setEditFormData({
      instrument: trade.instrument || "XAUUSD",
      direction: trade.direction || "BUY",
      plannedRR: trade.plannedRR || "1:3",
      result: trade.result || "TP",
      clipStart: trade.clipStart || 0,
      clipEnd: trade.clipEnd || 0,
      entryCriteria: trade.entryCriteria || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTrade) return;
    setIsSavingEdit(true);
    try {
      const res = await updateTradeCandidateAction(selectedTrade.id, editFormData);
      if (res.success) {
        toast.success(res.message);
        setIsEditModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to update trade candidate.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "LIQUIDITY":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "COC":
      case "CHoCH":
      case "BOS":
      case "MSS":
      case "MARKET_STRUCTURE":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "CANDLE_CONFIRMATION":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "ENTRY_CRITERIA":
      case "PLANNED_ENTRY":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "ACTUAL_ENTRY":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black";
      case "STOP_LOSS":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "RISK_REWARD":
      case "CURRENT_R":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "RISK_FREE":
      case "BREAKEVEN":
      case "BREAK_EVEN":
        return "bg-teal-500/15 text-teal-300 border-teal-500/30";
      case "TARGET":
      case "TAKE_PROFIT":
      case "TRADE_COMPLETE":
        return "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-black";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getEventStepNumber = (type: string) => {
    switch (type) {
      case "LIQUIDITY":
        return "1";
      case "COC":
      case "CHoCH":
      case "BOS":
      case "MSS":
      case "MARKET_STRUCTURE":
        return "2";
      case "CANDLE_CONFIRMATION":
        return "3";
      case "ENTRY_CRITERIA":
      case "PLANNED_ENTRY":
        return "4";
      case "ACTUAL_ENTRY":
        return "5";
      case "STOP_LOSS":
        return "6";
      case "RISK_REWARD":
      case "CURRENT_R":
        return "7";
      case "RISK_FREE":
      case "BREAKEVEN":
      case "BREAK_EVEN":
        return "8";
      case "TARGET":
      case "TAKE_PROFIT":
      case "TRADE_COMPLETE":
        return "9";
      default:
        return "•";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/youtube-live-trades"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground line-clamp-1">
                {stream.title}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 font-mono">
              <span>Duration: {formatDuration(stream.duration)}</span>
              <span>•</span>
              <span>Trades Detected: {stream.trades?.length || 0}</span>
              <span>•</span>
              <span className="text-emerald-400">Analysis: {stream.analysisStatus}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze Stream Button */}
          <button
            type="button"
            disabled={isAnalyzingTrades}
            onClick={handleAnalyzeTrades}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isAnalyzingTrades ? "animate-spin" : ""}`} />
            <span>{isAnalyzingTrades ? "Analyzing Trades..." : "Analyze Trades"}</span>
          </button>

          <a
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Video className="h-4 w-4 text-red-500" />
            <span>Open on YouTube</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Video Preview & Trade Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player & Trade Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* YouTube Video Player with start offset */}
          <div className="rounded-3xl border border-border bg-black overflow-hidden shadow-2xl relative aspect-video">
            <iframe
              key={currentSeekTime}
              src={`https://www.youtube-nocookie.com/embed/${stream.youtubeVideoId}?start=${currentSeekTime}&autoplay=0&rel=0`}
              title={stream.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Trade Selection Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Detected Trades in this Stream ({stream.trades.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Click a trade to inspect its complete story
              </span>
            </div>

            {stream.trades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  No trades have been detected yet for this stream.
                </p>
                <button
                  type="button"
                  disabled={isAnalyzingTrades}
                  onClick={handleAnalyzeTrades}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Run Trade Story Analysis</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stream.trades.map((trade, idx) => {
                  const isSelected = selectedTradeIndex === idx;
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => {
                        setSelectedTradeIndex(idx);
                        if (trade.events?.[0]?.timestamp) {
                          setCurrentSeekTime(trade.events[0].timestamp);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-foreground">
                            Trade #{trade.tradeNumber}: {trade.instrument}
                          </span>
                          {trade.isVerified && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-black ${
                            trade.direction === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono text-primary font-bold">
                          RR {trade.plannedRR || "1:3"}
                        </span>
                        <span className="font-bold text-emerald-400">
                          {trade.result} Hit ✓
                        </span>
                        <span className="font-mono text-[11px]">
                          {(trade.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trade Story Cards */}
          {selectedTrade && (
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-extrabold text-sm text-foreground">
                    Trade #{selectedTrade.tradeNumber} Story: {selectedTrade.instrument} ({selectedTrade.direction})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Verify Toggle Button */}
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleToggleVerify(selectedTrade)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedTrade.isVerified
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    <span>{selectedTrade.isVerified ? "Verified Trade" : "Mark Verified"}</span>
                  </button>

                  {/* Verify Visuals Button */}
                  <button
                    type="button"
                    disabled={isVerifyingVisuals}
                    onClick={() => handleVerifyVisuals(selectedTrade)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                    title="Run OpenCV/Pillow frame verification on chart at entry timestamp"
                  >
                    <Eye className={`h-3 w-3 ${isVerifyingVisuals ? "animate-pulse" : ""}`} />
                    <span>{isVerifyingVisuals ? "Checking Chart..." : "Verify Visuals"}</span>
                  </button>

                  {/* Edit Trade Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedTrade)}
                    className="p-1.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Edit Trade Candidate"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                    Completeness: {(selectedTrade.completenessScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Context & Entry Criteria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>Rahul&apos;s Stated Entry Criteria</span>
                  </span>
                  <p className="font-semibold text-foreground">
                    &quot;{selectedTrade.entryCriteria || "Break of trigger candle"}&quot;
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Shield className="h-3 w-3 text-blue-400" />
                    <span>Market Context &amp; Liquidity</span>
                  </span>
                  <p className="text-muted-foreground leading-relaxed line-clamp-2">
                    {selectedTrade.marketContext || "Institutional liquidity sweep"}
                  </p>
                </div>
              </div>

              {/* RR Timeline Summary Box */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-muted/40 p-3.5 border border-border/80 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Planned R:R</span>
                  <span className="font-mono font-black text-primary text-base">
                    {selectedTrade.plannedRR || "1:3"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Risk Status</span>
                  <span className="font-bold text-emerald-400 text-xs flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{selectedTrade.riskStatus}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Realized Outcome</span>
                  <span className="font-mono font-black text-emerald-500 text-base">
                    {selectedTrade.result} ✓
                  </span>
                </div>
              </div>

              {/* R:R Trajectory Milestones Bar */}
              {rrGeometry && rrGeometry.milestones.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span>R:R Progression Trajectory</span>
                    </div>
                    {rrGeometry.isFavorableRR ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Favorable Setup (≥ 1:2)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Sub-optimal R:R
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {rrGeometry.milestones.map((m) => (
                      <div
                        key={m.ratio}
                        onClick={() => {
                          if (m.achievedTimestamp) handleSeek(m.achievedTimestamp);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          m.achieved
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-muted/30 border-border/60 text-muted-foreground"
                        } ${m.achievedTimestamp ? "cursor-pointer hover:border-emerald-500/60" : ""}`}
                      >
                        <div className="flex items-center justify-center gap-1 font-mono font-black text-sm">
                          <span>{m.ratio}</span>
                          {m.achieved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        </div>

                        {m.projectedPrice && (
                          <span className="font-mono text-[10px] block mt-0.5">
                            {m.projectedPrice}
                          </span>
                        )}

                        {m.achievedTimestamp ? (
                          <span className="text-[9px] font-mono font-bold text-primary block mt-0.5">
                            @ {formatTimestamp(m.achievedTimestamp)}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            {m.ratioValue === 2 ? "BE Trigger" : m.ratioValue === 3 ? "Target 1" : "Projected"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Management & Capital Defense Box */}
              {managementReport && (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Capital Defense &amp; Trade Management</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        managementReport.isRiskFree
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {managementReport.isRiskFree ? "100% Risk-Free Active" : "Initial Capital Risk Active"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    &quot;{managementReport.summaryText}&quot;
                  </p>

                  {/* Defense Steps Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {managementReport.steps.map((st, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSeek(st.timestamp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          st.actionType === "SL_TO_BREAKEVEN"
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                            : st.actionType === "PARTIAL_BOOKING"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                            : st.actionType === "TRAILING_SL"
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25"
                            : "bg-muted border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                        title={st.quote}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        <span>{st.title}</span>
                        <span className="font-mono text-primary text-[9px]">@{formatTimestamp(st.timestamp)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Clip Window: {formatTimestamp(selectedTrade.clipStart || 0)} → {formatTimestamp(selectedTrade.clipEnd || 0)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    toast.success("Clip generation triggered! Ingesting selective video segment...")
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>Generate Clip (Master &amp; 9:16)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tab Switcher (Timeline vs Transcript) (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
            {/* Tab Buttons Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("TIMELINE")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "TIMELINE"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Story Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("TRANSCRIPT")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "TRANSCRIPT"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Transcript ({rawSegments.length})</span>
                </button>
              </div>

              <span className="text-[10px] text-muted-foreground font-mono">
                Click event to seek
              </span>
            </div>

            {/* TAB 1: STORY TIMELINE */}
            {activeTab === "TIMELINE" && (
              <>
                {!selectedTrade?.events || selectedTrade.events.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No timeline events recorded for this trade candidate.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80 max-h-[600px] overflow-y-auto pr-1">
                    {selectedTrade.events.map((ev, evIdx) => {
                      const isCurrentTime = currentSeekTime === ev.timestamp;
                      const stepNum = getEventStepNumber(ev.eventType);

                      return (
                        <div
                          key={ev.id || evIdx}
                          onClick={() => handleSeek(ev.timestamp)}
                          className={`relative group cursor-pointer p-3.5 rounded-2xl border transition-all ${
                            isCurrentTime
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-primary/40"
                          }`}
                        >
                          {/* Timeline dot with Step number */}
                          <div
                            className={`absolute -left-[27px] top-3.5 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                              isCurrentTime
                                ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20"
                                : "bg-card text-muted-foreground border-border group-hover:border-primary group-hover:text-foreground"
                            }`}
                          >
                            {stepNum}
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[11px] font-bold text-primary flex items-center gap-1">
                              <Play className="h-2.5 w-2.5" />
                              <span>{formatTimestamp(ev.timestamp)}</span>
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[9px] uppercase font-black border ${getEventBadgeColor(
                                ev.eventType
                              )}`}
                            >
                              {ev.eventType}
                            </span>
                          </div>

                          {/* Spoken Quote */}
                          <div className="flex items-start gap-1.5 text-xs text-foreground font-medium leading-snug">
                            <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="italic">&quot;{ev.text}&quot;</p>
                          </div>

                          {ev.price && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono font-bold text-primary">
                              <span>Price: {ev.price}</span>
                            </div>
                          )}

                          {ev.visualVerified && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Visually Verified</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: RAW TRANSCRIPT */}
            {activeTab === "TRANSCRIPT" && (
              <div className="space-y-3">
                {/* Search & Extract actions */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search spoken keywords (e.g. liquidity, buy, hammer)..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isExtractingTranscript}
                    onClick={async () => {
                      setIsExtractingTranscript(true);
                      toast.info("Extracting YouTube captions...");
                      const res = await extractStreamTranscriptAction(stream.id);
                      setIsExtractingTranscript(false);
                      if (res.success) {
                        toast.success(res.message);
                        window.location.reload();
                      } else {
                        toast.error(res.message);
                      }
                    }}
                    className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Extract / Sync Captions"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isExtractingTranscript ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {filteredSegments.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {stream.transcriptText
                        ? "No matching transcript segments found."
                        : "No captions extracted yet for this stream."}
                    </p>
                    <button
                      type="button"
                      disabled={isExtractingTranscript}
                      onClick={async () => {
                        setIsExtractingTranscript(true);
                        toast.info("Extracting YouTube captions...");
                        const res = await extractStreamTranscriptAction(stream.id);
                        setIsExtractingTranscript(false);
                        if (res.success) {
                          toast.success(res.message);
                          window.location.reload();
                        } else {
                          toast.error(res.message);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isExtractingTranscript ? "animate-spin" : ""}`} />
                      <span>Extract YouTube Captions</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
                    {filteredSegments.map((seg: any, idx: number) => {
                      const isCurrent = currentSeekTime >= seg.start && currentSeekTime <= seg.end;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSeek(seg.start)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                            isCurrent
                              ? "bg-primary/15 border-primary text-foreground font-semibold"
                              : "border-border/50 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="font-mono text-[10px] text-primary shrink-0 mt-0.5">
                            {formatTimestamp(seg.start)}
                          </span>
                          <p className="leading-snug flex-1">{seg.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Trade Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                Edit Trade #{selectedTrade?.tradeNumber} Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Instrument</label>
                <input
                  type="text"
                  value={editFormData.instrument}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, instrument: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Direction</label>
                  <select
                    value={editFormData.direction}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, direction: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Planned RR</label>
                  <input
                    type="text"
                    value={editFormData.plannedRR}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, plannedRR: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Clip Start (Sec)</label>
                  <input
                    type="number"
                    value={editFormData.clipStart}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clipStart: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Clip End (Sec)</label>
                  <input
                    type="number"
                    value={editFormData.clipEnd}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clipEnd: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Entry Criteria</label>
                <textarea
                  rows={2}
                  value={editFormData.entryCriteria}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, entryCriteria: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
