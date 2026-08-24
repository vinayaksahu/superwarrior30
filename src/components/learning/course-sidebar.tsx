"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Video, FileText, AlignLeft, ArrowLeft, Clock } from "lucide-react";

interface LessonInfo {
  id: string;
  title: string;
  slug: string;
  contentType: string;
  durationSec: number;
}

interface ModuleInfo {
  id: string;
  title: string;
  position: number;
  lessons: LessonInfo[];
}

interface CourseSidebarProps {
  courseSlug: string;
  courseTitle: string;
  activeLessonId: string;
  modules: ModuleInfo[];
  progressMap: Record<string, { status: string; watchTimeSeconds: number }>;
  progressPercentage: number;
}

export function CourseSidebar({
  courseSlug,
  courseTitle,
  activeLessonId,
  modules,
  progressMap,
  progressPercentage,
}: CourseSidebarProps) {
  return (
    <aside className="w-full lg:w-80 shrink-0 border-r border-border bg-card flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      {/* Course Header */}
      <div className="p-4 border-b border-border space-y-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Enrolled Courses
        </Link>
        <h2 className="font-bold text-sm sm:text-base text-foreground line-clamp-1">
          {courseTitle}
        </h2>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Course Progress</span>
            <span className="text-primary font-bold">{progressPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Curriculum Accordion */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {modules.map((module) => (
          <div key={module.id} className="space-y-1.5">
            <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 mr-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}

                      <span className="truncate">{lesson.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                      {lesson.contentType === "VIDEO" ? (
                        <Video className="h-3 w-3 text-primary" />
                      ) : lesson.contentType === "PDF" ? (
                        <FileText className="h-3 w-3 text-amber-500" />
                      ) : (
                        <AlignLeft className="h-3 w-3 text-sky-500" />
                      )}

                      {lesson.durationSec > 0 && (
                        <span>{Math.round(lesson.durationSec / 60)}m</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
