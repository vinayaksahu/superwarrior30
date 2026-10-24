import type { Metadata } from "next";
import { requirePermission } from "@/server/dal/auth";
import { getAdminCopyTradingDataAction } from "@/server/actions/copy-trading.actions";
import { AdminCopyTradingClient } from "@/components/admin/admin-copy-trading-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Copy Trading Fleet | Super Warrior 30 Admin",
  description: "Manage MT5 Master Trading Account, Student Terminals, and High-Speed Cloud VPS Fleet.",
};

export default async function AdminCopyTradingPage() {
  await requirePermission("copy_trading.view");
  const data = await getAdminCopyTradingDataAction();

  return (
    <AdminCopyTradingClient
      initialMasters={data.masters as any}
      initialSubscriptions={data.subscriptions as any}
      initialLogs={data.recentLogs as any}
      initialKpi={data.kpi}
      vpsFleet={data.vpsFleet}
      settings={data.settings}
    />
  );
}
