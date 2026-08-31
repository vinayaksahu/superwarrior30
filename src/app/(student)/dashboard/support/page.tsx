import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentTicketsAction } from "@/server/actions/support.actions";
import { StudentSupportClient } from "@/components/student/student-support-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support Desk & Tickets — Rahul Trade Warrior Academy",
};

export default async function StudentSupportPage() {
  const user = await requireAuth();
  const res = await getStudentTicketsAction();

  return (
    <StudentSupportClient
      tickets={res.tickets || []}
      user={{
        name: user.name,
        email: user.email,
      }}
    />
  );
}
