import type { Metadata } from "next";
import { getStudentJournalAction } from "@/server/actions/journal.actions";
import { getEconomicNewsAction } from "@/server/actions/economic-news.actions";
import { TradingJournalClient } from "@/components/student/trading-journal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Trading Journal & Economic News | Super Warrior 30",
};

export default async function StudentJournalPage() {
  const [journalData, economicNewsRes] = await Promise.all([
    getStudentJournalAction({ pageSize: 50 }),
    getEconomicNewsAction(),
  ]);

  return (
    <div className="space-y-6">
      <TradingJournalClient
        initialTrades={journalData.trades}
        stats={journalData.stats}
        initialEconomicFeed={economicNewsRes.data}
      />
    </div>
  );
}
