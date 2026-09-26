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
  Download,
  FileDown,
  Smartphone,
  MonitorPlay,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  extractStreamTranscriptAction,
  analyzeStreamTradesAction,
  verifyTradeCandidateAction,
  updateTradeCandidateAction,
  verifyTradeCandidateVisualsAction,
  generateFullTradeClipSuiteAction,
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
  clips?: TradeClipItem[];
}

export interface TradeClipItem {
  id: string;
  tradeId: string;
  masterVideoUrl?: string | null;
  shortVideoUrl?: string | null;
  srtUrl?: string | null;
  jsonUrl?: string | null;
  storageProvider?: string;
  durationSec?: number | null;
  status: string;
  metadata?: any;
  createdAt?: string | Date;
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
  const [isGeneratingClip, setIsGeneratingClip] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    tradeNumber: number;
    instrument: string;
    direction: string;
    plannedRR?: string;
    clipStart: number;
    clipEnd: number;
    videoUrl?: string | null;
    isVertical?: boolean;
    srtUrl?: string | null;
    storageProvider?: string;
    activeTab: "YOUTUBE" | "BUNNY";
  } | null>(null);
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

  const handleGenerateFullClipSuite = async (tradeId: string) => {
    if (!tradeId) return;
    setIsGeneratingClip(true);
    const toastId = toast.loading("Generating Clip Suite (Master MP4, 9:16 Short & Subtitles)...");
    try {
      const res = await generateFullTradeClipSuiteAction(tradeId);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        window.location.reload();
      } else {
        toast.error(res.message || "Clip generation failed.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during clip generation.", { id: toastId });
    } finally {
      setIsGeneratingClip(false);
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
                          {trade.clips && trade.clips.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-primary/20 px-1 py-0.2 text-[8px] font-extrabold text-primary">
                              <Film className="h-2.5 w-2.5" />
                              CLIP
                            </span>
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

              {/* Generated Clips & Video Exports Card */}
              {selectedTrade.clips && selectedTrade.clips.length > 0 && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground">
                        Generated Video Clips &amp; Social Exports ({selectedTrade.clips.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                      {selectedTrade.clips[0].storageProvider || "LOCAL"} Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 16:9 Master Video */}
                    <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <MonitorPlay className="h-3.5 w-3.5 text-primary" />
                            16:9 Master MP4
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {selectedTrade.clips[0].durationSec ? `${selectedTrade.clips[0].durationSec}s` : "Full HD"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Full screen with HUD overlay, entry triggers &amp; trailing SL targets.
                        </p>
                      </div>

                      {selectedTrade.clips[0].masterVideoUrl ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({
                                isOpen: true,
                                tradeNumber: selectedTrade.tradeNumber,
                                instrument: selectedTrade.instrument,
                                direction: selectedTrade.direction,
                                plannedRR: selectedTrade.plannedRR || undefined,
                                clipStart: selectedTrade.clipStart || 0,
                                clipEnd: selectedTrade.clipEnd || (selectedTrade.clipStart || 0) + 30,
                                videoUrl: selectedTrade.clips![0].masterVideoUrl,
                                isVertical: false,
                                srtUrl: selectedTrade.clips![0].srtUrl,
                                storageProvider: selectedTrade.clips![0].storageProvider || "LOCAL",
                                activeTab:
                                  selectedTrade.clips![0].masterVideoUrl?.startsWith("http") &&
                                  selectedTrade.clips![0].storageProvider === "BUNNY"
                                    ? "BUNNY"
                                    : "YOUTUBE",
                              })
                            }
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold cursor-pointer"
                          >
                            <Play className="h-3 w-3" />
                            Preview
                          </button>
                          {selectedTrade.clips[0].masterVideoUrl?.startsWith("http") && selectedTrade.clips[0].storageProvider === "BUNNY" ? (
                            <a
                              href={selectedTrade.clips[0].masterVideoUrl}
                              download={`trade_${selectedTrade.tradeNumber}_${selectedTrade.instrument}_master.mp4`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          ) : (
                            <a
                              href={`https://youtu.be/${stream.youtubeVideoId}?t=${selectedTrade.clipStart || 0}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3 text-red-500" />
                              YouTube
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Generating...</span>
                      )}
                    </div>

                    {/* 9:16 Vertical Short */}
                    <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <Smartphone className="h-3.5 w-3.5 text-purple-400" />
                            9:16 Vertical Short
                          </span>
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            Reels / Shorts
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Mobile-first 1080x1920 with blurred backdrop &amp; high CTR callouts.
                        </p>
                      </div>

                      {selectedTrade.clips[0].shortVideoUrl ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({
                                isOpen: true,
                                tradeNumber: selectedTrade.tradeNumber,
                                instrument: selectedTrade.instrument,
                                direction: selectedTrade.direction,
                                plannedRR: selectedTrade.plannedRR || undefined,
                                clipStart: selectedTrade.clipStart || 0,
                                clipEnd: selectedTrade.clipEnd || (selectedTrade.clipStart || 0) + 30,
                                videoUrl: selectedTrade.clips![0].shortVideoUrl,
                                isVertical: true,
                                srtUrl: selectedTrade.clips![0].srtUrl,
                                storageProvider: selectedTrade.clips![0].storageProvider || "LOCAL",
                                activeTab:
                                  selectedTrade.clips![0].shortVideoUrl?.startsWith("http") &&
                                  selectedTrade.clips![0].storageProvider === "BUNNY"
                                    ? "BUNNY"
                                    : "YOUTUBE",
                              })
                            }
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold cursor-pointer"
                          >
                            <Play className="h-3 w-3" />
                            Preview
                          </button>
                          {selectedTrade.clips[0].shortVideoUrl?.startsWith("http") && selectedTrade.clips[0].storageProvider === "BUNNY" ? (
                            <a
                              href={selectedTrade.clips[0].shortVideoUrl}
                              download={`trade_${selectedTrade.tradeNumber}_${selectedTrade.instrument}_short.mp4`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          ) : (
                            <a
                              href={`https://youtu.be/${stream.youtubeVideoId}?t=${selectedTrade.clipStart || 0}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3 text-red-500" />
                              YouTube
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isGeneratingClip}
                          onClick={() => handleGenerateFullClipSuite(selectedTrade.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold cursor-pointer"
                        >
                          Generate 9:16 Short
                        </button>
                      )}
                    </div>

                    {/* Subtitles (.srt) */}
                    <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <FileText className="h-3.5 w-3.5 text-amber-400" />
                            Subtitles (.srt)
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Hinglish
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Synchronized Hindi/Hinglish subtitles for automated captioning.
                        </p>
                      </div>

                      {selectedTrade.clips[0].srtUrl ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <a
                            href={selectedTrade.clips[0].srtUrl}
                            download={`trade_${selectedTrade.tradeNumber}_${selectedTrade.instrument}.srt`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer"
                          >
                            <FileDown className="h-3 w-3" />
                            Download .SRT
                          </a>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isGeneratingClip}
                          onClick={() => handleGenerateFullClipSuite(selectedTrade.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer"
                        >
                          Generate .SRT
                        </button>
                      )}
                    </div>
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
                  disabled={isGeneratingClip}
                  onClick={() => handleGenerateFullClipSuite(selectedTrade.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingClip ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Rendering Clip Suite (Master, 9:16 &amp; SRT)...</span>
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4" />
                      <span>{selectedTrade.clips && selectedTrade.clips.length > 0 ? "Regenerate Clip Suite" : "Generate Clip (Master & 9:16)"}</span>
                    </>
                  )}
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

      {/* Upgraded Video Preview Modal with YouTube HD Streaming & Bunny CDN */}
      {previewModal && previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                      Trade #{previewModal.tradeNumber}: {previewModal.instrument} ({previewModal.direction})
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        previewModal.direction === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {previewModal.direction}
                    </span>
                    {previewModal.isVertical && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-400 uppercase">
                        9:16 Short
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    Livestream Window: {formatTimestamp(previewModal.clipStart)} → {formatTimestamp(previewModal.clipEnd)} (
                    {Math.max(1, previewModal.clipEnd - previewModal.clipStart)}s)
                  </p>
                </div>
              </div>

              {/* Source Switcher Tabs & Close */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewModal({ ...previewModal, activeTab: "YOUTUBE" })}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      previewModal.activeTab === "YOUTUBE"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    YouTube HD Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModal({ ...previewModal, activeTab: "BUNNY" })}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      previewModal.activeTab === "BUNNY"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Bunny CDN Video
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Video Player Display */}
            <div className="relative aspect-video max-h-[65vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              {previewModal.activeTab === "YOUTUBE" ? (
                stream.youtubeVideoId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${stream.youtubeVideoId}?start=${previewModal.clipStart}&end=${previewModal.clipEnd}&autoplay=1&rel=0&modestbranding=1`}
                    title={`Trade #${previewModal.tradeNumber} Clip Preview`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">YouTube Video ID not detected for this livestream.</p>
                  </div>
                )
              ) : previewModal.videoUrl && previewModal.videoUrl.startsWith("http") && previewModal.storageProvider === "BUNNY" ? (
                <video
                  src={previewModal.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 space-y-3 max-w-md">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 inline-block">
                    <Sparkles className="h-7 w-7 mx-auto animate-pulse" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    Bunny CDN Video Storage
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Composited trade overlay is stored on Bunny CDN (<span className="font-mono text-primary font-bold">sw30-production-storage</span>). You can watch Rahul Sir's exact high-definition 1080p entry instantly via the <strong className="text-foreground">YouTube HD Stream</strong> tab!
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewModal({ ...previewModal, activeTab: "YOUTUBE" })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Watch via YouTube Stream Player</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1 border-t border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-[11px] truncate max-w-xs">
                  {previewModal.activeTab === "YOUTUBE"
                    ? `https://youtu.be/${stream.youtubeVideoId}?t=${previewModal.clipStart}`
                    : previewModal.videoUrl || "Bunny Storage Asset"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy =
                      previewModal.activeTab === "YOUTUBE"
                        ? `https://youtu.be/${stream.youtubeVideoId}?t=${previewModal.clipStart}`
                        : previewModal.videoUrl || "";
                    navigator.clipboard.writeText(textToCopy);
                    toast.success("Link copied to clipboard!");
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy Link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Open in YouTube (Direct Timestamp) */}
                <a
                  href={`https://youtu.be/${stream.youtubeVideoId}?t=${previewModal.clipStart}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted cursor-pointer transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-red-500" />
                  <span>Open in YouTube</span>
                </a>

                {/* Subtitle (.SRT) Download if available */}
                {previewModal.srtUrl && (
                  <a
                    href={previewModal.srtUrl}
                    download={`trade_${previewModal.tradeNumber}_${previewModal.instrument}.srt`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 cursor-pointer transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Download .SRT</span>
                  </a>
                )}

                {/* Download MP4 button */}
                {previewModal.videoUrl && previewModal.videoUrl.startsWith("http") && previewModal.storageProvider === "BUNNY" ? (
                  <a
                    href={previewModal.videoUrl}
                    download={`trade_${previewModal.tradeNumber}_${previewModal.instrument}_clip.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer shadow transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Clip is currently streaming from YouTube HD. You can watch it directly above or click 'Open in YouTube'!");
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs hover:bg-muted/80 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
