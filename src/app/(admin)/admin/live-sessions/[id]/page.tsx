import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { getLiveSessionByIdAdminAction } from "@/server/actions/live-session.actions";
import { LiveSessionForm } from "@/components/admin/live-session-form";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Users, Calendar, Radio } from "lucide-react";

interface EditLiveSessionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Edit Live Session | Admin",
  description: "Edit live session details and view attendees.",
};

export default async function EditLiveSessionPage({
  params,
}: EditLiveSessionPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [session, courses] = await Promise.all([
    getLiveSessionByIdAdminAction(id),
    prisma.course.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/live-sessions"
            className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-foreground">
              Edit Session: {session.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Update timing, video provider details, or add recording replay.
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/live/${session.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all"
        >
          <Radio className="h-3.5 w-3.5 text-red-500" />
          <span>Preview Student View</span>
        </Link>
      </div>

      {/* Form */}
      <LiveSessionForm initialData={session} courses={courses} />

      {/* Attendees Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 max-w-4xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-foreground">
              Joined Students ({session.attendees.length})
            </h2>
          </div>
        </div>

        {session.attendees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-right">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {session.attendees.map((att) => (
                  <tr key={att.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {att.user.name || "Student"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {att.user.email}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {att.user.phone || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {formatDate(att.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No students have joined this session yet.
          </div>
        )}
      </div>
    </div>
  );
}
