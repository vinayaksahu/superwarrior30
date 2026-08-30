import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/server/dal/auth";
import { getLiveSessionForStudentAction } from "@/server/actions/live-session.actions";
import { EmbeddedLiveRoom } from "@/components/live/embedded-live-room";
import { formatDate } from "@/lib/utils";
import { isBunnyStreamConfigured, getSecurePlaybackUrl } from "@/lib/bunny";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  Play,
  Radio,
  Video,
} from "lucide-react";

interface LiveSessionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: LiveSessionPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getLiveSessionForStudentAction(id);
  if (!res.success || !res.session) {
    return { title: "Live Class | Rahul Trade Warrior" };
  }
  return {
    title: `${res.session.title} | Live Class`,
    description: res.session.description || "Join live trading masterclass",
  };
}

export default async function LiveSessionRoomPage({
  params,
}: LiveSessionPageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const res = await getLiveSessionForStudentAction(id);

  if (!res.success || !res.session) {
    if (res.requiresEnrollment) {
      return (
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center my-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Enrollment Required</h2>
          <p className="text-xs text-muted-foreground mb-6">
            This live session is exclusively for students enrolled in{" "}
            <span className="font-bold text-foreground">{res.courseSlug}</span>.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard/live"
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Back to Live Hub
            </Link>
            {res.courseSlug && (
              <Link
                href={`/courses/${res.courseSlug}`}
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
              >
                View Course
              </Link>
            )}
          </div>
        </div>
      );
    }
    notFound();
  }

  const session = res.session;
  const isCompleted = session.status === "COMPLETED";
  const hasRecording = Boolean(session.recordingUrl || session.bunnyVideoId);

  // If completed and has recording, render Replay View
  if (isCompleted && hasRecording) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/live"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Live Hub</span>
          </Link>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            Class Recording Replay
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
          {session.bunnyVideoId ? (
            <div className="relative aspect-video w-full bg-black select-none">
              <iframe
                src={getSecurePlaybackUrl(session.bunnyVideoId, 3600, "embed")}
                loading="lazy"
                className="h-full w-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={session.title}
              />
              <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] font-mono text-white/40 backdrop-blur-sm">
                {user.email} • Protected Replay
              </div>
            </div>
          ) : session.recordingUrl ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={session.recordingUrl}
                title={session.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          <div className="p-6">
            <h1 className="text-xl sm:text-2xl font-black text-foreground mb-2">
              {session.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4 text-foreground/70" />
                <span>{formatDate(session.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-foreground/70" />
                <span>{session.durationMinutes} Minutes</span>
              </div>
            </div>
            {session.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {session.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render Active Live Room / Launcher
  return (
    <div className="pb-8">
      <EmbeddedLiveRoom
        session={session}
        currentUser={
          res.currentUser || {
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: user.role,
          }
        }
      />
    </div>
  );
}
