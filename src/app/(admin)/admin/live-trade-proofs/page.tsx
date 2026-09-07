import type { Metadata } from "next";
import { getAdminLiveTradesAction } from "@/server/actions/live-trades.actions";
import { AdminLiveTradesClient } from "@/components/admin/admin-live-trades-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YouTube Live Trading Proofs | Super Warrior 30 Admin",
};

export default async function AdminLiveTradeProofsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const data = await getAdminLiveTradesAction({
    page,
    search,
    status,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <AdminLiveTradesClient
        initialTrades={data.trades as any}
        total={data.total}
      />
    </div>
  );
}
