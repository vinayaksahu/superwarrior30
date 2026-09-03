"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getLessonHomeworkAction,
  submitHomeworkAction,
  type SubmittedFileInput,
} from "@/server/actions/homework.actions";
import { MarkdownContent } from "@/components/shared/markdown-content";
import {
  Award,
  Calendar,
  Clock,
  FileText,
  ImageIcon,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  Send,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Maximize2,
  ZoomIn,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface StudentHomeworkViewProps {
  lessonId: string;
  courseSlug: string;
  onLessonCompleted?: () => void;
}

export function StudentHomeworkView({
  lessonId,
  courseSlug,
  onLessonCompleted,
}: StudentHomeworkViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Submission Form State
  const [textAnswer, setTextAnswer] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<SubmittedFileInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<{ url: string; title: string } | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  const loadHomework = async () => {
    setLoading(true);
    try {
      const res = await getLessonHomeworkAction(lessonId);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load homework details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [lessonId]);

  // Handle local file upload via API endpoint /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const uploadedList: SubmittedFileInput[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "homework");

        setUploadProgress(40 + Math.round(((i + 1) / files.length) * 50));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.url) {
          throw new Error(result.error || `Failed to upload ${file.name}`);
        }

        uploadedList.push({
          fileUrl: result.url,
          storageKey: result.key || null,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
      }

      setUploadedFiles((prev) => [...prev, ...uploadedList]);
      toast.success(`${uploadedList.length} file(s) uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx));
  };

  const handleFinalSubmit = () => {
    if (!data?.homework?.id) return;
    if (!textAnswer.trim() && uploadedFiles.length === 0) {
      toast.error("Please provide a written answer or upload at least one file.");
      return;
    }

    startSubmitTransition(async () => {
      try {
        const res = await submitHomeworkAction(data.homework.id, {
          textAnswer,
          files: uploadedFiles,
        });

        if (res.success) {
          toast.success(`🎉 Homework Attempt ${res.attemptNumber} Submitted Successfully!`);
          setShowConfirmModal(false);
          setTextAnswer("");
          setUploadedFiles([]);
          await loadHomework();
          if (onLessonCompleted) onLessonCompleted();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit homework");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="text-xs text-muted-foreground">Loading Homework Assignment...</p>
      </div>
    );
  }

  if (!data?.homework) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <Award className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <h3 className="text-base font-bold text-foreground">No Homework Assignment Found</h3>
        <p className="text-xs text-muted-foreground mt-1">This homework is not yet configured.</p>
      </div>
    );
  }

  const { homework, submissions, latestSubmission, isPastDeadline, isSubmissionAllowed, attemptsUsed, maxAttempts } = data;

  const isReviewed = latestSubmission?.status === "REVIEWED";
  const isReturned = latestSubmission?.status === "RETURNED_FOR_RESUBMISSION";
  const isSubmitted = latestSubmission?.status === "SUBMITTED";

  return (
    <div className="space-y-6">
      {/* 1. Header & Assignment Overview */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-0.5 text-xs font-bold text-amber-400">
              <Award className="h-3.5 w-3.5" />
              Practical Homework Assignment
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {homework.title}
            </h2>
            {homework.description && (
              <p className="text-sm text-muted-foreground">{homework.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {latestSubmission && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold border ${
                  isReviewed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : isReturned
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                }`}
              >
                {isReviewed && <CheckCircle2 className="h-3.5 w-3.5" />}
                {isReturned && <RotateCcw className="h-3.5 w-3.5" />}
                {isSubmitted && <Clock className="h-3.5 w-3.5" />}
                {latestSubmission.status.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Marks
            </span>
            <p className="text-lg font-black text-amber-400">{homework.totalMarks}</p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Passing Marks
            </span>
            <p className="text-lg font-black text-emerald-400">
              {homework.passingMarks ? homework.passingMarks : "N/A"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Due Date
            </span>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate mt-1">
              {homework.deadline
                ? new Date(homework.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No Deadline"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Attempts
            </span>
            <p className="text-lg font-black text-sky-400">
              {attemptsUsed} / {maxAttempts}
            </p>
          </div>
        </div>

        {/* Task Instructions */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            Task Instructions & Deliverables
          </h3>
          <div className="rounded-xl border border-border/80 bg-background/60 p-5 sm:p-6 text-foreground leading-relaxed">
            <MarkdownContent content={homework.instructions} />
          </div>
        </div>

        {/* Attached Study Materials & Reference Charts */}
        {homework.attachedMedia && homework.attachedMedia.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-amber-400" />
              Reference Materials, Charts & Templates
            </h3>

            {/* Reference Images / Charts (Visual Display) */}
            {(() => {
              const imageAttachments = homework.attachedMedia.filter(
                (att: any) =>
                  att.type === "IMAGE" ||
                  att.url?.match(/\.(png|jpg|jpeg|webp|gif|svg)/i) ||
                  att.mimeType?.startsWith("image/")
              );
              const docAttachments = homework.attachedMedia.filter(
                (att: any) => !imageAttachments.includes(att)
              );

              return (
                <div className="space-y-3">
                  {/* Image/Chart Cards */}
                  {imageAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {imageAttachments.map((att: any, idx: number) => (
                        <div
                          key={`img-${idx}`}
                          className="group rounded-2xl border border-border bg-background overflow-hidden hover:border-primary/50 transition-all shadow-md flex flex-col"
                        >
                          {/* Image Thumbnail Container */}
                          <div
                            onClick={() =>
                              setActiveLightboxImg({
                                url: att.url,
                                title: att.title || "Reference Chart Analysis",
                              })
                            }
                            className="relative aspect-video w-full bg-black/60 overflow-hidden cursor-zoom-in flex items-center justify-center group-hover:opacity-95 transition-opacity"
                          >
                            <img
                              src={att.url}
                              alt={att.title || "Reference Chart"}
                              className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-xl bg-black/75 border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md">
                                <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
                                Click to Zoom & Inspect Chart
                              </span>
                            </div>
                            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/75 border border-white/15 px-2 py-0.5 text-[10px] font-bold text-sky-400 backdrop-blur-md">
                              <ImageIcon className="h-3 w-3" />
                              Reference Chart
                            </span>
                          </div>

                          {/* Footer Info */}
                          <div className="p-3 flex items-center justify-between gap-2 border-t border-border bg-card/50">
                            <span className="truncate text-xs font-bold text-foreground">
                              {att.title || "Reference Chart"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveLightboxImg({
                                    url: att.url,
                                    title: att.title || "Reference Chart Analysis",
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Expand Image"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Open in New Tab"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document / PDF Cards */}
                  {docAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {docAttachments.map((att: any, idx: number) => (
                        <a
                          key={`doc-${idx}`}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-xs hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 mr-2">
                            <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="truncate font-semibold text-foreground group-hover:text-amber-300 block">
                                {att.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                PDF Document
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 2. Review Status Card (When Reviewed or Returned) */}
      {latestSubmission && (isReviewed || isReturned) && (
        <div
          className={`rounded-2xl border p-6 sm:p-8 space-y-4 shadow-lg ${
            isReviewed
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h3 className="font-extrabold text-base text-foreground">
                Teacher Review & Evaluation
              </h3>
            </div>
            {latestSubmission.isLate && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                Submitted Late
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-background border border-border p-4 text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                Marks Awarded
              </span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {latestSubmission.marksObtained !== null ? latestSubmission.marksObtained : "—"} /{" "}
                {homework.totalMarks}
              </p>
            </div>

            <div className="rounded-xl bg-background border border-border p-4 text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                Percentage
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {latestSubmission.percentage !== null ? `${latestSubmission.percentage}%` : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-background border border-border p-4 text-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                Result Status
              </span>
              <p
                className={`text-base font-extrabold mt-2 ${
                  isReviewed ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {latestSubmission.status.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {latestSubmission.feedback && (
            <div className="rounded-xl bg-background border border-border p-4 space-y-1.5">
              <strong className="text-xs font-bold text-foreground">Teacher Feedback:</strong>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {latestSubmission.feedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Student Submission Area (If Submission is Allowed) */}
      {isSubmissionAllowed ? (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-base text-foreground">
              {latestSubmission ? "Submit Revision / Resubmission" : "Submit Your Homework"}
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">
              Attempt {attemptsUsed + 1} of {maxAttempts}
            </span>
          </div>

          {/* Text Answer */}
          <div>
            <label className="text-xs font-bold text-foreground">
              Written Explanation / Trading Notes / Trade Setup Details
            </label>
            <textarea
              rows={5}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Provide your trade setup rationale, market context, entry/stoploss calculation, and explanations..."
              className="mt-1.5 w-full rounded-xl border border-input bg-background p-3.5 text-xs leading-relaxed focus:border-primary focus:outline-none"
            />
          </div>

          {/* File Upload Zone */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground">
              Upload Chart Screenshots, PDFs, or Worksheets
            </label>

            <div className="relative rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors bg-background/50">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                    <p className="text-xs font-bold text-foreground">Uploading files ({uploadProgress}%)...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-amber-400" />
                    <p className="text-xs font-bold text-foreground">
                      Click or drag files here to upload
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Supports PNG, JPG, PDF, DOCX, Excel spreadsheets up to 25MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Uploaded Files Chips */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Ready to Submit ({uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {uploadedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 mr-2">
                        <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="truncate font-semibold text-foreground">
                          {f.originalFilename}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 text-muted-foreground hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg hover:bg-primary/90 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Homework for Review
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
          <Clock className="h-6 w-6 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-bold text-foreground">
            {isSubmitted
              ? "Submission Under Teacher Review"
              : "Submissions Closed"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {isSubmitted
              ? "Your homework has been submitted and is waiting for teacher grading."
              : isPastDeadline
              ? "The deadline for this homework has passed and late submissions are closed."
              : "You have reached the maximum allowed attempts for this homework."}
          </p>
        </div>
      )}

      {/* 4. Submission History Accordion */}
      {submissions && submissions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span>Submission History ({submissions.length} attempt{submissions.length > 1 ? "s" : ""})</span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showHistory && (
            <div className="space-y-3 pt-2">
              {submissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-400">
                      Attempt {sub.attemptNumber}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  {sub.textAnswer && (
                    <p className="text-muted-foreground line-clamp-3 bg-muted/20 p-2.5 rounded-lg">
                      {sub.textAnswer}
                    </p>
                  )}

                  {sub.files && sub.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {sub.files.map((f: any) => (
                        <a
                          key={f.id}
                          href={f.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <Paperclip className="h-3 w-3 text-amber-400" />
                          {f.originalFilename}
                        </a>
                      ))}
                    </div>
                  )}

                  {sub.feedback && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-300">
                      <strong>Teacher Feedback:</strong> {sub.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Submit Your Homework?</h3>
                <p className="text-xs text-muted-foreground">
                  Attached {uploadedFiles.length} file(s) for review.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to submit this homework? Once submitted, it will be locked and forwarded to the mentor for grading and feedback.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Reference Chart / Image Lightbox */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] sm:max-w-5xl w-full flex flex-col items-center justify-center animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title and Actions */}
            <div className="w-full flex items-center justify-between pb-3 text-white px-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 rounded bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                  <ImageIcon className="h-3 w-3" />
                  Reference Chart
                </span>
                <span className="truncate text-xs sm:text-sm font-bold">{activeLightboxImg.title}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeLightboxImg.url}
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
                  onClick={() => setActiveLightboxImg(null)}
                  className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main High-Res Image Container */}
            <div className="relative max-h-[82vh] w-full flex items-center justify-center overflow-auto rounded-2xl border border-white/15 bg-black/70 shadow-2xl p-2">
              <img
                src={activeLightboxImg.url}
                alt={activeLightboxImg.title}
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
