import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentCopyTradingDataAction } from "@/server/actions/copy-trading.actions";
import { StudentCopyTradingClient } from "@/components/student/student-copy-trading-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Copy Trading | Super Warrior 30",
  description: "Automated MT5 copy trading with Rahul Trade Warrior Academy Master Account.",
};

export default async function StudentCopyTradingPage() {
  await requireAuth();
  const data = await getStudentCopyTradingDataAction();

  return (
    <StudentCopyTradingClient
      initialMaster={data.master as any}
      initialSubscription={data.subscription as any}
      initialLogs={data.logs as any}
      settings={data.settings}
    />
  );
}
