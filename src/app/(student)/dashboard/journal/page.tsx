import type { Metadata } from "next";
import { getStudentJournalAction } from "@/server/actions/journal.actions";
import { TradingJournalClient } from "@/components/student/trading-journal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Trading Journal | Super Warrior 30",
};

export default async function StudentJournalPage() {
  const data = await getStudentJournalAction({ pageSize: 50 });

  return (
    <div className="space-y-6">
      <TradingJournalClient
        initialTrades={data.trades}
        stats={data.stats}
      />
    </div>
  );
}
