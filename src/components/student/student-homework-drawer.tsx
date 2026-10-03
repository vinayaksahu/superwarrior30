"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  getLessonHomeworkAction,
  submitHomeworkAction,
  type SubmittedFileInput,
} from "@/server/actions/homework.actions";
import { MarkdownContent } from "@/components/shared/markdown-content";
import {
  X,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Loader2,
  Send,
  FileText,
  ImageIcon,
  ZoomIn,
  Maximize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Trash2,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";

interface StudentHomeworkDrawerProps {
  lessonId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function StudentHomeworkDrawer({
  lessonId,
  isOpen,
  onClose,
  onSubmitted,
}: StudentHomeworkDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [notes, setNotes] = useState("");
  const [uploadedScreenshots, setUploadedScreenshots] = useState<SubmittedFileInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<{ url: string; title: string } | null>(null);

  const [isSubmitting, startSubmitTransition] = useTransition();
  const drawerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const res = await getLessonHomeworkAction(lessonId);
      setData(res);
      // Pre-fill notes if latest submission was returned for resubmission
      if (res?.latestSubmission?.status === "RETURNED_FOR_RESUBMISSION" && res?.latestSubmission?.textAnswer) {
        setNotes(res.latestSubmission.textAnswer);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load homework details");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (isOpen && lessonId) {
      loadData();
      setUploadedScreenshots([]);
      setNotes("");
    }
  }, [isOpen, lessonId, loadData]);

  // Upload file to Bunny CDN via /api/upload
  const uploadSingleFile = async (file: File): Promise<SubmittedFileInput> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "homework");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.url) {
      throw new Error(result.error || `Failed to upload ${file.name}`);
    }

    return {
      fileUrl: result.url,
      storageKey: result.key || null,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type || "image/png",
    };
  };

  // Handle Input File Upload
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const results: SubmittedFileInput[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = await uploadSingleFile(files[i]);
        results.push(item);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setUploadedScreenshots((prev) => [...prev, ...results]);
      toast.success(`${results.length} screenshot(s) uploaded to Bunny CDN!`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  // Handle Clipboard Paste (Ctrl+V) for Instant Screenshot Upload
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            // Rename pasted image with timestamp
            const ext = file.type.split("/")[1] || "png";
            const renamedFile = new File(
              [file],
              `chart-screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
              { type: file.type }
            );
            imageFiles.push(renamedFile);
          }
        }
      }

      if (imageFiles.length === 0) return;

      e.preventDefault();
      setIsUploading(true);
      toast.info("Uploading pasted screenshot to Bunny CDN...");

      try {
        const results: SubmittedFileInput[] = [];
        for (const file of imageFiles) {
          const item = await uploadSingleFile(file);
          results.push(item);
        }
        setUploadedScreenshots((prev) => [...prev, ...results]);
        toast.success("🎯 Chart screenshot pasted and uploaded to Bunny CDN!");
      } catch (err: any) {
        toast.error(err.message || "Failed to upload pasted screenshot");
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  const handleRemoveScreenshot = (idx: number) => {
    setUploadedScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!data?.homework?.id) return;
    if (!notes.trim() && uploadedScreenshots.length === 0) {
      toast.error("Please write your notes or upload at least one chart screenshot.");
      return;
    }

    startSubmitTransition(async () => {
      try {
        const res = await submitHomeworkAction(data.homework.id, {
          textAnswer: notes,
          files: uploadedScreenshots,
        });

        if (res.success) {
          toast.success(`🎉 Homework Attempt #${res.attemptNumber} Submitted Successfully!`);
          setNotes("");
          setUploadedScreenshots([]);
          await loadData();
          onSubmitted?.();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit homework");
      }
    });
  };

  if (!isOpen) return null;

  const {
    homework,
    submissions = [],
    latestSubmission,
    isPastDeadline,
    isSubmissionAllowed,
    attemptsUsed = 0,
    maxAttempts = 3,
  } = data || {};

  const isReviewed = latestSubmission?.status === "REVIEWED";
  const isReturned = latestSubmission?.status === "RETURNED_FOR_RESUBMISSION";
  const isPendingReview = latestSubmission?.status === "SUBMITTED";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Sliding Side Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300 overflow-hidden"
      >
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="space-y-0.5 min-w-0 pr-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              <Award className="h-3 w-3" />
              Homework & Assignment Side Panel
            </div>
            <h2 className="text-base sm:text-lg font-black text-foreground truncate">
              {homework?.title || "Homework Assignment"}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {homework?.courseTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
              <p className="text-xs text-muted-foreground">Loading assignment details...</p>
            </div>
          ) : !homework ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-bold text-foreground">Homework Details Not Found</p>
              <p className="text-xs text-muted-foreground">This assignment might not be published yet.</p>
            </div>
          ) : (
            <>
              {/* Meta Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Marks</span>
                  <p className="text-base font-black text-amber-400 mt-0.5">{homework.totalMarks}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Attempts</span>
                  <p className="text-base font-black text-sky-400 mt-0.5">
                    {attemptsUsed} / {maxAttempts}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Due Date</span>
                  <p className="text-[11px] font-bold text-foreground mt-1 truncate">
                    {homework.deadline
                      ? new Date(homework.deadline).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "No Due Date"}
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              {latestSubmission && (
                <div
                  className={`rounded-2xl border p-4 space-y-2.5 ${
                    isReviewed
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : isReturned
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="flex items-center gap-1.5">
                      {isReviewed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {isReturned && <RotateCcw className="h-4 w-4 text-amber-400" />}
                      {isPendingReview && <Clock className="h-4 w-4 text-sky-400" />}
                      Status: {latestSubmission.status.replace(/_/g, " ")} (Attempt #{latestSubmission.attemptNumber})
                    </span>
                    {latestSubmission.marksObtained !== null && (
                      <span className="text-amber-400 font-black text-sm">
                        Score: {latestSubmission.marksObtained} / {homework.totalMarks} ({latestSubmission.percentage}%)
                      </span>
                    )}
                  </div>

                  {latestSubmission.feedback && (
                    <div className="rounded-xl bg-background/80 border border-border/80 p-3 text-xs text-foreground space-y-1">
                      <strong className="text-amber-400 block font-bold">Mentor Feedback:</strong>
                      <p className="leading-relaxed whitespace-pre-wrap">{latestSubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Task Instructions */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Task Instructions & Deliverables
                </h4>
                <div className="rounded-xl border border-border bg-background/70 p-4 text-xs leading-relaxed text-foreground">
                  <MarkdownContent content={homework.instructions} />
                </div>
              </div>

              {/* Reference Charts Attached by Teacher */}
              {homework.attachedMedia && homework.attachedMedia.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-amber-400" />
                    Reference Materials & Charts
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {homework.attachedMedia.map((att: any, idx: number) => {
                      const isImg =
                        att.type === "IMAGE" ||
                        att.url?.match(/\.(png|jpg|jpeg|webp|gif)/i);

                      return isImg ? (
                        <div
                          key={`ref-${idx}`}
                          onClick={() =>
                            setActiveLightboxImg({
                              url: att.url,
                              title: att.title || "Teacher Reference Chart",
                            })
                          }
                          className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-black/60 cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={att.url}
                            alt={att.title || "Reference"}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded">
                              Zoom Chart
                            </span>
                          </div>
                        </div>
                      ) : (
                        <a
                          key={`ref-${idx}`}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs hover:border-primary/40"
                        >
                          <span className="truncate font-semibold text-foreground">{att.title}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submission Area */}
              {isSubmissionAllowed ? (
                <div className="space-y-5 rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      {latestSubmission ? "Submit Revision" : "Submit Homework"}
                    </h3>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Attempt {attemptsUsed + 1} of {maxAttempts}
                    </span>
                  </div>

                  {/* Written Notes Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Written Notes / Trade Rationale</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Markdown supported</span>
                    </label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain your trade setup rationale, market context, entry/SL/TP calculation, and indicators used..."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Chart Screenshots Uploader with Bunny CDN Storage */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                        Chart Screenshots (Bunny CDN)
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                        <ClipboardPaste className="h-2.5 w-2.5" />
                        Tip: Press Ctrl+V to paste chart
                      </span>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div className="relative rounded-xl border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors bg-background/50">
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleFileInput}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {isUploading ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                            <p className="text-xs font-bold text-foreground">
                              Uploading screenshot to Bunny CDN ({uploadProgress}%)...
                            </p>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-6 w-6 text-amber-400" />
                            <p className="text-xs font-bold text-foreground">
                              Click or drag screenshots here (or paste with Ctrl+V)
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Supports PNG, JPG, WEBP. Fast storage on Bunny CDN.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Screenshots Preview */}
                    {uploadedScreenshots.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Screenshots ready to submit ({uploadedScreenshots.length}):
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                          {uploadedScreenshots.map((item, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-xl border border-border bg-background overflow-hidden shadow-xs flex flex-col"
                            >
                              <div
                                onClick={() =>
                                  setActiveLightboxImg({
                                    url: item.fileUrl,
                                    title: item.originalFilename,
                                  })
                                }
                                className="relative aspect-video w-full bg-black/70 cursor-zoom-in overflow-hidden"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.fileUrl}
                                  alt={item.originalFilename}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                                </div>
                              </div>

                              <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-card">
                                <span className="truncate font-semibold text-foreground text-[10px]">
                                  {item.originalFilename}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScreenshot(idx)}
                                  className="text-muted-foreground hover:text-red-400 p-1 cursor-pointer"
                                  title="Remove screenshot"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting || isUploading}
                      onClick={handleSubmit}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-extrabold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Homework to Mentor...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Submit Homework (Notes + Screenshots)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-5 text-center space-y-1.5">
                  <Clock className="h-6 w-6 text-muted-foreground mx-auto" />
                  <p className="text-xs font-bold text-foreground">
                    {isPendingReview
                      ? "Awaiting Teacher Review"
                      : "Submission Currently Closed"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isPendingReview
                      ? "Your submission has been received and is in line for mentorship grading."
                      : isPastDeadline
                      ? "The deadline for this assignment has passed."
                      : "Maximum attempts reached for this homework."}
                  </p>
                </div>
              )}

              {/* Submission History */}
              {submissions.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex w-full items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span>Past Attempts History ({submissions.length})</span>
                    {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showHistory && (
                    <div className="space-y-3 pt-2">
                      {submissions.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-400">
                              Attempt #{sub.attemptNumber}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(sub.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          {sub.textAnswer && (
                            <p className="text-muted-foreground text-[11px] line-clamp-2 bg-muted/20 p-2 rounded">
                              {sub.textAnswer}
                            </p>
                          )}

                          {sub.files && sub.files.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {sub.files.map((f: any) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() =>
                                    setActiveLightboxImg({
                                      url: f.fileUrl,
                                      title: f.originalFilename,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/80"
                                >
                                  <ImageIcon className="h-2.5 w-2.5 text-amber-400" />
                                  {f.originalFilename}
                                </button>
                              ))}
                            </div>
                          )}

                          {sub.feedback && (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-300">
                              <strong>Mentor Feedback:</strong> {sub.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] sm:max-w-4xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white px-1">
              <span className="truncate text-xs sm:text-sm font-bold">{activeLightboxImg.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImg.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  title="Open Full Size"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLightboxImg(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative max-h-[80vh] w-full flex items-center justify-center overflow-auto rounded-2xl border border-white/15 bg-black/80 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLightboxImg.url}
                alt={activeLightboxImg.title}
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
