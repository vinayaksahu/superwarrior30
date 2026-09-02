import { redirect } from "next/navigation";
import Link from "next/link";
import { getEnrolledCourseContentAction } from "@/server/actions/enrollment.actions";
import { resolvePublicHomepageEnvironment, withEnvironmentContext } from "@/lib/env-context";
import {
  GraduationCap,
  Clock,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface CourseLearnIndexProps {
  params: Promise<{ courseSlug: string }>;
}

export default async function CourseLearnIndexPage({
  params,
}: CourseLearnIndexProps) {
  const { courseSlug } = await params;
  const pageEnv = await resolvePublicHomepageEnvironment();

  let contentData;
  try {
    contentData = await withEnvironmentContext(pageEnv, async () => {
      return await getEnrolledCourseContentAction(courseSlug);
    });
  } catch (error) {
    console.error("Enrollment check error:", error);
    // If not enrolled or error, redirect to public course page
    redirect(`/courses/${courseSlug}`);
  }

  const { course, progressMap } = contentData;

  // Find all published lessons in order
  const allLessons: { id: string }[] = [];
  for (const mod of course.modules || []) {
    for (const lesson of mod.lessons || []) {
      allLessons.push({ id: lesson.id });
    }
  }

  // If course has lessons, redirect to first incomplete lesson
  if (allLessons.length > 0) {
    const firstIncompleteLesson = allLessons.find(
      (l) => progressMap[l.id]?.status !== "COMPLETED"
    );

    const targetLessonId = firstIncompleteLesson
      ? firstIncompleteLesson.id
      : allLessons[0].id;

    redirect(`/learn/${courseSlug}/${targetLessonId}`);
  }

  // If course has 0 lessons created yet, render student classroom hub
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Courses
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 shadow-inner border border-amber-500/20">
            <GraduationCap className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              LIFETIME ENROLLMENT ACTIVE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {course.shortDescription ||
                "Welcome to the mentorship program! You have full lifetime access to this course."}
            </p>
          </div>

          <div className="rounded-2xl bg-background/80 border border-border/60 p-5 text-left space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Curriculum Video Modules Being Uploaded
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are officially enrolled in this course. The mentor is currently preparing and uploading the video modules and study resources. You will have instant access as soon as the lessons are published!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/courses"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              View Enrolled Courses
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto rounded-xl border border-input px-6 py-3 text-xs font-semibold text-foreground hover:bg-accent transition-all"
            >
              Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
