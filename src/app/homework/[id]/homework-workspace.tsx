"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { submitHomeworkAction, type SubmittedFileInput } from "@/server/actions/homework.actions";
import { MarkdownContent } from "@/components/shared/markdown-content";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Loader2,
  Send,
  FileText,
  ImageIcon,
  ZoomIn,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Trash2,
  ClipboardPaste,
  Share2,
  ArrowLeft,
  X,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

export function extractHomeworkTasks(instructions?: string | null): string[] {
  if (!instructions) return [];
  const lines = instructions.split(/\r?\n/);
  const tasks: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (match) {
      const cleanTask = match[2].replace(/\s*\([^\)]*screenshot[^\)]*\)\.?/gi, "").trim();
      tasks.push(cleanTask);
    }
  }
  return tasks;
}

interface StudentHomeworkWorkspaceProps {
  homework: any;
  submissions: any[];
  latestSubmission: any;
  isPastDeadline: boolean;
  isSubmissionAllowed: boolean;
  attemptsUsed: number;
  maxAttempts: number;
}

export function StudentHomeworkWorkspace({
  homework,
  submissions: initialSubmissions,
  latestSubmission: initialLatest,
  isPastDeadline,
  isSubmissionAllowed: initialAllowed,
  attemptsUsed: initialAttemptsUsed,
  maxAttempts,
}: StudentHomeworkWorkspaceProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [latestSubmission, setLatestSubmission] = useState(initialLatest);
  const [attemptsUsed, setAttemptsUsed] = useState(initialAttemptsUsed);
  const [isSubmissionAllowed, setIsSubmissionAllowed] = useState(initialAllowed);

  // Form State
  const [notes, setNotes] = useState(
    initialLatest?.status === "RETURNED_FOR_RESUBMISSION" ? initialLatest?.textAnswer || "" : ""
  );

  const cleanInstructions = useMemo(() => {
    if (!homework?.instructions) return "";
    return homework.instructions.replace(/\s*\([^\)]*screenshot[^\)]*\)\.?/gi, "");
  }, [homework?.instructions]);

  const parsedTasks = useMemo(() => extractHomeworkTasks(homework?.instructions), [homework?.instructions]);

  const [uploadedScreenshots, setUploadedScreenshots] = useState<SubmittedFileInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<{ url: string; title: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isSubmitting, startSubmitTransition] = useTransition();

  // Upload file via /api/upload
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

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const results: SubmittedFileInput[] = [];
      const currentCount = uploadedScreenshots.length;
      for (let i = 0; i < files.length; i++) {
        const item = await uploadSingleFile(files[i]);
        const taskIdx = currentCount + i;
        const taskLabel = parsedTasks[taskIdx]
          ? `${taskIdx + 1}. ${parsedTasks[taskIdx]}`
          : currentCount > 0 || files.length > 1
          ? `Screenshot #${taskIdx + 1}`
          : files[i].name;

        results.push({
          ...item,
          originalFilename: taskLabel,
        });
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setUploadedScreenshots((prev) => [...prev, ...results]);
      toast.success(`${results.length} screenshot${results.length > 1 ? "s" : ""} added!`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleReplaceScreenshot = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const item = await uploadSingleFile(file);
      setUploadedScreenshots((prev) =>
        prev.map((s, i) => (i === idx ? { ...item, originalFilename: s.originalFilename } : s))
      );
      toast.success("Screenshot replaced successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to replace screenshot");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Clipboard Paste (Ctrl+V) handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            const renamed = new File(
              [file],
              `chart-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
              { type: file.type }
            );
            imageFiles.push(renamed);
          }
        }
      }

      if (imageFiles.length === 0) return;

      e.preventDefault();
      setIsUploading(true);
      toast.info("Uploading pasted screenshot...");

      try {
        const results: SubmittedFileInput[] = [];
        const currentCount = uploadedScreenshots.length;
        for (let i = 0; i < imageFiles.length; i++) {
          const item = await uploadSingleFile(imageFiles[i]);
          const taskIdx = currentCount + i;
          const taskLabel = parsedTasks[taskIdx]
            ? `${taskIdx + 1}. ${parsedTasks[taskIdx]}`
            : `Screenshot #${taskIdx + 1}`;

          results.push({
            ...item,
            originalFilename: taskLabel,
          });
        }
        setUploadedScreenshots((prev) => [...prev, ...results]);
        toast.success("🎯 Chart screenshot pasted!");
      } catch (err: any) {
        toast.error(err.message || "Failed to upload pasted screenshot");
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [uploadedScreenshots.length, parsedTasks]);

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : `https://superwarrior30.com/homework/${homework.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("📋 Shareable homework link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = () => {
    if (uploadedScreenshots.length === 0) {
      toast.error("Please upload at least 1 chart screenshot to submit homework.");
      return;
    }

    startSubmitTransition(async () => {
      try {
        const res = await submitHomeworkAction(homework.id, {
          textAnswer: notes,
          files: uploadedScreenshots,
        });

        if (res.success) {
          toast.success(`🎉 Homework Attempt #${res.attemptNumber} Submitted Successfully!`);
          setIsSubmissionAllowed(false);
          setAttemptsUsed((prev: number) => prev + 1);
          setLatestSubmission({
            attemptNumber: res.attemptNumber,
            textAnswer: notes,
            status: "SUBMITTED",
            submittedAt: new Date().toISOString(),
            marksObtained: null,
            percentage: null,
            feedback: null,
            files: uploadedScreenshots,
          });
          setNotes("");
          setUploadedScreenshots([]);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit homework");
      }
    });
  };

  const isReviewed = latestSubmission?.status === "REVIEWED";
  const isReturned = latestSubmission?.status === "RETURNED_FOR_RESUBMISSION";
  const isPendingReview = latestSubmission?.status === "SUBMITTED";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/dashboard/homework"
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0"
              title="Back to All Homework"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block truncate">
                {homework.courseTitle}
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                {homework.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title="Copy shareable link to remind students"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{copiedLink ? "Copied Link!" : "Share Link"}</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-primary px-3.5 py-1.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Assignment Brief Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-400">
                <Award className="h-3.5 w-3.5" />
                Mentorship Assignment
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {homework.title}
              </h2>
              {homework.description && (
                <p className="text-xs sm:text-sm text-muted-foreground">{homework.description}</p>
              )}
            </div>

            {latestSubmission && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border self-start sm:self-auto ${
                  isReviewed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : isReturned
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                }`}
              >
                {isReviewed && <CheckCircle2 className="h-4 w-4" />}
                {isReturned && <RotateCcw className="h-4 w-4" />}
                {isPendingReview && <Clock className="h-4 w-4" />}
                Status: {latestSubmission.status.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-background p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Marks</span>
              <p className="text-xl font-black text-amber-400 mt-0.5">{homework.totalMarks}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Passing Marks</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{homework.passingMarks || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Attempts Used</span>
              <p className="text-xl font-black text-sky-400 mt-0.5">{attemptsUsed} / {maxAttempts}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Due Date</span>
              <p className="text-xs sm:text-sm font-bold text-foreground mt-1 truncate">
                {homework.deadline
                  ? new Date(homework.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "No Deadline"}
              </p>
            </div>
          </div>

          {/* Teacher Review Feedback Banner */}
          {latestSubmission && (isReviewed || isReturned) && (
            <div
              className={`rounded-2xl border p-5 space-y-3 ${
                isReviewed
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold border-b border-border/50 pb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Mentor Evaluation (Attempt #{latestSubmission.attemptNumber})
                </span>
                {latestSubmission.marksObtained !== null && (
                  <span className="text-amber-400 font-black text-sm">
                    Score: {latestSubmission.marksObtained} / {homework.totalMarks} ({latestSubmission.percentage}%)
                  </span>
                )}
              </div>

              {latestSubmission.feedback && (
                <div className="rounded-xl bg-background/80 border border-border/80 p-3.5 text-xs text-foreground space-y-1">
                  <strong className="text-amber-400 block font-bold">Mentor Feedback:</strong>
                  <p className="leading-relaxed whitespace-pre-wrap">{latestSubmission.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Task Instructions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Task Instructions & Deliverables
              </h3>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-5 sm:p-6 text-foreground leading-relaxed">
              <MarkdownContent content={cleanInstructions} />
            </div>
          </div>

          {/* Reference Materials */}
          {homework.attachedMedia && homework.attachedMedia.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-amber-400" />
                Teacher Reference Materials & Charts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {homework.attachedMedia.map((att: any, idx: number) => {
                  const isImg =
                    att.type === "IMAGE" ||
                    att.url?.match(/\.(png|jpg|jpeg|webp|gif)/i);

                  return isImg ? (
                    <div
                      key={idx}
                      onClick={() =>
                        setActiveLightboxImg({
                          url: att.url,
                          title: att.title || "Reference Chart",
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded">
                          Click to Zoom Reference Chart
                        </span>
                      </div>
                    </div>
                  ) : (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-xs hover:border-primary/40 transition group"
                    >
                      <span className="truncate font-semibold text-foreground group-hover:text-amber-400">
                        {att.title}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submission Section */}
        {isSubmissionAllowed ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                {latestSubmission ? "Submit Revision" : "Submit Your Homework"}
              </h3>
              <span className="text-xs font-bold text-muted-foreground">
                Attempt {attemptsUsed + 1} of {maxAttempts}
              </span>
            </div>

            {/* Written Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Written Explanation / Trading Notes / Trade Setup Details</span>
                <span className="text-[10px] text-muted-foreground font-normal">Markdown supported</span>
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain your trade setup rationale, market context, entry/SL/TP calculation, and indicators used..."
                className="w-full rounded-xl border border-input bg-background p-3.5 text-xs leading-relaxed focus:border-primary focus:outline-none"
              />
            </div>

            {/* Chart Screenshots Uploader with "+ Add More" functionality */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                    Chart Screenshots {uploadedScreenshots.length > 0 && `(${uploadedScreenshots.length})`}
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    1 Required • Extra Optional
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {uploadedScreenshots.length > 0 && (
                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-400 cursor-pointer transition shadow-xs">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add More (Optional)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleFileInput}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                    <ClipboardPaste className="h-2.5 w-2.5" />
                    Ctrl+V to paste
                  </span>
                </div>
              </div>

              {/* If 0 Screenshots Uploaded: Big Initial Dropzone */}
              {uploadedScreenshots.length === 0 ? (
                <div className="relative rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-amber-400/50 transition-colors bg-background/50">
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleFileInput}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                        <p className="text-xs font-bold text-foreground">
                          Uploading screenshot ({uploadProgress}%)...
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-amber-400" />
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Click or drag chart screenshot here (or paste with Ctrl+V)
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            1 chart screenshot is required • Additional charts are optional
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary pointer-events-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Select Chart Screenshot (Required)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* If 1+ Screenshots Uploaded: Grid of Cards + "+ Add More" Card */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                            <ZoomIn className="h-4 w-4 text-white" />
                          </div>
                          <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="p-2.5 space-y-2 text-xs bg-card">
                          <input
                            type="text"
                            value={item.originalFilename}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadedScreenshots((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, originalFilename: val } : s))
                              );
                            }}
                            placeholder="e.g. 1. Trend: HH, HL"
                            className="w-full bg-background rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:border-amber-400 truncate"
                            title="Click to rename screenshot or label step"
                          />

                          <div className="flex items-center justify-between text-xs">
                            <label className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold">
                              <UploadCloud className="h-3.5 w-3.5 text-amber-400" />
                              Replace
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                onChange={(e) => handleReplaceScreenshot(idx, e)}
                                disabled={isUploading}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setUploadedScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-400 cursor-pointer font-bold"
                              title="Remove screenshot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* "+ Add More" Upload Card inside grid */}
                    <label className="group relative flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-border hover:border-amber-400 bg-background/40 hover:bg-background/80 cursor-pointer transition min-h-[160px] text-center">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-7 w-7 animate-spin text-amber-400 mb-1" />
                          <span className="text-xs font-bold text-foreground">
                            Uploading ({uploadProgress}%)...
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition-transform">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-extrabold text-foreground group-hover:text-amber-400">
                            + Add More (Optional)
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            Add extra chart or paste with Ctrl+V
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleFileInput}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                type="button"
                disabled={isSubmitting || isUploading}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-extrabold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Homework...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Homework for Mentorship Review
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">
              {isPendingReview
                ? "Submission Under Teacher Review"
                : "Submissions Closed"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isPendingReview
                ? "Your homework attempt has been submitted and is currently awaiting mentor grading and feedback."
                : isPastDeadline
                ? "The deadline for this homework has passed."
                : "You have reached the maximum allowed attempts for this homework."}
            </p>
          </div>
        )}

        {/* Past Attempts History */}
        {submissions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
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
                    className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-400">
                        Attempt #{sub.attemptNumber}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    {sub.textAnswer && (
                      <p className="text-muted-foreground text-xs leading-relaxed bg-muted/20 p-3 rounded-lg">
                        {sub.textAnswer}
                      </p>
                    )}

                    {sub.files && sub.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
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
                            className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            <ImageIcon className="h-3 w-3 text-amber-400" />
                            {f.originalFilename}
                          </button>
                        ))}
                      </div>
                    )}

                    {sub.feedback && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300">
                        <strong>Mentor Feedback:</strong> {sub.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] sm:max-w-5xl w-full flex flex-col items-center justify-center"
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
