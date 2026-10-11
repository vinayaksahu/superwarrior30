"use client";

import { useState, useTransition } from "react";
import { updateLessonAction, updateLessonFileAction } from "@/server/actions/course.actions";
import { attachMediaToLessonAction } from "@/server/actions/media.actions";
import { FileUploader } from "@/components/admin/file-uploader";
import { MediaPickerModal } from "@/components/admin/media/media-picker-modal";
import { QuizBuilder } from "@/components/admin/quiz/quiz-builder";
import { HomeworkBuilder } from "@/components/admin/homework/homework-builder";
import {
  X,
  Video,
  FileText,
  AlignLeft,
  Loader2,
  PlayCircle,
  Eye,
  Film,
  FolderOpen,
  HelpCircle,
  Award,
  Link2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { isExternalVideoUrl, parseExternalVideo } from "@/lib/video-utils";
import { toast } from "sonner";

function YouTubeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface LessonEditModalProps {
  courseId: string;
  lesson: {
    id: string;
    moduleId: string;
    title: string;
    slug: string;
    position: number;
    contentType: "VIDEO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT" | string;
    videoKey: string | null;
    pdfKey: string | null;
    bunnyVideoId?: string | null;
    bunnyCdnUrl?: string | null;
    mediaProvider?: string | null;
    textContent: string | null;
    durationSec: number;
    isFreePreview: boolean;
    isPublished: boolean;
  };
  onClose: () => void;
  onRefresh?: () => void;
}

export function LessonEditModal({
  courseId,
  lesson,
  onClose,
  onRefresh,
}: LessonEditModalProps) {
  const [contentType, setContentType] = useState<
    "VIDEO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT"
  >(
    (lesson.contentType as "VIDEO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT") || "VIDEO"
  );
  const isInitialExternal = Boolean(
    lesson.mediaProvider === "YOUTUBE" ||
    lesson.mediaProvider === "EXTERNAL" ||
    (lesson.videoKey && isExternalVideoUrl(lesson.videoKey, lesson.mediaProvider))
  );

  const [videoSourceType, setVideoSourceType] = useState<"BUNNY" | "EXTERNAL">(
    isInitialExternal ? "EXTERNAL" : "BUNNY"
  );
  const [externalVideoUrl, setExternalVideoUrl] = useState<string>(
    isInitialExternal && lesson.videoKey ? lesson.videoKey : ""
  );

  const [videoKey, setVideoKey] = useState<string | null>(lesson.videoKey);
  const [pdfKey, setPdfKey] = useState<string | null>(lesson.pdfKey);
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(lesson.bunnyVideoId || null);
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState<string | null>(lesson.bunnyCdnUrl || null);
  const [isFreePreview, setIsFreePreview] = useState<boolean>(lesson.isFreePreview);
  const [showMediaPicker, setShowMediaPicker] = useState<"VIDEO" | "PDF" | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedVideo = parseExternalVideo(externalVideoUrl);
  const hasExternalVideo = videoSourceType === "EXTERNAL" && Boolean(externalVideoUrl.trim()) && parsedVideo.isValid;
  const hasVideo = hasExternalVideo || videoKey || bunnyVideoId;
  const hasPdf = pdfKey || bunnyCdnUrl;

  const handleSelectMediaFromLibrary = async (media: any) => {
    try {
      const res = await attachMediaToLessonAction({
        lessonId: lesson.id,
        mediaId: media.id,
        mediaRole: "PRIMARY",
      });

      if (!res.success) {
        toast.error(res.error || "Failed to attach media");
        return;
      }

      if (media.mediaType === "VIDEO") {
        setBunnyVideoId(media.bunnyVideoId || null);
        setVideoKey(media.storageKey || null);
        setVideoSourceType("BUNNY");
        setExternalVideoUrl("");
      } else if (media.mediaType === "PDF") {
        setBunnyCdnUrl(media.storageUrl || null);
        setPdfKey(media.storageKey || null);
      }

      toast.success(res.message || "Media attached from library successfully!");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Error attaching media");
    }
  };

  const handleVideoUploadComplete = async (result: {
    key: string | null;
    bunnyVideoId: string | null;
    cdnUrl: string | null;
    provider: "R2" | "BUNNY";
  }) => {
    if (result.provider === "BUNNY" && result.bunnyVideoId) {
      setBunnyVideoId(result.bunnyVideoId);
      setVideoKey(null);
    } else if (result.key) {
      setVideoKey(result.key);
      setBunnyVideoId(null);
    }
    setVideoSourceType("BUNNY");
    setExternalVideoUrl("");
    await updateLessonFileAction(
      lesson.id,
      "video",
      result.key || "",
      result.bunnyVideoId,
      result.cdnUrl,
      result.provider
    );
    if (onRefresh) onRefresh();
  };

  const handlePdfUploadComplete = async (result: {
    key: string | null;
    bunnyVideoId: string | null;
    cdnUrl: string | null;
    provider: "R2" | "BUNNY";
  }) => {
    if (result.provider === "BUNNY" && result.cdnUrl) {
      setBunnyCdnUrl(result.cdnUrl);
      setPdfKey(null);
    } else if (result.key) {
      setPdfKey(result.key);
      setBunnyCdnUrl(null);
    }
    await updateLessonFileAction(
      lesson.id,
      "pdf",
      result.key || "",
      result.bunnyVideoId,
      result.cdnUrl,
      result.provider
    );
    if (onRefresh) onRefresh();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("contentType", contentType);

    if (contentType === "VIDEO") {
      formData.set("videoSourceType", videoSourceType);
      if (videoSourceType === "EXTERNAL") {
        if (externalVideoUrl.trim()) {
          const parsed = parseExternalVideo(externalVideoUrl);
          if (!parsed.isValid) {
            toast.error(parsed.errorMessage || "Please enter a valid YouTube or external video URL");
            return;
          }
          formData.set("externalVideoUrl", externalVideoUrl.trim());
        } else {
          formData.set("externalVideoUrl", "");
        }
      } else {
        if (bunnyVideoId) {
          formData.set("bunnyVideoId", bunnyVideoId);
        }
      }
    }

    startTransition(async () => {
      try {
        const res = await updateLessonAction(lesson.id, formData);
        if (!res.success) {
          toast.error(res.message || "Failed to update lesson");
        } else {
          toast.success("Lesson updated successfully!");
          if (onRefresh) onRefresh();
          onClose();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error saving lesson";
        toast.error(msg);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Edit Lesson Content</h3>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  contentType === "VIDEO"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : contentType === "PDF"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : contentType === "TEXT"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    : contentType === "QUIZ"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {contentType === "VIDEO" && <Video className="h-3 w-3" />}
                  {contentType === "PDF" && <FileText className="h-3 w-3" />}
                  {contentType === "TEXT" && <AlignLeft className="h-3 w-3" />}
                  {contentType === "QUIZ" && <HelpCircle className="h-3 w-3" />}
                  {contentType === "ASSIGNMENT" && <Award className="h-3 w-3" />}
                  {contentType === "VIDEO"
                    ? "Video Lesson"
                    : contentType === "PDF"
                    ? "PDF Document"
                    : contentType === "TEXT"
                    ? "Text Article"
                    : contentType === "QUIZ"
                    ? "Quiz"
                    : "Homework / Assignment"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Upload and manage content for this lesson</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Type Selector Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-6 py-2.5">
          <span className="text-xs font-bold text-muted-foreground mr-1">Lesson Type:</span>
          {[
            { type: "VIDEO", label: "Video Lesson", icon: Video },
            { type: "PDF", label: "PDF Document", icon: FileText },
            { type: "TEXT", label: "Text Article", icon: AlignLeft },
            { type: "QUIZ", label: "Quiz", icon: HelpCircle },
            { type: "ASSIGNMENT", label: "Homework / Assignment", icon: Award },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type as any)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                contentType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {contentType === "QUIZ" ? (
          <div className="p-6">
            <QuizBuilder
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              onSaveSuccess={() => {
                if (onRefresh) onRefresh();
                onClose();
              }}
              onClose={onClose}
            />
          </div>
        ) : contentType === "ASSIGNMENT" ? (
          <div className="p-6">
            <HomeworkBuilder
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              onSaveSuccess={() => {
                if (onRefresh) onRefresh();
                onClose();
              }}
              onClose={onClose}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <input type="hidden" name="contentType" value={contentType} />

          {/* Lesson Title */}
          <div className="space-y-2">
            <label htmlFor="lessonTitle" className="text-sm font-medium leading-none">
              Lesson Title <span className="text-destructive">*</span>
            </label>
            <input
              id="lessonTitle"
              name="title"
              type="text"
              defaultValue={lesson.title}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Upload / Link Area for VIDEO */}
          {contentType === "VIDEO" && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-primary" />
                  Video Source
                </label>
                <div className="flex items-center gap-2">
                  {videoSourceType === "BUNNY" && (
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker("VIDEO")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Select from Media Library
                    </button>
                  )}
                  {hasVideo && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${
                      videoSourceType === "EXTERNAL"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    }`}>
                      <PlayCircle className="h-3.5 w-3.5" />
                      {videoSourceType === "EXTERNAL"
                        ? parsedVideo.provider === "YOUTUBE"
                          ? "YouTube Active"
                          : "External Video Active"
                        : bunnyVideoId
                        ? "Bunny Stream Active"
                        : "Attached"}
                    </span>
                  )}
                </div>
              </div>

              {/* Source Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-background/80 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setVideoSourceType("BUNNY")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    videoSourceType === "BUNNY"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  Bunny Stream (Upload / Library)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceType("EXTERNAL")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    videoSourceType === "EXTERNAL"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <YouTubeIcon className="h-3.5 w-3.5" />
                  External Link (YouTube / Embed)
                </button>
              </div>

              {/* Tab 1: Bunny Stream Upload / Picker */}
              {videoSourceType === "BUNNY" && (
                <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
                  <FileUploader
                    category="video"
                    courseId={courseId}
                    moduleId={lesson.moduleId}
                    lessonId={lesson.id}
                    currentKey={videoKey}
                    currentBunnyVideoId={bunnyVideoId}
                    onUploadComplete={handleVideoUploadComplete}
                    label="Upload New Video"
                    description="Or upload directly via multi-GB resumable TUS upload to Bunny Stream (up to 2GB)"
                  />
                </div>
              )}

              {/* Tab 2: External Link / YouTube Embed */}
              {videoSourceType === "EXTERNAL" && (
                <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="externalVideoUrl" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-red-500" />
                        External Video URL / Embed Link / Iframe Code
                      </label>
                      {externalVideoUrl && (
                        <button
                          type="button"
                          onClick={() => setExternalVideoUrl("")}
                          className="text-[11px] text-destructive hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="externalVideoUrl"
                        type="text"
                        name="externalVideoUrl"
                        value={externalVideoUrl}
                        onChange={(e) => setExternalVideoUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or <iframe src='...'></iframe>"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {externalVideoUrl.trim() && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {parsedVideo.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      YouTube watch links, Shorts, livestreams, <span className="font-mono text-primary text-[10px]">youtu.be/...</span> links, Vimeo, or complete <span className="font-mono text-primary text-[10px]">&lt;iframe&gt;</span> embed codes are automatically converted into an optimized embedded player.
                    </p>
                  </div>

                  {/* Video Live Preview */}
                  {externalVideoUrl.trim() && parsedVideo.isValid && (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {parsedVideo.provider === "YOUTUBE" ? (
                            <YouTubeIcon className="h-4 w-4 text-red-500" />
                          ) : (
                            <Video className="h-4 w-4 text-primary" />
                          )}
                          <span>Video Preview ({parsedVideo.provider === "YOUTUBE" ? "YouTube" : "External"})</span>
                          {parsedVideo.videoId && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              ID: {parsedVideo.videoId}
                            </span>
                          )}
                        </div>
                        <a
                          href={parsedVideo.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <span>Open Player</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-black shadow-inner">
                        <iframe
                          src={parsedVideo.embedUrl}
                          title="External Video Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {externalVideoUrl.trim() && !parsedVideo.isValid && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{parsedVideo.errorMessage || "Invalid video link format."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Area for PDF */}
          {contentType === "PDF" && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  PDF Document (Bunny CDN)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker("PDF")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 cursor-pointer transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Select from Media Library
                  </button>
                  {hasPdf && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <Eye className="h-3.5 w-3.5" />
                      {bunnyCdnUrl ? "Bunny CDN Active" : "Attached"}
                    </span>
                  )}
                </div>
              </div>

              <FileUploader
                category="pdf"
                courseId={courseId}
                moduleId={lesson.moduleId}
                lessonId={lesson.id}
                currentKey={pdfKey}
                onUploadComplete={handlePdfUploadComplete}
                label="Upload New PDF Document"
                description="Or upload directly to Bunny CDN storage (up to 50MB)"
              />
            </div>
          )}

          {/* Text Content */}
          {contentType === "TEXT" && (
            <div className="space-y-2">
              <label htmlFor="textContent" className="text-sm font-medium leading-none">
                Article / Text Content (Markdown Supported)
              </label>
              <textarea
                id="textContent"
                name="textContent"
                rows={6}
                defaultValue={lesson.textContent || ""}
                placeholder="Write trade setups, market rules, explanations, or notes..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Settings: Free Preview & Published */}
          <div className="rounded-xl border border-border bg-card/40 p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFreePreview"
                  value="true"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Free Preview Lesson</p>
                  <p className="text-xs text-muted-foreground">Allow prospective students to watch a teaser without enrolling</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  value="true"
                  defaultChecked={lesson.isPublished}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Published</p>
                  <p className="text-xs text-muted-foreground">Visible to enrolled students</p>
                </div>
              </label>
            </div>

            {/* If Free Preview is enabled, Admin decides preview limit tailored to Video, PDF, or Article */}
            {isFreePreview ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3.5 space-y-2 animate-in fade-in">
                {contentType === "VIDEO" ? (
                  <>
                    <label htmlFor="durationSec" className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      ⏱️ Video Free Preview Limit (in Seconds)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="durationSec"
                        name="durationSec"
                        type="number"
                        min="5"
                        max="3600"
                        defaultValue={
                          lesson.durationSec > 0 && lesson.durationSec <= 3600
                            ? lesson.durationSec
                            : 120
                        }
                        placeholder="e.g. 15, 30 or 60"
                        className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="text-xs text-neutral-300">
                        seconds (video will automatically pause & show paywall after this time)
                      </span>
                    </div>
                  </>
                ) : contentType === "PDF" ? (
                  <>
                    <label htmlFor="durationSec" className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      📄 PDF Free Preview Limit (in Pages)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="durationSec"
                        name="durationSec"
                        type="number"
                        min="1"
                        max="500"
                        defaultValue={lesson.durationSec > 0 ? lesson.durationSec : 1}
                        placeholder="e.g. 1, 2 or 3"
                        className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="text-xs text-neutral-300">
                        page(s) (prospective students can preview the first X pages)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <label htmlFor="durationSec" className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      📝 Article Free Preview Limit (Word Count)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="durationSec"
                        name="durationSec"
                        type="number"
                        min="30"
                        max="5000"
                        defaultValue={lesson.durationSec > 0 ? lesson.durationSec : 150}
                        placeholder="e.g. 100 or 150"
                        className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="text-xs text-neutral-300">
                        words (article will fade out with Paywall card after this limit)
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <input type="hidden" name="durationSec" value={lesson.durationSec || 0} />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Lesson"}
            </button>
          </div>
        </form>
        )}
      </div>

      {/* Select from Media Library Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          mediaType={showMediaPicker}
          onSelect={handleSelectMediaFromLibrary}
          onClose={() => setShowMediaPicker(null)}
        />
      )}
    </div>
  );
}
