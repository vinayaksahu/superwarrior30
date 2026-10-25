import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/server/dal/auth";
import { getSettlementInvoiceDetailsAction } from "@/server/actions/copy-trading.actions";
import { CopyTradingSettlementClient } from "@/components/student/copy-trading-settlement-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profit Share Settlement Payment | Super Warrior 30",
  description: "Weekly profit share settlement payment gateway & affiliate distribution.",
};

export default async function CopyTradingSettlementPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requireAuth();
  const { invoiceId } = await params;

  const res = await getSettlementInvoiceDetailsAction(invoiceId);
  if (!res.success || !res.invoice) {
    notFound();
  }

  return (
    <CopyTradingSettlementClient
      invoice={res.invoice}
      paymentMethods={res.paymentMethods}
    />
  );
}
