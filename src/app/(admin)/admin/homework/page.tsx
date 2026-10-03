"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getAdminHomeworkSubmissionsAction,
  getAdminHomeworkSubmissionDetailAction,
  reviewHomeworkAction,
  returnHomeworkForResubmissionAction,
  getAdminHomeworkAssignmentsListAction,
} from "@/server/actions/homework.actions";
import {
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Eye,
  Paperclip,
  ExternalLink,
  Send,
  Loader2,
  X,
  AlertCircle,
  FileText,
  User,
  Sparkles,
  ImageIcon,
  Maximize2,
  ZoomIn,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Share2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminHomeworkPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "assignments">("submissions");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Review Drawer / Modal State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // High-Resolution Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [marksInput, setMarksInput] = useState<number | "">("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [isSaving, startTransition] = useTransition();

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await getAdminHomeworkSubmissionsAction({
        status: statusFilter,
      });
      setSubmissions(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await getAdminHomeworkAssignmentsListAction();
      setAssignments(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load assignments list");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
    loadAssignments();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "assignments" && assignments.length === 0) {
      loadAssignments();
    }
  }, [activeTab]);

  const handleOpenReview = async (id: string) => {
    setSelectedSubmissionId(id);
    setLoadingDetail(true);
    try {
      const detail = await getAdminHomeworkSubmissionDetailAction(id);
      setDetailData(detail);
      setMarksInput(detail.marksObtained !== null ? detail.marksObtained : "");
      setFeedbackInput(detail.feedback || "");
      setAdminNoteInput(detail.adminNote || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to load submission details");
      setSelectedSubmissionId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleQuickFeedbackChip = (chipText: string) => {
    setFeedbackInput((prev) => (prev ? `${prev}\n${chipText}` : chipText));
  };

  const handleSaveReview = () => {
    if (!selectedSubmissionId || !detailData) return;
    if (marksInput === "") {
      toast.error("Please enter marks obtained.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await reviewHomeworkAction(selectedSubmissionId, {
          marksObtained: Number(marksInput),
          feedback: feedbackInput,
          adminNote: adminNoteInput,
        });

        if (res.success) {
          toast.success("Homework reviewed and graded successfully!");
          setSelectedSubmissionId(null);
          await loadSubmissions();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to save review");
      }
    });
  };

  const handleReturnResubmission = () => {
    if (!selectedSubmissionId || !detailData) return;
    if (!feedbackInput.trim()) {
      toast.error("Please provide feedback/reason for resubmission.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await returnHomeworkForResubmissionAction(selectedSubmissionId, {
          feedback: feedbackInput,
          adminNote: adminNoteInput,
        });

        if (res.success) {
          toast.success("Homework returned to student for resubmission!");
          setSelectedSubmissionId(null);
          await loadSubmissions();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to return homework");
      }
    });
  };

  const handleCopyShareLink = (id: string, title?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://superwarrior30.com";
    const shareUrl = `${origin}/homework/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(
      title
        ? `📋 Link for "${title}" copied! Share it to remind students.`
        : "📋 Shareable homework reminder link copied to clipboard!"
    );
  };

  // Stat Counters
  const pendingCount = submissions.filter((s) => s.status === "SUBMITTED").length;
  const reviewedCount = submissions.filter((s) => s.status === "REVIEWED").length;
  const returnedCount = submissions.filter((s) => s.status === "RETURNED_FOR_RESUBMISSION").length;
  const lateCount = submissions.filter((s) => s.isLate).length;

  // Filtered Submissions List
  const filteredList = submissions.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentEmail.toLowerCase().includes(q) ||
      s.homeworkTitle.toLowerCase().includes(q) ||
      s.courseTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
              <Award className="h-3.5 w-3.5" />
              Mentorship Evaluation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Homework & Assignments Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review practical homework submissions, inspect student chart setups and screenshots, assign marks, and provide mentorship feedback.
          </p>
        </div>

        {/* Header Action Buttons & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (assignments.length === 1) {
                handleCopyShareLink(assignments[0].id, assignments[0].title);
              } else if (assignments.length > 1) {
                setShareModalOpen(true);
              } else {
                loadAssignments().then(() => {
                  toast.info("Opening shareable student links...");
                  setShareModalOpen(true);
                });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black px-3.5 py-2 text-xs font-black transition-all shadow-sm cursor-pointer"
            title="Copy shareable student reminder link"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Copy Student Link</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "submissions"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Submissions ({submissions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("assignments")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "assignments"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Course Assignments
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Pending Review
            </span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Reviewed & Graded
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{reviewedCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Returned For Revision
            </span>
            <RotateCcw className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{returnedCount}</p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              Late Submissions
            </span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{lateCount}</p>
        </div>
      </div>

      {activeTab === "submissions" ? (
        <>
          {/* Quick Reminder Banner */}
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Want to remind your batch of students to submit homework?
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Share the direct assignment link. Enrolled students can click and submit notes &amp; TradingView chart screenshots immediately.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (assignments.length === 1) {
                  handleCopyShareLink(assignments[0].id, assignments[0].title);
                } else {
                  setShareModalOpen(true);
                }
              }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-xs font-black transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Student Link
            </button>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student, email, course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3.5 py-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Pending Review</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RETURNED_FOR_RESUBMISSION">Returned</option>
              </select>
            </div>
          </div>

          {/* Submissions Table with Screenshots Preview */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                <p className="text-xs text-muted-foreground">Loading submissions...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Award className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No homework submissions found</p>
                <p className="text-xs text-muted-foreground">Submissions from enrolled students will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Course / Homework</th>
                      <th className="px-5 py-3.5">Screenshots & Notes</th>
                      <th className="px-5 py-3.5">Attempt</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Score / Marks</th>
                      <th className="px-5 py-3.5">Submitted At</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredList.map((sub) => {
                      const isPending = sub.status === "SUBMITTED";
                      const isReviewed = sub.status === "REVIEWED";
                      const isReturned = sub.status === "RETURNED_FOR_RESUBMISSION";

                      // Check for screenshot image files
                      const imageFiles = (sub.files || []).filter(
                        (f: any) =>
                          f.mimeType?.startsWith("image/") ||
                          f.fileUrl?.match(/\.(png|jpg|jpeg|webp|gif)/i)
                      );
                      const otherFilesCount = (sub.files || []).length - imageFiles.length;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground">{sub.studentName}</p>
                              <p className="text-[11px] text-muted-foreground">{sub.studentEmail}</p>
                            </div>
                          </td>

                          <td className="px-5 py-4 max-w-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground truncate">{sub.homeworkTitle}</p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyShareLink(sub.homeworkId, sub.homeworkTitle)}
                                  className="text-muted-foreground hover:text-amber-400 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                                  title="Copy student shareable reminder link for this homework"
                                >
                                  <Share2 className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {sub.courseTitle} • {sub.moduleTitle}
                              </p>
                            </div>
                          </td>

                          {/* Screenshots & Notes Column */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              {imageFiles.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  {imageFiles.slice(0, 3).map((img: any, i: number) => (
                                    <button
                                      key={img.id || i}
                                      type="button"
                                      onClick={() =>
                                        setLightboxImage({
                                          url: img.fileUrl,
                                          title: `${sub.studentName} — ${img.originalFilename}`,
                                        })
                                      }
                                      className="relative group h-9 w-12 rounded-lg overflow-hidden border border-border bg-black/60 shrink-0 cursor-zoom-in hover:border-amber-400 transition-all shadow"
                                      title="Click to zoom screenshot"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={img.fileUrl}
                                        alt={img.originalFilename}
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-200"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ZoomIn className="h-3 w-3 text-white" />
                                      </div>
                                    </button>
                                  ))}
                                  {imageFiles.length > 3 && (
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      +{imageFiles.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground italic">
                                  No screenshots
                                </span>
                              )}

                              {sub.textAnswer && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]" title={sub.textAnswer}>
                                  📝 {sub.textAnswer}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-mono font-bold text-foreground">
                              #{sub.attemptNumber}
                            </span>
                            {sub.filesCount > 0 && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                <Paperclip className="h-2.5 w-2.5" />
                                {sub.filesCount}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isReviewed
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : isReturned
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                              }`}
                            >
                              {sub.status.replace(/_/g, " ")}
                            </span>
                            {sub.isLate && (
                              <span className="ml-1 text-[9px] font-extrabold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                LATE
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {sub.marksObtained !== null ? (
                              <span className="font-extrabold text-amber-400">
                                {sub.marksObtained} / {sub.totalMarks} ({sub.percentage}%)
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Not graded</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-muted-foreground text-[11px]">
                            {new Date(sub.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(sub.homeworkId, sub.homeworkTitle)}
                                className="p-1.5 rounded-xl border border-border bg-background text-muted-foreground hover:text-amber-400 hover:bg-muted transition cursor-pointer"
                                title="Copy shareable link to remind student"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(sub.id)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                  isPending
                                    ? "bg-primary text-primary-foreground shadow hover:bg-primary/90"
                                    : "bg-background border border-border text-foreground hover:bg-muted"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {isPending ? "Grade & Review" : "View Details"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Assignments Catalog Tab */
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-foreground">Share Direct Homework Links With Enrolled Students</h4>
                <p className="text-xs text-muted-foreground">
                  Each homework card below has its dedicated shareable student URL. Click &quot;Copy Link&quot; to send it via WhatsApp, Telegram, or Email. Only students who have purchased or been assigned the course can open and submit.
                </p>
              </div>
            </div>
            {assignments.length > 0 && (
              <button
                type="button"
                onClick={() => handleCopyShareLink(assignments[0].id, assignments[0].title)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Copy className="h-4 w-4" />
                Copy Main Link
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              All homework assignments configured inside course lessons.
            </p>
            <button
              type="button"
              onClick={loadAssignments}
              disabled={loadingAssignments}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {loadingAssignments && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Refresh List
            </button>
          </div>

          {loadingAssignments ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <p className="text-xs text-muted-foreground">Loading assignments catalog...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-16 text-center space-y-2 rounded-2xl border border-border bg-card">
              <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No homework assignments found</p>
              <p className="text-xs text-muted-foreground">
                Create assignments inside Course Lessons in Admin → Courses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((hw) => (
                <div
                  key={hw.id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold uppercase text-amber-400">
                        {hw.courseTitle}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-bold text-foreground">
                        Max: {hw.totalMarks} Marks
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-foreground line-clamp-2">
                      {hw.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {hw.instructions || hw.description || "No instructions provided."}
                    </p>

                    {/* Attached reference charts */}
                    {hw.attachedMedia && hw.attachedMedia.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Paperclip className="h-3 w-3 text-sky-400" />
                        <span>{hw.attachedMedia.length} Reference Material(s) Attached</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">
                        Total Submissions: <strong className="text-foreground">{hw.totalSubmissions}</strong>
                      </div>
                      {hw.pendingReviews > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                          {hw.pendingReviews} Pending
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">All Graded</span>
                      )}
                    </div>

                    {/* Dedicated Shareable Student Link Box */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold uppercase text-amber-400 flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          Student Shareable Link
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Enrolled Only
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== "undefined" ? `${window.location.origin}/homework/${hw.id}` : `https://superwarrior30.com/homework/${hw.id}`}
                          className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-mono text-muted-foreground select-all focus:outline-none"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(hw.id, hw.title)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 text-xs font-black transition-all shadow-sm cursor-pointer active:scale-95"
                          title="Copy student link to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/homework/${hw.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-bold text-foreground hover:bg-muted transition-all"
                        title="Open student homework portal in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                        Student View
                      </Link>
                      <Link
                        href={`/admin/courses/${hw.courseId}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                        Course Builder
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review & Grading Drawer / Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl my-8 p-5 sm:p-7 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 mb-1">
                  <Award className="h-3.5 w-3.5" />
                  Practical Homework Review
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground">
                  Grade & Review Homework Submission
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Student: <strong className="text-foreground">{detailData?.student?.name || detailData?.student?.email}</strong> • Attempt #{detailData?.attemptNumber}
                  {detailData?.isLate && (
                    <span className="ml-2 font-extrabold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">
                      LATE SUBMISSION
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {detailData?.homeworkId && (
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(detailData.homeworkId, detailData.homeworkTitle)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                    title="Copy shareable reminder link to send to student"
                  >
                    <Share2 className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionId(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : detailData ? (
              <div className="space-y-6">
                {/* Assignment Info Header */}
                <div className="rounded-xl border border-border bg-background/80 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-400">
                      Assignment: {detailData.homeworkTitle}
                    </span>
                    <span className="text-muted-foreground font-semibold">
                      Max Score: <strong className="text-foreground">{detailData.totalMarks}</strong>
                    </span>
                  </div>
                  {detailData.homeworkInstructions && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <strong className="text-foreground">Task: </strong>
                      {detailData.homeworkInstructions}
                    </p>
                  )}
                </div>

                {/* Student Written Trading Notes */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    Student Notes & Trading Explanation:
                  </label>
                  <div className="rounded-lg bg-background border border-border p-3.5 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {detailData.textAnswer || "No text notes provided by student."}
                  </div>
                </div>

                {/* Submitted Screenshots & Files Inspection (WITH HIGH-RES LIGHTBOX) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4" />
                      Submitted Screenshots & Charts ({detailData.files?.length || 0})
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Click any screenshot to zoom & inspect chart markings
                    </span>
                  </div>

                  {detailData.files && detailData.files.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {detailData.files.map((file: any) => {
                        const isImg =
                          file.mimeType?.startsWith("image/") ||
                          file.fileUrl?.match(/\.(png|jpg|jpeg|webp|gif)/i);

                        return isImg ? (
                          <div
                            key={file.id}
                            className="group rounded-2xl border border-border bg-background overflow-hidden hover:border-amber-400/60 transition-all shadow-md flex flex-col"
                          >
                            {/* Chart Thumbnail */}
                            <div
                              onClick={() =>
                                setLightboxImage({
                                  url: file.fileUrl,
                                  title: `${detailData.student?.name || "Student"} — ${file.originalFilename}`,
                                })
                              }
                              className="relative aspect-video w-full bg-black/70 overflow-hidden cursor-zoom-in flex items-center justify-center"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={file.fileUrl}
                                alt={file.originalFilename}
                                className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/80 border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md">
                                  <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
                                  Click to Inspect Full Chart
                                </span>
                              </div>
                              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-black/75 border border-white/15 px-2 py-0.5 text-[9px] font-bold text-sky-400 backdrop-blur-md">
                                <ImageIcon className="h-3 w-3" />
                                Bunny CDN
                              </span>
                            </div>

                            {/* Card Footer */}
                            <div className="p-3 flex items-center justify-between gap-2 border-t border-border bg-card/60">
                              <span className="truncate text-xs font-bold text-foreground">
                                {file.originalFilename}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: file.fileUrl,
                                      title: `${detailData.student?.name || "Student"} — ${file.originalFilename}`,
                                    })
                                  }
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Expand in Lightbox"
                                >
                                  <Maximize2 className="h-3.5 w-3.5" />
                                </button>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Open Full Size on CDN"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Document or Other File Card */
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-border bg-background p-4 text-xs hover:border-primary/50 transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 mr-2">
                              <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="truncate font-semibold text-foreground group-hover:text-amber-300">
                                {file.originalFilename}
                              </span>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl border border-dashed border-border bg-background text-xs text-muted-foreground">
                      No files or screenshots attached to this submission.
                    </div>
                  )}
                </div>

                {/* Grading & Feedback Evaluation Box */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Grading & Mentorship Feedback
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-foreground">
                        Marks Awarded (Max: {detailData.totalMarks}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={detailData.totalMarks}
                        value={marksInput}
                        onChange={(e) =>
                          setMarksInput(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder={`0 to ${detailData.totalMarks}`}
                        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-bold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground">Calculated Percentage</label>
                      <div className="mt-1.5 flex h-10 items-center rounded-xl border border-border bg-background px-3.5 text-sm font-black text-amber-400">
                        {marksInput !== "" && detailData.totalMarks > 0
                          ? `${Math.round((Number(marksInput) / detailData.totalMarks) * 100)}%`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Preset Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Quick Feedback Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Excellent Liquidity Sweep setup! 🎯",
                        "Fair Value Gap (FVG) identified accurately. 📊",
                        "Stop loss is placed too tight — watch out for wicks. ⚠️",
                        "Good Risk to Reward Ratio (1:3+). Valid trade.",
                        "Re-check Higher Timeframe Trend before taking entry.",
                        "Please mark support/resistance levels and resubmit.",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleQuickFeedbackChip(chip)}
                          className="rounded-lg bg-muted/60 border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted hover:border-primary/40 transition-colors cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Feedback Textarea */}
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Student Feedback / Mentorship Comments
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Write constructive mentorship feedback, praise good chart analysis, or point out areas for improvement..."
                      className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Private Admin Note */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      Private Admin / Mentor Note (Never visible to student)
                    </label>
                    <input
                      type="text"
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="e.g. Strong candidate for Live Trading room access."
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleReturnResubmission}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Return for Resubmission
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionId(null)}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveReview}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save & Mark as Reviewed
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* High-Resolution Screenshot / Chart Inspection Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] sm:max-w-6xl w-full flex flex-col items-center justify-center animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white px-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  <ImageIcon className="h-3 w-3" />
                  Chart Inspection
                </span>
                <span className="truncate text-xs sm:text-sm font-bold">{lightboxImage.title}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                  title="Open Full Resolution in New Tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open Full Size</span>
                </a>

                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* High-Res Chart Image Container */}
            <div className="relative max-h-[82vh] w-full flex items-center justify-center overflow-auto rounded-2xl border border-white/15 bg-black/80 shadow-2xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Share Modal */}
      {shareModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShareModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Share Homework Link With Students</h3>
                  <p className="text-xs text-muted-foreground">Only students enrolled in the course can access the workspace.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No assignments found.
                </div>
              ) : (
                assignments.map((hw) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "https://superwarrior30.com";
                  const shareUrl = `${origin}/homework/${hw.id}`;
                  return (
                    <div key={hw.id} className="rounded-xl border border-border bg-background p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                            {hw.courseTitle}
                          </span>
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {hw.title}
                          </h4>
                        </div>
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground shrink-0">
                          Max {hw.totalMarks} Marks
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-mono text-muted-foreground select-all focus:outline-none"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(hw.id, hw.title)}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 text-xs font-black transition-all shadow cursor-pointer active:scale-95"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <span>{hw.totalSubmissions} submissions received</span>
                        <Link
                          href={`/homework/${hw.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-semibold"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Test Student Link
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
