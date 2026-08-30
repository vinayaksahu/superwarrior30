"use client";

import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Play,
  Users,
  Radio,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface LiveSessionCardProps {
  session: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    provider: string;
    meetingUrl: string | null;
    meetingId: string | null;
    passcode: string | null;
    scheduledAt: Date | string;
    durationMinutes: number;
    status: string;
    recordingUrl: string | null;
    bunnyVideoId: string | null;
    course?: { title: string; slug: string } | null;
    host?: { name: string | null } | null;
    _count?: { attendees: number };
  };
}

export function LiveSessionCard({ session }: LiveSessionCardProps) {
  const scheduledDate = new Date(session.scheduledAt);
  const isLive = session.status === "LIVE";
  const isCompleted = session.status === "COMPLETED";
  const isUpcoming = session.status === "UPCOMING";

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case "ZOOM":
        return {
          name: "Zoom Meeting",
          badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          iconColor: "text-blue-400",
        };
      case "GOOGLE_MEET":
        return {
          name: "Google Meet",
          badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          iconColor: "text-emerald-400",
        };
      case "EMBEDDED_ROOM":
        return {
          name: "In-App Live Room",
          badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          iconColor: "text-amber-400",
        };
      case "BUNNY_LIVE":
        return {
          name: "Bunny Broadcast",
          badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
          iconColor: "text-orange-400",
        };
      default:
        return {
          name: "Live Session",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          iconColor: "text-primary",
        };
    }
  };

  const providerInfo = getProviderInfo(session.provider);

  // Generate Google Calendar Link
  const makeGoogleCalendarUrl = () => {
    const startIso = scheduledDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(scheduledDate.getTime() + session.durationMinutes * 60000);
    const endIso = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = encodeURIComponent(`[Trade Warrior] Live: ${session.title}`);
    const details = encodeURIComponent(
      `${session.description || ""}\n\nJoin link: https://superwarrior30.com/dashboard/live/${session.id}`
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
        isLive
          ? "border-red-500/50 bg-gradient-to-b from-red-950/10 to-card ring-1 ring-red-500/30"
          : "border-border hover:border-primary/40"
      )}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-black text-red-500 border border-red-500/30 animate-pulse">
                <Radio className="h-3 w-3" />
                LIVE NOW
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                COMPLETED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                UPCOMING
              </span>
            )}

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                providerInfo.badgeColor
              )}
            >
              <Video className="h-3 w-3" />
              {providerInfo.name}
            </span>
          </div>

          {session.course && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate max-w-[140px]">
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">{session.course.title}</span>
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
          {session.title}
        </h3>

        {session.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {session.description}
          </p>
        )}
      </div>

      {/* Meta Info & CTA */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <span className="truncate">{formatDate(scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <span>{session.durationMinutes} Mins</span>
          </div>
        </div>

        {/* Action Button */}
        {isLive ? (
          <Link
            href={`/dashboard/live/${session.id}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-red-600/30 hover:bg-red-500 active:scale-[0.98] transition-all"
          >
            <Radio className="h-4 w-4" />
            <span>Join Live Class Now</span>
          </Link>
        ) : isCompleted && (session.recordingUrl || session.bunnyVideoId) ? (
          <Link
            href={`/dashboard/live/${session.id}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground hover:bg-accent active:scale-[0.98] transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Watch Class Recording</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/live/${session.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-all"
            >
              <span>View Details</span>
            </Link>
            <a
              href={makeGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="Add to Google Calendar"
            >
              <Calendar className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
