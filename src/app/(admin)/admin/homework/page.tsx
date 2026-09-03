"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getAdminHomeworkSubmissionsAction,
  getAdminHomeworkSubmissionDetailAction,
  reviewHomeworkAction,
  returnHomeworkForResubmissionAction,
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
} from "lucide-react";
import { toast } from "sonner";

export default function AdminHomeworkPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Drawer / Modal State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

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

  // Stat Counters
  const pendingCount = submissions.filter((s) => s.status === "SUBMITTED").length;
  const reviewedCount = submissions.filter((s) => s.status === "REVIEWED").length;
  const returnedCount = submissions.filter((s) => s.status === "RETURNED_FOR_RESUBMISSION").length;
  const lateCount = submissions.filter((s) => s.isLate).length;

  // Filtered List
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Homework & Assignments Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review practical homework submissions, evaluate chart setups, assign marks, and provide mentorship feedback.
          </p>
        </div>
      </div>

      {/* Stat Metric Cards */}
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

      {/* Submissions Table */}
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

                  return (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">{sub.studentName}</p>
                          <p className="text-[11px] text-muted-foreground">{sub.studentEmail}</p>
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-xs truncate">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground truncate">{sub.homeworkTitle}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {sub.courseTitle} • {sub.moduleTitle}
                          </p>
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
                          {isPending ? "Grade Work" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Grading Drawer / Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl my-8 p-6 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  Grade & Review Homework Submission
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Student: <strong className="text-foreground">{detailData?.student?.name || detailData?.student?.email}</strong> • Attempt #{detailData?.attemptNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmissionId(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : detailData ? (
              <div className="space-y-6">
                {/* Assignment & Student Submission Box */}
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-400">
                      Assignment: {detailData.homeworkTitle}
                    </span>
                    <span className="text-muted-foreground">
                      Total Marks: {detailData.totalMarks}
                    </span>
                  </div>

                  {/* Student Text Answer */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Student Text Answer:</label>
                    <div className="rounded-lg bg-card border border-border p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {detailData.textAnswer || "No text answer provided."}
                    </div>
                  </div>

                  {/* Student Submitted Files */}
                  {detailData.files && detailData.files.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-foreground">
                        Submitted Files ({detailData.files.length}):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detailData.files.map((file: any) => (
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs hover:border-primary/50 transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0 mr-2">
                              <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="truncate font-semibold text-foreground group-hover:text-amber-300">
                                {file.originalFilename}
                              </span>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading Area */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Grading & Evaluation
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-foreground">
                        Marks Obtained (Max: {detailData.totalMarks}) <span className="text-red-400">*</span>
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

                  {/* Student Feedback */}
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Student Feedback / Mentorship Comments
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Write constructive mentorship feedback, praise good analysis, or point out areas for improvement..."
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
                      placeholder="e.g. Strong potential candidate for VIP mentorship."
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
                      className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
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
    </div>
  );
}
