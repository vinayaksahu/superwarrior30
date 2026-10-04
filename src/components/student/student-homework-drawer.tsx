"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef, useMemo } from "react";
import {
  getLessonHomeworkAction,
  submitHomeworkAction,
  type SubmittedFileInput,
} from "@/server/actions/homework.actions";
import { extractHomeworkTasks } from "@/app/homework/[id]/homework-workspace";
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
  Check,
  Plus,
  Link2,
  ArrowRight,
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

  // TradingView / Chart URL Import State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tradingViewUrl, setTradingViewUrl] = useState("");
  const [isImportingUrl, setIsImportingUrl] = useState(false);

  const cleanInstructions = useMemo(() => {
    if (!data?.homework?.instructions) return "";
    return data.homework.instructions.replace(/\s*\([^\)]*screenshot[^\)]*\)\.?/gi, "");
  }, [data?.homework?.instructions]);

  const parsedTasks = useMemo(
    () => extractHomeworkTasks(data?.homework?.instructions),
    [data?.homework?.instructions]
  );

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
      setShowUrlInput(false);
      setTradingViewUrl("");
    }
  }, [isOpen, lessonId, loadData]);

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

  // Import chart from TradingView link or direct image URL
  const handleImportFromUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || tradingViewUrl).trim();
    if (!targetUrl) {
      toast.error("Please enter a TradingView or chart link.");
      return;
    }

    setIsImportingUrl(true);
    toast.info("Importing chart from link and saving to Bunny CDN...");

    try {
      const res = await fetch("/api/upload/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, category: "homework" }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success || !result.url) {
        throw new Error(result.error || "Failed to import chart from link.");
      }

      const taskIdx = uploadedScreenshots.length;
      const taskLabel = parsedTasks[taskIdx]
        ? `${taskIdx + 1}. ${parsedTasks[taskIdx]}`
        : result.originalFilename || `Screenshot #${taskIdx + 1}`;

      setUploadedScreenshots((prev) => [
        ...prev,
        {
          fileUrl: result.url,
          storageKey: result.key || null,
          originalFilename: taskLabel,
          fileSize: result.fileSize || 0,
          mimeType: result.mimeType || "image/png",
        },
      ]);

      setTradingViewUrl("");
      setShowUrlInput(false);
      toast.success("🎯 TradingView chart imported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to import chart from link");
    } finally {
      setIsImportingUrl(false);
    }
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

  // Handle Clipboard Paste (Ctrl+V) for Instant Screenshot or TradingView Link
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // 1. Check if pasted text is a TradingView or image link
      const text = e.clipboardData?.getData("text")?.trim();
      if (
        text &&
        (text.includes("tradingview.com/x/") ||
          text.includes("tradingview.com/snapshots/") ||
          text.match(/^https?:\/\/.*(tradingview\.com|images\.tradingview\.com|\.(png|jpg|jpeg|webp))(\?.*)?$/i))
      ) {
        e.preventDefault();
        await handleImportFromUrl(text);
        return;
      }

      // 2. Check if pasted image file
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
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
  }, [isOpen, uploadedScreenshots.length, parsedTasks]);

  const handleSubmit = () => {
    if (!data?.homework?.id) return;
    if (uploadedScreenshots.length === 0) {
      toast.error("Please upload at least 1 chart screenshot to submit homework.");
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Task Instructions & Deliverables
                  </h4>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-4 text-xs leading-relaxed text-foreground">
                  <MarkdownContent content={cleanInstructions} />
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

                  {/* Chart Screenshots Uploader with "+ Add More" functionality */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
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
                          <label className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 px-2.5 py-1 text-xs font-bold text-amber-400 cursor-pointer transition shadow-xs">
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add File</span>
                            <input
                              type="file"
                              multiple
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              onChange={handleFileInput}
                              disabled={isUploading || isImportingUrl}
                              className="hidden"
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            showUrlInput
                              ? "bg-amber-400 text-black border-amber-400 font-extrabold"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20"
                          }`}
                        >
                          <Link2 className="h-3 w-3" />
                          <span>TradingView Link</span>
                        </button>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                          <ClipboardPaste className="h-2.5 w-2.5" />
                          Ctrl+V to paste
                        </span>
                      </div>
                    </div>

                    {/* TradingView / Chart URL Input Panel */}
                    {showUrlInput && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-3.5 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Link2 className="h-3.5 w-3.5 text-amber-400" />
                            Import from TradingView Link
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowUrlInput(false)}
                            className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            ✕ Close
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Paste your TradingView share snapshot link (e.g. <span className="font-mono text-amber-400 font-bold">https://www.tradingview.com/x/...</span>) or image URL. The chart will be imported directly to Bunny CDN.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={tradingViewUrl}
                            onChange={(e) => setTradingViewUrl(e.target.value)}
                            placeholder="https://www.tradingview.com/x/..."
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-400"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleImportFromUrl();
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={isImportingUrl || !tradingViewUrl.trim()}
                            onClick={() => handleImportFromUrl()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 px-4 py-1.5 text-xs font-black text-black shadow disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            {isImportingUrl ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <span>Import Chart</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* If 0 Screenshots Uploaded: Big Initial Dropzone */}
                    {uploadedScreenshots.length === 0 ? (
                      <div className="relative rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-amber-400/50 transition-colors bg-background/50">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          {isUploading ? (
                            <>
                              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                              <p className="text-xs font-bold text-foreground">
                                Uploading screenshot ({uploadProgress}%)...
                              </p>
                            </>
                          ) : isImportingUrl ? (
                            <>
                              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                              <p className="text-xs font-bold text-foreground">
                                Fetching &amp; uploading chart from TradingView to Bunny CDN...
                              </p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-8 w-8 text-amber-400" />
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  Upload Chart Screenshot or Paste TradingView Link
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  1 chart screenshot is required • Additional charts are optional
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                <label className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-bold text-primary-foreground shadow cursor-pointer transition">
                                  <Plus className="h-3.5 w-3.5" />
                                  Select File from Device
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/jpg"
                                    onChange={handleFileInput}
                                    disabled={isUploading || isImportingUrl}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setShowUrlInput(true)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 px-3.5 py-2 text-xs font-bold text-amber-400 cursor-pointer transition"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  Paste TradingView Link
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* If 1+ Screenshots Uploaded: Grid of Cards + "+ Add More" Card */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                                  #{idx + 1}
                                </span>
                              </div>

                              <div className="p-2 space-y-1.5 text-xs bg-card">
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
                                  className="w-full bg-background rounded border border-border px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:border-amber-400 truncate"
                                  title="Click to rename screenshot or label step"
                                />

                                <div className="flex items-center justify-between text-[10px]">
                                  <label className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold">
                                    <UploadCloud className="h-3 w-3 text-amber-400" />
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp,image/jpg"
                                      onChange={(e) => handleReplaceScreenshot(idx, e)}
                                      disabled={isUploading || isImportingUrl}
                                      className="hidden"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setUploadedScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-400 cursor-pointer font-bold"
                                    title="Remove screenshot"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* "+ Add More" Upload Card inside grid */}
                          <div className="group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-amber-400 bg-background/40 hover:bg-background/80 transition min-h-[140px] text-center">
                            {isUploading || isImportingUrl ? (
                              <>
                                <Loader2 className="h-6 w-6 animate-spin text-amber-400 mb-1" />
                                <span className="text-xs font-bold text-foreground">
                                  {isImportingUrl ? "Importing TradingView Chart..." : `Uploading (${uploadProgress}%)...`}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 mb-1 group-hover:scale-110 transition-transform">
                                  <Plus className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-extrabold text-foreground group-hover:text-amber-400">
                                  + Add More (Optional)
                                </span>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <label className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2 py-1 text-[10px] font-bold cursor-pointer transition">
                                    <Plus className="h-3 w-3" />
                                    File
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/png,image/jpeg,image/webp,image/jpg"
                                      onChange={handleFileInput}
                                      disabled={isUploading || isImportingUrl}
                                      className="hidden"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowUrlInput(true)}
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 border border-amber-400/30 px-2 py-1 text-[10px] font-bold cursor-pointer transition"
                                  >
                                    <Link2 className="h-3 w-3" />
                                    TradingView
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
