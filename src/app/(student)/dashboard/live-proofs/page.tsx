import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getPublicLiveTradesAction } from "@/server/actions/live-trades.actions";
import { StudentLiveProofsClient } from "@/components/student/student-live-proofs-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentor's YouTube Live Trades & Proofs | Student Dashboard",
  description: "Explore mentor's live stream trades with minor SL, high R:R targets, and chart screenshots.",
};

export default async function StudentLiveProofsPage() {
  await requireAuth();
  const trades = await getPublicLiveTradesAction({ destination: "DASHBOARD", limit: 50 });

  return (
    <div className="space-y-6">
      <StudentLiveProofsClient initialTrades={trades as any} />
    </div>
  );
}
