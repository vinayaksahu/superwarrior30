import type { Metadata } from "next";
import { getAdminJournalsAction } from "@/server/actions/journal.actions";
import { getAcademyRiskRulesAction } from "@/server/actions/risk-manager.actions";
import { AdminJournalClient } from "@/components/admin/admin-journal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Trading Journals | Super Warrior 30 Admin",
};

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; outcome?: string; emotion?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search;
  const outcome = params.outcome;
  const emotion = params.emotion;

  const [data, riskRules] = await Promise.all([
    getAdminJournalsAction({
      page,
      search,
      outcome,
      emotion,
      pageSize: 50,
    }),
    getAcademyRiskRulesAction(),
  ]);

  return (
    <div className="space-y-6">
      <AdminJournalClient
        initialTrades={data.trades}
        total={data.total}
        initialRiskRules={riskRules}
      />
    </div>
  );
}
