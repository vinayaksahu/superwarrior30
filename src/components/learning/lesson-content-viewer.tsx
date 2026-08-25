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
  ExternalLink,
  Download,
  Maximize2,
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

  const pdfStreamUrl = `/api/lessons/${lessonId}/pdf`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {mediaData.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize font-medium">
            Format: {mediaData.contentType.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {mediaData.contentType === "PDF" && (
            <a
              href={pdfStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              Open PDF in New Tab
            </a>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleComplete}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer ${
              completed
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
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
      <div className="rounded-2xl border border-border bg-black/95 shadow-2xl overflow-hidden">
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
          <div className="w-full flex flex-col bg-background">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {mediaData.title}
              </span>
              <a
                href={pdfStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fullscreen View
              </a>
            </div>

            <div className="h-[750px] w-full bg-slate-900/50">
              <object
                data={`${pdfStreamUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="h-full w-full"
              >
                <iframe
                  src={`${pdfStreamUrl}#toolbar=1`}
                  className="h-full w-full border-0"
                  title={mediaData.title}
                >
                  <div className="p-8 text-center space-y-4">
                    <p className="text-sm text-foreground">PDF preview not supported by this browser.</p>
                    <a
                      href={pdfStreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                    >
                      <Download className="h-4 w-4" />
                      Download / Open PDF
                    </a>
                  </div>
                </iframe>
              </object>
            </div>
          </div>
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
