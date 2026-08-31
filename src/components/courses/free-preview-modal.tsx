"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getLessonPreviewMediaUrlAction } from "@/server/actions/course.actions";
import { Eye, X, Loader2, Play, Lock, RotateCcw, Sparkles, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface FreePreviewModalProps {
  lessonId: string;
  lessonTitle: string;
  contentType: string;
  courseId?: string;
  courseSlug?: string;
  coursePrice?: number;
}

const PREVIEW_LIMIT_SEC = 15;

export function FreePreviewButton({
  lessonId,
  lessonTitle,
  contentType,
  courseId: initialCourseId,
  courseSlug: initialCourseSlug,
  coursePrice: initialCoursePrice,
}: FreePreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaData, setMediaData] = useState<{
    lesson: {
      id: string;
      title: string;
      contentType: string;
      textContent: string | null;
      durationSec?: number;
    };
    signedUrl: string | null;
    provider?: string;
    bunnyVideoId?: string | null;
    courseId?: string;
    courseSlug?: string;
    coursePrice?: number | null;
    courseTitle?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Preview countdown & limit state
  const [timeLeft, setTimeLeft] = useState(PREVIEW_LIMIT_SEC);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const effectiveCourseId = initialCourseId || mediaData?.courseId;
  const effectiveCourseSlug = initialCourseSlug || mediaData?.courseSlug;
  const effectiveCoursePrice = initialCoursePrice ?? mediaData?.coursePrice;

  // Handle open modal
  const handleOpen = () => {
    setIsOpen(true);
    setTimeLeft(PREVIEW_LIMIT_SEC);
    setIsLimitReached(false);

    if (!mediaData) {
      startTransition(async () => {
        try {
          const res = await getLessonPreviewMediaUrlAction(lessonId);
          setMediaData(res);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to load preview";
          toast.error(msg);
        }
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeLeft(PREVIEW_LIMIT_SEC);
    setIsLimitReached(false);
  };

  const handleReplay = useCallback(() => {
    setTimeLeft(PREVIEW_LIMIT_SEC);
    setIsLimitReached(false);
    setReplayKey((prev) => prev + 1);
  }, []);

  // Timer countdown for Video preview
  useEffect(() => {
    if (!isOpen || isLimitReached || !mediaData?.signedUrl || contentType !== "VIDEO") {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsLimitReached(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isLimitReached, mediaData?.signedUrl, contentType, replayKey]);

  // Listen for Bunny Stream postMessage events
  useEffect(() => {
    if (!isOpen || isLimitReached || contentType !== "VIDEO") return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === "string") {
          data = JSON.parse(data);
        }
        const currentTime =
          data?.currentTime ??
          data?.data?.currentTime ??
          data?.value?.currentTime ??
          data?.time;

        if (typeof currentTime === "number" && currentTime >= PREVIEW_LIMIT_SEC) {
          setIsLimitReached(true);
          setTimeLeft(0);
        }
      } catch {
        // Non-JSON messages ignored
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, isLimitReached, contentType]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
      >
        <Eye className="h-3.5 w-3.5" />
        Preview (15s)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="rounded bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Free 15s Preview
                </span>
                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate max-w-md">
                  {lessonTitle}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6">
              {isPending ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating secure preview stream...</p>
                </div>
              ) : mediaData?.signedUrl && contentType === "VIDEO" ? (
                <div className="space-y-3">
                  {/* Timer & Live Preview Status Bar */}
                  {!isLimitReached && (
                    <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Free Preview Playing</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs">
                        <span>Preview limit:</span>
                        <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {timeLeft}s remaining
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Video Player Container */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-border">
                    {/* Paywall Overlay when 15s limit reached */}
                    {isLimitReached && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-200 select-none">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                          <Lock className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 mb-2">
                          <span>15-Second Free Preview Ended</span>
                        </div>

                        <h4 className="text-base sm:text-xl font-bold text-white mb-1.5">
                          Unlock Full Lesson & Complete Course
                        </h4>

                        <p className="text-xs sm:text-sm text-neutral-300 max-w-md mb-5 leading-relaxed">
                          Enroll now to get unlimited access to the full video, all modules, downloadable resources, and live community mentorship.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
                          {effectiveCourseId ? (
                            <Link
                              href={`/checkout/${effectiveCourseId}`}
                              className="flex h-11 w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                            >
                              <Sparkles className="h-4 w-4" />
                              Enroll Now {effectiveCoursePrice ? `• ₹${effectiveCoursePrice}` : ""}
                            </Link>
                          ) : effectiveCourseSlug ? (
                            <Link
                              href={`/courses/${effectiveCourseSlug}`}
                              className="flex h-11 w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                            >
                              <Sparkles className="h-4 w-4" />
                              Enroll Now
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            onClick={handleReplay}
                            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/90 px-4 text-xs font-semibold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Replay (15s)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Video Player / Iframe */}
                    {!isLimitReached && (
                      mediaData.provider === "BUNNY" || mediaData.bunnyVideoId ? (
                        <iframe
                          key={replayKey}
                          src={mediaData.signedUrl}
                          loading="lazy"
                          className="h-full w-full border-0"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          title={lessonTitle}
                        />
                      ) : (
                        <video
                          key={replayKey}
                          ref={videoRef}
                          src={mediaData.signedUrl}
                          controls
                          controlsList="nodownload"
                          onContextMenu={(e) => e.preventDefault()}
                          autoPlay
                          onTimeUpdate={(e) => {
                            if (e.currentTarget.currentTime >= PREVIEW_LIMIT_SEC) {
                              e.currentTarget.pause();
                              setIsLimitReached(true);
                              setTimeLeft(0);
                            }
                          }}
                          className="h-full w-full object-contain"
                        />
                      )
                    )}
                  </div>
                </div>
              ) : mediaData?.signedUrl && contentType === "PDF" ? (
                <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`${mediaData.signedUrl}#toolbar=0`}
                    className="h-full w-full"
                    title={lessonTitle}
                  />
                </div>
              ) : mediaData?.lesson?.textContent && contentType === "TEXT" ? (
                <div className="prose prose-invert max-w-none max-h-96 overflow-y-auto whitespace-pre-wrap p-4 rounded-lg bg-muted/30 text-sm leading-relaxed">
                  {mediaData.lesson.textContent}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No media uploaded for this preview lesson yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
