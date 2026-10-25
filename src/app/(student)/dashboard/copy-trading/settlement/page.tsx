import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentCopyTradingDataAction } from "@/server/actions/copy-trading.actions";
import { CopyTradingSettlementHubClient } from "@/components/student/copy-trading-settlement-hub-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly Profit Sharing Settlement | Super Warrior 30",
  description: "Weekly profit share settlement payment gateway & affiliate distribution.",
};

export default async function CopyTradingSettlementHubPage() {
  await requireAuth();
  const data = await getStudentCopyTradingDataAction();

  return (
    <CopyTradingSettlementHubClient
      invoices={data.invoices || []}
      paymentMethods={data.paymentMethods || []}
      affiliateInfo={data.affiliateInfo}
    />
  );
}
