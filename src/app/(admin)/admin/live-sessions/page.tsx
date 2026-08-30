import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/dal/auth";
import { getLiveSessionsAdminAction } from "@/server/actions/live-session.actions";
import { LiveSessionTableActions } from "@/components/admin/live-session-table-actions";
import { formatDate } from "@/lib/utils";
import {
  Video,
  Plus,
  Radio,
  Calendar,
  Clock,
  Users,
  Search,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Live Sessions Management | Admin",
  description: "Schedule live classes, webinars, and manage video meetings.",
};

interface AdminLiveSessionsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function AdminLiveSessionsPage({
  searchParams,
}: AdminLiveSessionsPageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const status = sp.status || "ALL";
  const search = sp.search || "";
  const page = parseInt(sp.page || "1", 10);

  const { sessions, pagination } = await getLiveSessionsAdminAction({
    status,
    search,
    page,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Radio className="h-6 w-6 text-amber-500" />
            <span>Live Sessions & Video Meetings</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Schedule live classes on Zoom, Google Meet, or built-in in-app video rooms.
          </p>
        </div>

        <Link
          href="/admin/live-sessions/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Live Class</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        {[
          { id: "ALL", label: "All Sessions" },
          { id: "LIVE", label: "🔴 Live Now" },
          { id: "UPCOMING", label: "📅 Upcoming" },
          { id: "COMPLETED", label: "✅ Completed" },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/live-sessions?status=${tab.id}${search ? `&search=${search}` : ""}`}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
              status === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Session / Topic</th>
                <th className="px-4 py-3.5">Provider</th>
                <th className="px-4 py-3.5">Scheduled Time</th>
                <th className="px-4 py-3.5">Audience / Course</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Attendees</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/live-sessions/${session.id}`}
                          className="hover:text-primary transition-colors line-clamp-1 max-w-xs"
                        >
                          {session.title}
                        </Link>
                        {session.description && (
                          <span className="text-[11px] font-normal text-muted-foreground line-clamp-1">
                            {session.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Video className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {session.provider === "ZOOM"
                            ? "Zoom"
                            : session.provider === "GOOGLE_MEET"
                            ? "Google Meet"
                            : session.provider === "EMBEDDED_ROOM"
                            ? "In-App Room"
                            : "Bunny"}
                        </span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {formatDate(session.scheduledAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {session.durationMinutes} Mins duration
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {session.course ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground max-w-[150px] truncate">
                          <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{session.course.title}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          All Students
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {session.status === "LIVE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-black text-red-500 border border-red-500/30 animate-pulse">
                          <Radio className="h-2.5 w-2.5" />
                          LIVE
                        </span>
                      ) : session.status === "UPCOMING" ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                          UPCOMING
                        </span>
                      ) : session.status === "COMPLETED" ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold text-destructive">
                          CANCELLED
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{session._count.attendees}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <LiveSessionTableActions session={session} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Radio className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-sm">No live sessions found</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Schedule a new session to get started.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
