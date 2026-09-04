"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getLessonPreviewMediaUrlAction } from "@/server/actions/course.actions";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { ProtectedVideoPlayer } from "@/components/learning/protected-video-player";
import { ProtectedPdfViewer } from "@/components/learning/protected-pdf-viewer";
import { Eye, X, Loader2, Play, Lock, RotateCcw, Sparkles, AlertCircle, Clock, FileText, AlignLeft } from "lucide-react";
import { toast } from "sonner";

interface FreePreviewModalProps {
  lessonId: string;
  lessonTitle: string;
  contentType: string;
  courseId?: string;
  courseSlug?: string;
  coursePrice?: number;
  durationSec?: number;
}

export function FreePreviewButton({
  lessonId,
  lessonTitle,
  contentType,
  courseId: initialCourseId,
  courseSlug: initialCourseSlug,
  coursePrice: initialCoursePrice,
  durationSec: initialDurationSec,
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

  const previewLimit =
    (initialDurationSec && initialDurationSec > 0)
      ? initialDurationSec
      : (mediaData?.lesson?.durationSec && mediaData.lesson.durationSec > 0)
      ? mediaData.lesson.durationSec
      : contentType === "PDF"
      ? 1
      : contentType === "TEXT"
      ? 150
      : 15;

  // Preview countdown & limit state
  const [timeLeft, setTimeLeft] = useState(previewLimit);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const effectiveCourseId = initialCourseId || mediaData?.courseId;
  const effectiveCourseSlug = initialCourseSlug || mediaData?.courseSlug;
  const effectiveCoursePrice = initialCoursePrice ?? mediaData?.coursePrice;

  // Handle open modal
  const handleOpen = () => {
    setIsOpen(true);
    setTimeLeft(previewLimit);
    setIsLimitReached(false);

    if (!mediaData) {
      startTransition(async () => {
        try {
          const res = await getLessonPreviewMediaUrlAction(lessonId);
          setMediaData(res);
          if (res?.lesson?.durationSec && res.lesson.durationSec > 0) {
            setTimeLeft(res.lesson.durationSec);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to load preview";
          toast.error(msg);
        }
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeLeft(previewLimit);
    setIsLimitReached(false);
  };

  const handleReplay = useCallback(() => {
    setTimeLeft(previewLimit);
    setIsLimitReached(false);
    setReplayKey((prev) => prev + 1);
  }, [previewLimit]);

  // Timer countdown for Video preview (ticks reliably as soon as video loads)
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

  // Modal keyboard & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
      >
        <Eye className="h-3.5 w-3.5" />
        {contentType === "VIDEO"
          ? `Preview (${previewLimit}s)`
          : contentType === "PDF"
          ? `Preview (${previewLimit} Page${previewLimit > 1 ? "s" : ""})`
          : "Preview (Article)"}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in cursor-pointer overflow-y-auto"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/40 shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  {contentType === "VIDEO" && <Clock className="h-3 w-3" />}
                  {contentType === "PDF" && <FileText className="h-3 w-3" />}
                  {contentType === "TEXT" && <AlignLeft className="h-3 w-3" />}
                  {contentType === "VIDEO"
                    ? `${previewLimit}s Preview`
                    : contentType === "PDF"
                    ? `${previewLimit} Pg Preview`
                    : "Article"}
                </span>
                <h3 className="font-semibold text-foreground text-xs sm:text-base truncate min-w-0">
                  {lessonTitle}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 cursor-pointer"
                aria-label="Close preview modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3 sm:p-6">
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
                      <div className="flex items-center gap-2 font-medium text-emerald-400">
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
                    {/* Paywall Overlay when preview limit reached */}
                    {isLimitReached && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-200 select-none">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                          <Lock className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 mb-2">
                          <span>{previewLimit}-Second Free Preview Ended</span>
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
                            Replay ({previewLimit}s)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Video Player */}
                    {!isLimitReached && (
                      <ProtectedVideoPlayer
                        key={replayKey}
                        src={mediaData.signedUrl}
                        title={lessonTitle}
                        durationSec={previewLimit}
                        maxPreviewSeconds={previewLimit}
                        onPreviewLimitReached={() => {
                          setIsLimitReached(true);
                          setTimeLeft(0);
                        }}
                        autoPlay
                        watermarkText="Free Preview • Super Warrior 30"
                        className="h-full w-full object-contain rounded-none border-0"
                      />
                    )}
                  </div>
                </div>
              ) : mediaData?.signedUrl && contentType === "PDF" ? (
                <div className="space-y-3">
                  {/* PDF Preview Notice */}
                  <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Showing First {previewLimit} Page{previewLimit > 1 ? "s" : ""} (Free Preview)</span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Full Document Locked
                    </span>
                  </div>

                  {/* Protected Canvas PDF Viewer (Renders directly inside popup across mobile and desktop) */}
                  <ProtectedPdfViewer
                    pdfUrl={`/api/lessons/${lessonId}/pdf?preview=true`}
                    title={lessonTitle}
                    maxPages={previewLimit}
                    className="rounded-xl border border-border shadow-inner"
                    viewportHeightClass="h-[380px] sm:h-[480px] min-h-[300px] max-h-[580px]"
                  />

                  {/* Paywall Banner under PDF */}
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <p className="text-xs font-bold text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        Preview Limited to First {previewLimit} Page{previewLimit > 1 ? "s" : ""}
                      </p>
                      <p className="text-[11px] text-neutral-300 mt-0.5">
                        Enroll in the course to view and download complete PDF notes & slides.
                      </p>
                    </div>

                    {effectiveCourseId ? (
                      <Link
                        href={`/checkout/${effectiveCourseId}`}
                        className="shrink-0 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Unlock Full PDF {effectiveCoursePrice ? `• ₹${effectiveCoursePrice}` : ""}
                      </Link>
                    ) : effectiveCourseSlug ? (
                      <Link
                        href={`/courses/${effectiveCourseSlug}`}
                        className="shrink-0 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Unlock Full PDF
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : mediaData?.lesson?.textContent && contentType === "TEXT" ? (
                <div className="space-y-4">
                  {/* Article Preview Notice */}
                  <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <AlignLeft className="h-3.5 w-3.5" />
                      <span>Article Sample Preview</span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Full Article Locked
                    </span>
                  </div>

                  {/* Text Content with Word Truncation */}
                  <div className="relative rounded-xl border border-border bg-muted/20 p-5">
                    {(() => {
                      const fullText = mediaData.lesson.textContent;
                      const words = fullText.split(/\s+/);
                      const wordLimit = previewLimit > 0 ? previewLimit : 150;
                      const isTruncated = words.length > wordLimit;
                      const displayText = isTruncated ? words.slice(0, wordLimit).join(" ") + "..." : fullText;

                      return (
                        <>
                          <div className="text-sm leading-relaxed text-neutral-200">
                            <MarkdownContent content={displayText} />
                          </div>

                          {isTruncated && (
                            <div className="mt-5 rounded-xl border border-amber-500/25 bg-gradient-to-t from-black via-black/95 to-black/70 p-5 text-center flex flex-col items-center select-none shadow-lg">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-2 border border-amber-500/30">
                                <Lock className="h-5 w-5" />
                              </div>
                              <h5 className="text-sm font-bold text-white mb-1">
                                Article Preview Ended
                              </h5>
                              <p className="text-xs text-neutral-300 max-w-sm mb-4">
                                Enroll now to read the full trading setup notes, rules, and complete lesson material.
                              </p>
                              {effectiveCourseId ? (
                                <Link
                                  href={`/checkout/${effectiveCourseId}`}
                                  className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Read Full Article {effectiveCoursePrice ? `• ₹${effectiveCoursePrice}` : ""}
                                </Link>
                              ) : effectiveCourseSlug ? (
                                <Link
                                  href={`/courses/${effectiveCourseSlug}`}
                                  className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Read Full Article
                                </Link>
                              ) : null}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
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
