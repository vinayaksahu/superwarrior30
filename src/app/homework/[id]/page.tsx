import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getHomeworkShareableDataAction } from "@/server/actions/homework.actions";
import { StudentHomeworkWorkspace } from "./homework-workspace";
import { Lock, BookOpen, AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";

interface ShareableHomeworkPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShareableHomeworkPage({ params }: ShareableHomeworkPageProps) {
  const { id } = await params;
  const result = await getHomeworkShareableDataAction(id);

  // 1. Not Found
  if (result.access === "NOT_FOUND") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-xl">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <h1 className="text-xl font-black text-foreground">Homework Not Found</h1>
          <p className="text-xs text-muted-foreground">
            This homework link does not exist or may have been unassigned.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to Login with callbackUrl
  if (result.access === "UNAUTHENTICATED") {
    redirect(`/login?callbackUrl=/homework/${encodeURIComponent(id)}`);
  }

  // 3. User is logged in BUT NOT ENROLLED in the course
  if (result.access === "FORBIDDEN") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-card p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Exclusive Mentorship Assignment
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Course Enrollment Required
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
              This practical homework assignment is strictly reserved for enrolled students of{" "}
              <strong className="text-foreground">{result.courseTitle}</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{result.courseTitle}</p>
                <p className="text-[11px] text-muted-foreground">Unlock institutional mentorship, chart practice labs, and mentor grading.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <Link
                href={`/courses/${result.courseSlug}`}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-center"
              >
                Enroll in Course
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                My Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>Already purchased? Ensure you are logged into your enrolled account.</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Access Granted -> Render Interactive Student Homework Workspace
  return (
    <StudentHomeworkWorkspace
      homework={result.homework}
      submissions={result.submissions}
      latestSubmission={result.latestSubmission}
      isPastDeadline={result.isPastDeadline}
      isSubmissionAllowed={result.isSubmissionAllowed}
      attemptsUsed={result.attemptsUsed}
      maxAttempts={result.maxAttempts}
    />
  );
}
