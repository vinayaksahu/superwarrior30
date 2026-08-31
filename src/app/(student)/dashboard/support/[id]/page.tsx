import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/server/dal/auth";
import { getStudentTicketDetailAction } from "@/server/actions/support.actions";
import { StudentTicketThread } from "@/components/student/student-ticket-thread";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ticket Details — Support Desk",
};

export default async function StudentTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const res = await getStudentTicketDetailAction(id);

  if (!res.success || !res.ticket) {
    notFound();
  }

  return (
    <StudentTicketThread
      ticket={res.ticket}
      currentUser={{
        id: user.id,
        name: user.name,
        email: user.email,
      }}
    />
  );
}
