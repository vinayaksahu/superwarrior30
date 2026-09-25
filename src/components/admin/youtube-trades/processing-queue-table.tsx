"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  getProcessingJobsAction,
  cancelProcessingJobAction,
} from "@/server/actions/youtube-trades.actions";

interface JobItem {
  id: string;
  streamId: string | null;
  tradeId: string | null;
  jobType: string;
  stage: string;
  progressPercent: number;
  errorMessage: string | null;
  logs: any;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  stream?: {
    id: string;
    title: string;
    thumbnail: string | null;
    youtubeVideoId: string;
  } | null;
}

interface ProcessingQueueTableProps {
  initialJobs: any[];
}

export function ProcessingQueueTable({ initialJobs }: ProcessingQueueTableProps) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "FAILED">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refreshJobs = async () => {
    setIsRefreshing(true);
    try {
      const data = await getProcessingJobsAction();
      setJobs(data as any);
    } catch (err) {
      console.error("Failed to refresh jobs:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-poll active jobs every 4 seconds
  useEffect(() => {
    const hasActive = jobs.some((j) =>
      ["QUEUED", "DOWNLOADING", "TRANSCRIBING", "ANALYZING", "DETECTING_TRADES", "VISUAL_ANALYSIS", "GENERATING_CLIP", "RENDERING"].includes(
        j.stage
      )
    );

    if (!hasActive) return;

    const interval = setInterval(() => {
      refreshJobs();
    }, 4000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleCancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this processing job?")) return;
    setCancellingId(jobId);
    try {
      const res = await cancelProcessingJobAction(jobId);
      if (res.success) {
        await refreshJobs();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to cancel job.");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === "ACTIVE") {
      return ["QUEUED", "DOWNLOADING", "TRANSCRIBING", "ANALYZING", "DETECTING_TRADES", "VISUAL_ANALYSIS", "GENERATING_CLIP", "RENDERING"].includes(
        j.stage
      );
    }
    if (filter === "COMPLETED") return j.stage === "COMPLETED";
    if (filter === "FAILED") return j.stage === "FAILED" || j.stage === "CANCELLED";
    return true;
  });

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            COMPLETED
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            FAILED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-1 text-[11px] font-bold text-zinc-400">
            <XCircle className="h-3.5 w-3.5" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-400 animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {stage}
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-sm tracking-wide text-foreground">
            PROCESSING QUEUE ({filteredJobs.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
            {(["ALL", "ACTIVE", "COMPLETED", "FAILED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  filter === tab
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh Queue"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Queue Content */}
      {filteredJobs.length === 0 ? (
        <div className="p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-bold text-foreground">No jobs matching this filter</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Queue currently has no tasks in this state.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {filteredJobs.map((job) => {
            const isActive = [
              "QUEUED",
              "DOWNLOADING",
              "TRANSCRIBING",
              "ANALYZING",
              "DETECTING_TRADES",
              "VISUAL_ANALYSIS",
              "GENERATING_CLIP",
              "RENDERING",
            ].includes(job.stage);

            return (
              <div
                key={job.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                {/* Left: Job Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStageBadge(job.stage)}
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                      {job.jobType}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ID: {job.id.slice(-8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.stream ? (
                      <Link
                        href={`/admin/youtube-live-trades/${job.stream.id}`}
                        className="text-xs font-semibold text-foreground hover:text-amber-400 transition-colors truncate flex items-center gap-1.5"
                      >
                        {job.stream.title}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Stream ID: {job.streamId || "N/A"}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className="w-full max-w-md bg-muted/80 rounded-full h-2 overflow-hidden border border-border/40">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          job.stage === "FAILED"
                            ? "bg-red-500"
                            : job.stage === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground shrink-0">
                      {job.progressPercent}%
                    </span>
                  </div>

                  {job.errorMessage && (
                    <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 font-mono">
                      Error: {job.errorMessage}
                    </p>
                  )}
                </div>

                {/* Right: Actions & Timestamps */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <div className="text-left md:text-right text-xs">
                    <span className="text-[10px] text-muted-foreground block">Created</span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {new Date(job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      disabled={cancellingId === job.id}
                      className="px-3 py-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {cancellingId === job.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
