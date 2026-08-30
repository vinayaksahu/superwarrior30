import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentCashbacksAction } from "@/server/actions/broker.actions";
import { StudentCashbacksClient } from "@/components/student/student-cashbacks-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Broker Cashbacks | Super Warrior 30",
};

export default async function StudentCashbacksPage() {
  const user = await requireAuth();
  const claims = await getStudentCashbacksAction();

  return (
    <StudentCashbacksClient
      claims={claims as any}
      userEmail={user.email}
      userName={user.name}
    />
  );
}
