"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getStudentHomeworkDashboardListAction } from "@/server/actions/homework.actions";
import { StudentHomeworkDrawer } from "@/components/student/student-homework-drawer";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronRight,
  Send,
  FileText,
  ImageIcon,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export default function StudentHomeworkDashboardPage() {
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "SUBMITTED" | "REVIEWED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer Side Panel State
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadHomeworks = async () => {
    setLoading(true);
    try {
      const res = await getStudentHomeworkDashboardListAction();
      setHomeworkList(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load homework assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeworks();
  }, []);

  // Auto-open side panel if URL has ?hw=... or ?lessonId=...
  useEffect(() => {
    if (typeof window !== "undefined" && homeworkList.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const lessonParam = params.get("lessonId");
      const hwParam = params.get("hw") || params.get("homeworkId");

      if (lessonParam) {
        setSelectedLessonId(lessonParam);
        setIsDrawerOpen(true);
      } else if (hwParam) {
        const match = homeworkList.find((h) => h.homeworkId === hwParam);
        if (match) {
          setSelectedLessonId(match.lessonId);
          setIsDrawerOpen(true);
        }
      }
    }
  }, [homeworkList]);

  const handleOpenAssignment = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedLessonId(null);
  };

  const handleHomeworkSubmitted = () => {
    loadHomeworks();
  };

  const handleCopyLink = (hwId: string, title: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://superwarrior30.com";
    navigator.clipboard.writeText(`${origin}/homework/${hwId}`);
    toast.success(`📋 Shareable reminder link for "${title}" copied!`);
  };

  // Stat Counters
  const totalAssigned = homeworkList.length;
  const pendingSubmissionCount = homeworkList.filter(
    (h) => h.status === "NOT_STARTED" || h.status === "OVERDUE" || h.status === "RETURNED_FOR_RESUBMISSION"
  ).length;
  const underReviewCount = homeworkList.filter((h) => h.status === "SUBMITTED").length;
  const gradedCount = homeworkList.filter((h) => h.status === "REVIEWED").length;

  // Filtered List
  const filteredList = homeworkList.filter((hw) => {
    // Tab Filter
    if (filterTab === "PENDING") {
      if (hw.status !== "NOT_STARTED" && hw.status !== "OVERDUE" && hw.status !== "RETURNED_FOR_RESUBMISSION") {
        return false;
      }
    } else if (filterTab === "SUBMITTED") {
      if (hw.status !== "SUBMITTED") return false;
    } else if (filterTab === "REVIEWED") {
      if (hw.status !== "REVIEWED") return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        hw.title.toLowerCase().includes(q) ||
        hw.courseTitle.toLowerCase().includes(q) ||
        hw.moduleTitle.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-xs font-bold text-amber-400 mb-1.5">
            <Award className="h-3.5 w-3.5" />
            Practical Trade Analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            My Homework & Assignments
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Submit your chart analysis, trade setups, and written notes for personalized mentor review.
          </p>
        </div>

        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all self-start sm:self-auto shrink-0"
        >
          <BookOpen className="h-4 w-4 text-amber-400" />
          Go to Course Classroom
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-bold uppercase text-muted-foreground">Total Assigned</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{totalAssigned}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-400">To Submit / Revise</span>
            <RotateCcw className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">{pendingSubmissionCount}</p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-sky-400">Under Review</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-400">{underReviewCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-400">Graded & Reviewed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{gradedCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-card border border-border rounded-xl">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterTab === "ALL"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({homeworkList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterTab === "PENDING"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Action Required ({pendingSubmissionCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("SUBMITTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterTab === "SUBMITTED"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Under Review ({underReviewCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("REVIEWED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterTab === "REVIEWED"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Graded ({gradedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search homework or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3.5 py-1.5 text-xs focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Homework Cards List */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
          <p className="text-xs text-muted-foreground">Loading your homework assignments...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center space-y-2 rounded-2xl border border-border bg-card">
          <Award className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Homework Assignments Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filterTab !== "ALL"
              ? "No assignments matching this filter."
              : "Assignments assigned by your mentor in enrolled courses will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((hw) => {
            const isReviewed = hw.status === "REVIEWED";
            const isReturned = hw.status === "RETURNED_FOR_RESUBMISSION";
            const isSubmitted = hw.status === "SUBMITTED";
            const isOverdue = hw.isOverdue;

            return (
              <div
                key={hw.homeworkId}
                className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-amber-400/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Course & Status Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      {hw.courseTitle}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border shrink-0 ${
                        isReviewed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : isReturned
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : isSubmitted
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                          : isOverdue
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {isReviewed && <CheckCircle2 className="h-3 w-3" />}
                      {isReturned && <RotateCcw className="h-3 w-3" />}
                      {isSubmitted && <Clock className="h-3 w-3" />}
                      {hw.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Title & Module */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-foreground line-clamp-2">
                      {hw.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {hw.moduleTitle}
                    </p>
                  </div>

                  {/* Marks & Feedback snippet */}
                  {isReviewed && hw.marksObtained !== null ? (
                    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-muted-foreground">Score Awarded:</span>
                        <span className="font-black text-amber-400 text-sm">
                          {hw.marksObtained} / {hw.totalMarks} ({hw.percentage}%)
                        </span>
                      </div>
                      {hw.feedback && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                          &ldquo;{hw.feedback}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : isReturned ? (
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Revision Requested</span>
                      {hw.feedback && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {hw.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Max Score: <strong className="text-foreground">{hw.totalMarks} Marks</strong></span>
                      <span>
                        {hw.deadline
                          ? `Due: ${new Date(hw.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}`
                          : "No Deadline"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="pt-3 border-t border-border flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAssignment(hw.lessonId)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isReviewed
                      ? "View Graded Work"
                      : isSubmitted
                      ? "View Submission"
                      : isReturned
                      ? "Submit Revision"
                      : "Submit Homework"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(hw.homeworkId, hw.title)}
                    className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
                    title="Copy Shareable Homework Link"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>

                  <Link
                    href={`/learn/${hw.courseSlug}/${hw.lessonId}`}
                    className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Open in Classroom Player"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Sliding Side Panel */}
      <StudentHomeworkDrawer
        lessonId={selectedLessonId}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onSubmitted={handleHomeworkSubmitted}
      />
    </div>
  );
}
