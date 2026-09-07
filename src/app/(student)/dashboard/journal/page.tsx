import type { Metadata } from "next";
import { getStudentJournalAction } from "@/server/actions/journal.actions";
import { getEconomicNewsAction } from "@/server/actions/economic-news.actions";
import { getStudentPsychologyLogsAction } from "@/server/actions/psychology.actions";
import { getStudentRiskDataAction } from "@/server/actions/risk-manager.actions";
import { TradingJournalClient } from "@/components/student/trading-journal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Trading Journal, Risk Manager & Psychology | Super Warrior 30",
};

export default async function StudentJournalPage() {
  const [journalData, economicNewsRes, psychologyRes, riskRes] = await Promise.all([
    getStudentJournalAction({ pageSize: 250 }),
    getEconomicNewsAction(),
    getStudentPsychologyLogsAction(),
    getStudentRiskDataAction(),
  ]);

  return (
    <div className="space-y-6">
      <TradingJournalClient
        initialTrades={journalData.trades}
        stats={journalData.stats}
        initialEconomicFeed={economicNewsRes.data}
        initialPsychologyData={psychologyRes.data}
        initialRiskData={riskRes.data}
      />
    </div>
  );
}
