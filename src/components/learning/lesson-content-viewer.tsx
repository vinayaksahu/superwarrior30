"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getEnrolledLessonMediaUrlAction,
  updateLessonProgressAction,
} from "@/server/actions/enrollment.actions";
import {
  CheckCircle2,
  Play,
  FileText,
  AlignLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPdfViewer } from "./protected-pdf-viewer";
import { ProtectedVideoPlayer } from "./protected-video-player";
import { MarkdownContent } from "@/components/shared/markdown-content";

interface LessonContentViewerProps {
  courseSlug: string;
  lessonId: string;
  isCompleted: boolean;
  nextLessonId?: string;
  prevLessonId?: string;
}

export function LessonContentViewer({
  courseSlug,
  lessonId,
  isCompleted,
  nextLessonId,
  prevLessonId,
}: LessonContentViewerProps) {
  const router = useRouter();
  const [mediaData, setMediaData] = useState<{
    lessonId: string;
    title: string;
    contentType: string;
    textContent: string | null;
    signedUrl: string | null;
    durationSec: number;
    provider?: string;
    bunnyVideoId?: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(isCompleted);
  const [isPending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Anti-Piracy Keyboard & Screenshot Protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print, Save, Inspect shortcuts
      if (
        (e.ctrlKey && (e.key === "p" || e.key === "s" || e.key === "u" || e.key === "S" || e.key === "P")) ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
        toast.error("Content is copyright protected. Downloading and printing are disabled.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setCompleted(isCompleted);

    async function fetchMedia() {
      try {
        const res = await getEnrolledLessonMediaUrlAction({
          courseSlug,
          lessonId,
        });
        if (isMounted) {
          setMediaData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load lesson media";
          toast.error(msg);
          setLoading(false);
        }
      }
    }

    fetchMedia();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, lessonId, isCompleted]);

  const [isSaving, setIsSaving] = useState(false);

  const handleToggleComplete = async () => {
    const newStatus = completed ? "IN_PROGRESS" : "COMPLETED";
    setIsSaving(true);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const res = await response.json().catch(() => ({}));

      if (response.ok && res.success) {
        setCompleted(!completed);
        toast.success(!completed ? "Lesson marked complete!" : "Progress updated");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update progress");
      }
    } catch (err: unknown) {
      console.error("Progress save error:", err);
      const msg = err instanceof Error ? err.message : "Error saving progress";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoEnded = () => {
    if (!completed) {
      handleToggleComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading secure course media...</p>
      </div>
    );
  }

  if (!mediaData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
        <h3 className="text-base font-semibold">Lesson unavailable</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Could not retrieve lesson data. Please check your enrollment status or try again.
        </p>
      </div>
    );
  }

  // PDF URL with toolbar and download controls explicitly disabled
  const pdfStreamUrl = `/api/lessons/${lessonId}/pdf#toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div
      className="space-y-6 max-w-4xl mx-auto select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {mediaData.title}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              <Lock className="h-2.5 w-2.5" />
              PROTECTED
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 capitalize font-medium">
            Format: {mediaData.contentType.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleToggleComplete}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer ${
              completed
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {completed ? "Completed" : "Mark Complete"}
          </button>
        </div>
      </div>

      {/* Main Media Player Container */}
      <div
        className="relative rounded-2xl border border-border bg-black/95 shadow-2xl overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Anti-Piracy Watermark Badge */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded bg-black/60 px-2 py-1 text-[10px] font-mono text-white/40 backdrop-blur-sm">
          Protected • Rahul Trade Warrior Academy
        </div>

        {mediaData.contentType === "VIDEO" ? (
          mediaData.signedUrl ? (
            <ProtectedVideoPlayer
              src={mediaData.signedUrl}
              title={mediaData.title}
              durationSec={mediaData.durationSec}
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center bg-card">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Video stream is being processed or not yet uploaded.</p>
            </div>
          )
        ) : mediaData.contentType === "PDF" ? (
          <ProtectedPdfViewer
            pdfUrl={`/api/lessons/${lessonId}/pdf`}
            title={mediaData.title}
          />
        ) : (
          <div className="p-8 bg-card text-foreground">
            <MarkdownContent content={mediaData.textContent || "No text content available for this lesson."} />
          </div>
        )}
      </div>

      {/* Next/Prev Navigation Footer */}
      <div className="flex items-center justify-between pt-4">
        {prevLessonId ? (
          <button
            type="button"
            onClick={() => router.push(`/learn/${courseSlug}/${prevLessonId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Lesson
          </button>
        ) : (
          <div />
        )}

        {nextLessonId ? (
          <button
            type="button"
            onClick={() => router.push(`/learn/${courseSlug}/${nextLessonId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
          >
            Next Lesson
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
