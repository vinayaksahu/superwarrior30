"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedPdfViewer } from "@/components/learning/protected-pdf-viewer";
import { ProtectedVideoPlayer } from "@/components/learning/protected-video-player";
import { StudentQuizView } from "@/components/learning/student-quiz-view";
import { StudentHomeworkView } from "@/components/learning/student-homework-view";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getEnrolledLessonMediaUrlAction } from "@/server/actions/enrollment.actions";
import {
  CheckCircle2,
  Circle,
  Video,
  FileText,
  AlignLeft,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Lock,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface LessonInfo {
  id: string;
  title: string;
  slug: string;
  contentType: string;
  durationSec: number;
  isFreePreview?: boolean;
}

interface ModuleInfo {
  id: string;
  title: string;
  position: number;
  lessons: LessonInfo[];
}

interface CourseClassroomViewProps {
  courseSlug: string;
  courseTitle: string;
  activeLessonId: string;
  modules: ModuleInfo[];
  initialProgressMap: Record<string, { status: string; watchTimeSeconds: number }>;
  initialProgressPercentage: number;
  prevLessonId?: string;
  nextLessonId?: string;
}

export function CourseClassroomView({
  courseSlug,
  courseTitle,
  activeLessonId,
  modules,
  initialProgressMap,
  initialProgressPercentage,
  prevLessonId,
  nextLessonId,
}: CourseClassroomViewProps) {
  const router = useRouter();
  const [progressMap, setProgressMap] = useState(initialProgressMap);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync state whenever server revalidates or sends fresh props
  useEffect(() => {
    setProgressMap(initialProgressMap);
  }, [initialProgressMap]);

  // Compute total lessons
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  // Real-time dynamic progress calculation
  const completedLessonsCount = Object.values(progressMap).filter(
    (p) => p?.status === "COMPLETED"
  ).length;

  const currentProgressPercent =
    totalLessons > 0
      ? Math.round((completedLessonsCount / totalLessons) * 100)
      : initialProgressPercentage;

  const isCurrentCompleted = progressMap[activeLessonId]?.status === "COMPLETED";

  // Anti-Piracy Keyboard & Screenshot Protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Fetch real active lesson media details securely
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function fetchMedia() {
      try {
        const res = await getEnrolledLessonMediaUrlAction({
          courseSlug,
          lessonId: activeLessonId,
        });
        if (isMounted) {
          setMediaData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Failed to load lesson media";
          toast.error(msg);
          setLoading(false);
        }
      }
    }

    fetchMedia();

    return () => {
      isMounted = false;
    };
  }, [activeLessonId, courseSlug]);

  // Real-time persistent toggle completion
  const handleToggleComplete = async () => {
    if (isSaving) return;
    const prevStatus = progressMap[activeLessonId]?.status || "NOT_STARTED";
    const newStatus = isCurrentCompleted ? "IN_PROGRESS" : "COMPLETED";

    // 1. Instant Optimistic UI Update in Sidebar & Topbar
    setProgressMap((prev) => ({
      ...prev,
      [activeLessonId]: {
        ...(prev[activeLessonId] || {}),
        status: newStatus,
        watchTimeSeconds: prev[activeLessonId]?.watchTimeSeconds || 0,
      },
    }));

    // 2. Background API Call
    setIsSaving(true);
    try {
      const res = await fetch(`/api/lessons/${activeLessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        // Rollback optimistic update on failure
        setProgressMap((prev) => ({
          ...prev,
          [activeLessonId]: {
            ...(prev[activeLessonId] || {}),
            status: prevStatus,
            watchTimeSeconds: prev[activeLessonId]?.watchTimeSeconds || 0,
          },
        }));
        throw new Error(data.error || "Failed to persist lesson completion");
      }

      // Success notification confirmed by database write
      if (newStatus === "COMPLETED") {
        toast.success("Lesson marked complete! Checkbox updated.");
      } else {
        toast.info("Lesson marked incomplete.");
      }

      // Invalidate Next.js App Router client cache and re-fetch server state
      router.refresh();
    } catch (err: unknown) {
      console.error("Progress save error:", err);
      const msg = err instanceof Error ? err.message : "Error saving progress";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const pdfStreamUrl = `/api/lessons/${activeLessonId}/pdf`;

  // Helper for curriculum items
  const renderCurriculumList = (onItemClick?: () => void) => (
    <div className="space-y-4">
      {modules.map((module) => (
        <div key={module.id} className="space-y-1.5">
          <div className="px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-500/90">
            Module {module.position}: {module.title}
          </div>

          <div className="space-y-1">
            {module.lessons.map((lesson) => {
              const isCurrent = lesson.id === activeLessonId;
              const isCompleted = progressMap[lesson.id]?.status === "COMPLETED";

              return (
                <Link
                  key={lesson.id}
                  href={`/learn/${courseSlug}/${lesson.id}`}
                  onClick={onItemClick}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm"
                      : isCompleted
                      ? "bg-emerald-500/5 text-foreground hover:bg-muted"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    {isCompleted ? (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500/20 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-muted-foreground/30 text-transparent">
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
                      </div>
                    )}

                    <span className={`truncate ${isCompleted ? "text-foreground font-semibold" : ""}`}>
                      {lesson.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                    {lesson.contentType === "VIDEO" ? (
                      <Video className="h-3.5 w-3.5 text-primary" />
                    ) : lesson.contentType === "PDF" ? (
                      <FileText className="h-3.5 w-3.5 text-amber-400" />
                    ) : lesson.contentType === "TEXT" ? (
                      <AlignLeft className="h-3.5 w-3.5 text-sky-400" />
                    ) : lesson.contentType === "QUIZ" ? (
                      <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                    ) : (
                      <Award className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] select-none">
      {/* ========================================================
          MOBILE TOP APP BAR (Shown ONLY on screens < lg)
      ======================================================== */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2 truncate">
          <Link
            href="/dashboard/courses"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-400"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Curriculum ({completedLessonsCount}/{totalLessons})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            disabled={isSaving}
            onClick={handleToggleComplete}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow transition-all ${
              isCurrentCompleted
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isCurrentCompleted ? "Done ✓" : "Complete"}
          </button>
        </div>
      </div>

      {/* ========================================================
          MOBILE CURRICULUM DRAWER MODAL
      ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative flex w-80 max-w-[85vw] flex-col bg-card border-r border-border p-4 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-foreground line-clamp-1">{courseTitle}</h3>
                <p className="text-[11px] font-bold text-amber-400 mt-0.5">
                  Progress: {currentProgressPercent}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {renderCurriculumList(() => setIsMobileDrawerOpen(false))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DESKTOP SIDEBAR (Hidden on mobile, visible on lg:)
      ======================================================== */}
      <aside className="hidden lg:flex w-80 shrink-0 border-r border-border bg-card flex-col h-[calc(100vh-4rem)] sticky top-16 z-10">
        <div className="p-4 border-b border-border space-y-3">
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Enrolled Courses
          </Link>
          <h2 className="font-extrabold text-sm sm:text-base text-foreground line-clamp-1">
            {courseTitle}
          </h2>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="text-amber-400">{currentProgressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full bg-amber-400 shadow-sm transition-all duration-500 ease-out"
                style={{ width: `${currentProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {renderCurriculumList()}
        </div>
      </aside>

      {/* ========================================================
          MAIN MEDIA VIEWER (Responsive Mobile & Desktop)
      ======================================================== */}
      <main
        className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Desktop Header bar */}
        <div className="hidden lg:flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {mediaData?.title || "Lesson"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                <Lock className="h-2.5 w-2.5" />
                PROTECTED
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize font-medium">
              Format: {mediaData?.contentType?.toLowerCase() || "Document"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              disabled={isSaving}
              onClick={handleToggleComplete}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-lg transition-all cursor-pointer ${
                isCurrentCompleted
                  ? "bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isCurrentCompleted ? "Completed ✓" : "Mark Complete"}
            </button>
          </div>
        </div>

        {/* Mobile Header Title */}
        <div className="lg:hidden flex items-center justify-between pb-1">
          <h1 className="text-lg font-black tracking-tight text-foreground line-clamp-1">
            {mediaData?.title || "Lesson"}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400 shrink-0">
            <Lock className="h-2.5 w-2.5" />
            PROTECTED
          </span>
        </div>

        {/* Media Player Container */}
        {loading ? (
          <div className="flex h-80 sm:h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-xs text-muted-foreground">Loading secure course media...</p>
          </div>
        ) : mediaData?.contentType === "QUIZ" ? (
          <StudentQuizView
            lessonId={activeLessonId}
            courseSlug={courseSlug}
            onLessonCompleted={() => handleToggleComplete()}
          />
        ) : mediaData?.contentType === "ASSIGNMENT" ? (
          <StudentHomeworkView
            lessonId={activeLessonId}
            courseSlug={courseSlug}
            onLessonCompleted={() => handleToggleComplete()}
          />
        ) : mediaData?.contentType === "VIDEO" ? (
          mediaData.signedUrl ? (
            <ProtectedVideoPlayer
              src={mediaData.signedUrl}
              title={mediaData.title}
              durationSec={mediaData.durationSec}
              onEnded={() => handleToggleComplete()}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center bg-card rounded-2xl border border-border">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Video stream is being processed or not yet uploaded.</p>
            </div>
          )
        ) : mediaData?.contentType === "PDF" ? (
          <ProtectedPdfViewer pdfUrl={pdfStreamUrl} title={mediaData.title} />
        ) : (
          <div className="p-8 bg-card text-foreground rounded-2xl border border-border">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {mediaData?.textContent || "No text content available for this lesson."}
            </div>
          </div>
        )}

        {/* Next / Previous Lesson Navigation Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-4">
          {prevLessonId ? (
            <button
              type="button"
              onClick={() => router.push(`/learn/${courseSlug}/${prevLessonId}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3 sm:px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {nextLessonId ? (
            <button
              type="button"
              onClick={() => router.push(`/learn/${courseSlug}/${nextLessonId}`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 sm:px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
            >
              Next Lesson
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </main>
    </div>
  );
}
