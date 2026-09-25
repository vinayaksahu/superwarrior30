"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Search,
  Sparkles,
  Radio,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  Film,
  Settings,
  ListFilter,
  Play,
  RotateCw,
  ExternalLink,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Square,
  Cpu,
} from "lucide-react";
import {
  submitYouTubeStreamAction,
  deleteYouTubeStreamAction,
} from "@/server/actions/youtube-trades.actions";

interface StreamRecord {
  id: string;
  youtubeVideoId: string;
  url: string;
  title: string;
  thumbnail: string | null;
  channel: string | null;
  duration: number;
  status: string;
  transcriptStatus: string;
  analysisStatus: string;
  tradesCount: number;
  clipsCount: number;
  createdAt: string | Date;
  trades?: {
    id: string;
    tradeNumber: number;
    instrument: string;
    direction: string;
    plannedRR: string | null;
    result: string;
    confidence: number;
    completenessScore: number;
  }[];
}

interface StatsData {
  streamsAnalyzed: number;
  tradesDetected: number;
  clipsGenerated: number;
  processingCount: number;
}

interface YouTubeTradesDashboardClientProps {
  initialStreams: StreamRecord[];
  initialStats: StatsData;
  total: number;
}

export function YouTubeTradesDashboardClient({
  initialStreams = [],
  initialStats,
  total,
}: YouTubeTradesDashboardClientProps) {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamRecord[]>(initialStreams);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Ingestion form state
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [downloadFullVideo, setDownloadFullVideo] = useState(false);
  const [transcriptFirst, setTranscriptFirst] = useState(true);
  const [detectActualTrades, setDetectActualTrades] = useState(true);
  const [detectRR, setDetectRR] = useState(true);
  const [detectEntry, setDetectEntry] = useState(true);
  const [detectTPSL, setDetectTPSL] = useState(true);
  const [generateTimeline, setGenerateTimeline] = useState(true);

  // Filter streams
  const filteredStreams = streams.filter((stream) => {
    const matchSearch =
      !search.trim() ||
      stream.title.toLowerCase().includes(search.toLowerCase()) ||
      (stream.channel && stream.channel.toLowerCase().includes(search.toLowerCase())) ||
      stream.youtubeVideoId.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || stream.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Live / Unknown";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  };

  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) {
      toast.error("Please enter a valid YouTube livestream URL.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitYouTubeStreamAction({
          url: streamUrl.trim(),
          downloadFullVideo,
          transcriptFirst,
          detectActualTrades,
          detectRR,
          detectEntry,
          detectTPSL,
          generateTimeline,
        });

        if (!res.success) {
          throw new Error(res.message);
        }

        toast.success(res.message);
        setIsIngestModalOpen(false);
        setStreamUrl("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to submit YouTube livestream.");
      }
    });
  };

  const handleDeleteStream = (streamId: string) => {
    if (!confirm("Are you sure you want to delete this livestream record and its trade analysis?")) return;

    startTransition(async () => {
      try {
        const res = await deleteYouTubeStreamAction(streamId);
        if (!res.success) throw new Error(res.message);

        setStreams((prev) => prev.filter((s) => s.id !== streamId));
        toast.success("Livestream removed successfully.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete livestream.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm shrink-0">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                YouTube Live Trades
              </h1>
              <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-red-500 border border-red-500/30">
                AI Trade Clip Finder
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-powered analysis of Rahul Trade Warrior Academy livestreams to detect actual trades, build timelines, and generate clips.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Analyze New Livestream</span>
          </button>

          <Link
            href="/admin/youtube-live-trades/queue"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            <Cpu className="h-4 w-4 text-primary" />
            <span>Processing Queue</span>
            {initialStats.processingCount > 0 && (
              <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {initialStats.processingCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/live-trade-proofs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            <span>Manual Proofs</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* 2. Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Streams Analyzed</span>
            <Radio className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{initialStats.streamsAnalyzed}</span>
            <span className="text-[11px] text-muted-foreground">Livestreams</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase">Trades Detected</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{initialStats.tradesDetected}</span>
            <span className="text-[11px] text-emerald-500/70">Verified setups</span>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary uppercase">Clips Generated</span>
            <Film className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary">{initialStats.clipsGenerated}</span>
            <span className="text-[11px] text-primary/70">Master &amp; 9:16 Shorts</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase">Processing</span>
            <Cpu className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{initialStats.processingCount}</span>
            <span className="text-[11px] text-amber-500/70">Active in queue</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Ingest Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Transcript-First Trade Reconstruction
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Paste any Rahul Trade Warrior livestream link to extract setups, identify Rahul&apos;s spoken entry criteria, and verify RR.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsIngestModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-card border border-primary/40 px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Analyze Livestream URL</span>
        </button>
      </div>

      {/* 4. Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search streams by title, video ID or instrument (e.g. XAUUSD)..."
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
            <option value="all">All Stream Statuses</option>
            <option value="ANALYZED">Analyzed (Completed)</option>
            <option value="PROCESSING">Processing / Transcribing</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* 5. Streams Table / List */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Recent Livestreams ({filteredStreams.length})
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Auto-scanned &amp; Ingested
          </span>
        </div>

        {filteredStreams.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Video className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">No livestreams found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Abhi koi livestream record match nahi hua. Upar &quot;+ Analyze New Livestream&quot; button se Rahul sir ka koi bhi live stream link paste karein!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Thumbnail & Title Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="relative aspect-video w-32 sm:w-40 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-border/80 shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stream.thumbnail || `https://img.youtube.com/vi/${stream.youtubeVideoId}/mqdefault.jpg`}
                      alt={stream.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.2 text-[9px] font-mono font-bold text-white">
                      {formatDuration(stream.duration)}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-red-500">
                        {stream.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {stream.youtubeVideoId}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">
                      {stream.title}
                    </h4>

                    {/* Detected Trades badges */}
                    {stream.trades && stream.trades.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {stream.trades.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold border border-border"
                          >
                            <span
                              className={
                                t.direction === "BUY" ? "text-emerald-400" : "text-red-400"
                              }
                            >
                              {t.direction}
                            </span>
                            <span className="text-foreground">{t.instrument}</span>
                            <span className="text-primary font-mono">{t.plannedRR || "1:3"}</span>
                            <span className="text-emerald-500">✓ {t.result}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {stream.status === "QUEUED"
                          ? "In processing queue..."
                          : "No actual trade confirmed in this stream."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions & Timeline inspector button */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 border-border/40 pt-3 lg:pt-0 shrink-0">
                  <a
                    href={stream.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Watch YouTube Livestream"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteStream(stream.id)}
                    className="p-2 rounded-xl border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Delete Stream"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link
                    href={`/admin/youtube-live-trades/${stream.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <span>Inspect Trades</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. INGEST NEW LIVESTREAM MODAL */}
      {isIngestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsIngestModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">
                    Analyze New YouTube Livestream
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Transcript-first analysis to detect actual trades &amp; generate timeline
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleIngestSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  YouTube Livestream URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/live/XXXXXXXX or https://www.youtube.com/watch?v=..."
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Analysis Pipeline Options */}
              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Analysis Pipeline Options
                </span>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transcriptFirst}
                      onChange={(e) => setTranscriptFirst(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Transcript-first analysis (fast &amp; cost-efficient)</span>
                  </label>

                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectActualTrades}
                      onChange={(e) => setDetectActualTrades(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Filter hypothetical setups and detect actual executed trades</span>
                  </label>

                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectRR}
                      onChange={(e) => setDetectRR(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Detect Risk:Reward milestones (1R, 2R, 3R, Risk-Free, BE)</span>
                  </label>

                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectEntry}
                      onChange={(e) => setDetectEntry(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Detect Entry Criteria &amp; Actual Entry timestamp</span>
                  </label>

                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectTPSL}
                      onChange={(e) => setDetectTPSL(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Detect Take Profit &amp; Stop Loss</span>
                  </label>

                  <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateTimeline}
                      onChange={(e) => setGenerateTimeline(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Generate complete chronological Trade Story Timeline</span>
                  </label>

                  <label className="flex items-center gap-2 text-muted-foreground font-normal cursor-pointer pt-1 border-t border-border/50">
                    <input
                      type="checkbox"
                      checked={downloadFullVideo}
                      onChange={(e) => setDownloadFullVideo(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Download full video (default off: download only required trade clip)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-xs font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Submitting..." : "Analyze Livestream"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
