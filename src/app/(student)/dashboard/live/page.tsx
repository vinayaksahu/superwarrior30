import { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentLiveSessionsAction } from "@/server/actions/live-session.actions";
import { LiveSessionCard } from "@/components/live/live-session-card";
import { Video, Radio, Calendar, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Live Classes & Mentorship | Rahul Trade Warrior",
  description: "Join live trading classes, interactive mentorship sessions, and watch past replays.",
};

export default async function StudentLiveHubPage() {
  await requireAuth();
  const { liveNow, upcoming, replays, totalCount, enrolledCourseCount } =
    await getStudentLiveSessionsAction();

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-background to-card border border-amber-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-500 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Interactive Mentorship</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Live Classes & <span className="text-amber-500">Trading Rooms</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Connect with Rahul Sir live on Zoom, Google Meet, or right inside your browser. Ask questions, analyze live market charts, and clear your doubts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur px-4 py-3 text-center min-w-[90px]">
              <span className="block text-xl font-black text-foreground">{liveNow.length}</span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Live Now</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur px-4 py-3 text-center min-w-[90px]">
              <span className="block text-xl font-black text-foreground">{upcoming.length}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upcoming</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur px-4 py-3 text-center min-w-[90px]">
              <span className="block text-xl font-black text-foreground">{replays.length}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Replays</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Live Now Section (if any) */}
      {liveNow.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-lg font-black text-foreground uppercase tracking-wide">
              Happening Right Now
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveNow.map((session) => (
              <LiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Upcoming Sessions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">Upcoming Live Sessions</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {upcoming.length} {upcoming.length === 1 ? "Session" : "Sessions"} Scheduled
          </span>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((session) => (
              <LiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No upcoming sessions right now</h3>
            <p className="text-xs text-muted-foreground mt-1">
              New live trading masterclasses will be announced soon. Keep an eye on this space!
            </p>
          </div>
        )}
      </section>

      {/* 3. Past Class Recordings / Replays */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Class Recordings & Replays</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {replays.length} Replays Available
          </span>
        </div>

        {replays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {replays.map((session) => (
              <LiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
            <Play className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No recordings available yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Live sessions will be automatically archived here once completed.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
