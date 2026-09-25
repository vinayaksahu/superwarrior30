import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/dal/auth";
import { getStreamWithTradesAction } from "@/server/actions/youtube-trades.actions";
import { StreamDetailClient } from "@/components/admin/youtube-trades/stream-detail-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Livestream Trade Timeline | YouTube Live Trades | Super Warrior 30 Admin",
};

export default async function AdminYouTubeStreamDetailPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  await requirePermission("youtube_live_trades.view");
  const { streamId } = await params;

  const stream = await getStreamWithTradesAction(streamId);
  if (!stream) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StreamDetailClient stream={stream as any} />
    </div>
  );
}
