import type { Metadata } from "next";
import { requirePermission } from "@/server/dal/auth";
import { getYouTubeStreamsAction } from "@/server/actions/youtube-trades.actions";
import { YouTubeTradesDashboardClient } from "@/components/admin/youtube-trades/youtube-trades-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YouTube Live Trades | Super Warrior 30 Admin",
  description: "AI-powered analysis of Rahul Trade Warrior Academy livestreams to detect actual trades, reconstruct trade timelines, and generate clips.",
};

export default async function AdminYouTubeLiveTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  await requirePermission("youtube_live_trades.view");

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const data = await getYouTubeStreamsAction({
    page,
    search,
    status,
    pageSize: 30,
  });

  return (
    <div className="space-y-6">
      <YouTubeTradesDashboardClient
        initialStreams={data.streams as any}
        initialStats={data.stats}
        total={data.total}
      />
    </div>
  );
}
