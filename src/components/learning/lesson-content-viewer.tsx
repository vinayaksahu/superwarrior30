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
} from "lucide-react";
import { toast } from "sonner";

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
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(isCompleted);
  const [isPending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleToggleComplete = () => {
    const newStatus = completed ? "IN_PROGRESS" : "COMPLETED";

    startTransition(async () => {
      try {
        const res = await updateLessonProgressAction({
          lessonId,
          status: newStatus,
        });

        if (res.success) {
          setCompleted(!completed);
          toast.success(!completed ? "Lesson marked complete!" : "Progress updated");
          router.refresh();
        } else {
          toast.error(res.message || "Failed to update progress");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error saving progress";
        toast.error(msg);
      }
    });
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mediaData.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            Format: {mediaData.contentType.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleComplete}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
              completed
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {completed ? "Completed" : "Mark Complete"}
          </button>
        </div>
      </div>

      {/* Main Media Player Container */}
      <div className="rounded-2xl border border-border bg-black/90 shadow-2xl overflow-hidden">
        {mediaData.contentType === "VIDEO" ? (
          mediaData.signedUrl ? (
            <div className="aspect-video w-full">
              <video
                ref={videoRef}
                src={mediaData.signedUrl}
                controls
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onEnded={handleVideoEnded}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center bg-card">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Video stream is being processed or not yet uploaded.</p>
            </div>
          )
        ) : mediaData.contentType === "PDF" ? (
          mediaData.signedUrl ? (
            <div className="h-[650px] w-full bg-background">
              <iframe
                src={`${mediaData.signedUrl}#toolbar=0`}
                className="h-full w-full"
                title={mediaData.title}
              />
            </div>
          ) : (
            <div className="flex h-96 w-full flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center bg-card">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">PDF document not yet attached.</p>
            </div>
          )
        ) : (
          <div className="p-8 bg-card text-foreground">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {mediaData.textContent || "No text content available for this lesson."}
            </div>
          </div>
        )}
      </div>

      {/* Next/Prev Navigation Footer */}
      <div className="flex items-center justify-between pt-4">
        {prevLessonId ? (
          <button
            type="button"
            onClick={() => router.push(`/learn/${courseSlug}/${prevLessonId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
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
