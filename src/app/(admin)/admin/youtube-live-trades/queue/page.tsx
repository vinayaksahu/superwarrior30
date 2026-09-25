import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/dal/auth";
import { getProcessingJobsAction } from "@/server/actions/youtube-trades.actions";
import { ArrowLeft } from "lucide-react";
import { ProcessingQueueTable } from "@/components/admin/youtube-trades/processing-queue-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Processing Queue | YouTube Live Trades | Super Warrior 30 Admin",
};

export default async function YouTubeTradesQueuePage() {
  await requirePermission("youtube_live_trades.view");

  const jobs = await getProcessingJobsAction();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/youtube-live-trades"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Processing Queue
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 border border-amber-500/20">
                ACTIVE JOBS
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitor transcript extractions, AI trade detections, visual verifications, and clip rendering jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Queue Table */}
      <ProcessingQueueTable initialJobs={jobs} />
    </div>
  );
}
