import type { Metadata } from "next";
import { getEconomicNewsAction } from "@/server/actions/economic-news.actions";
import { AdminEconomicNewsManager } from "@/components/admin/admin-economic-news-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forex Factory Economic News Manager | Super Warrior 30 Admin",
  description: "Sync and manage global economic calendar events from Forex Factory for student trading journals.",
};

export default async function AdminEconomicNewsPage() {
  const { data } = await getEconomicNewsAction();

  return (
    <div className="space-y-6">
      <AdminEconomicNewsManager initialFeed={data} />
    </div>
  );
}
