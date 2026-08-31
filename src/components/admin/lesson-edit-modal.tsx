"use client";

import { useState, useTransition } from "react";
import { updateLessonAction, updateLessonFileAction } from "@/server/actions/course.actions";
import { FileUploader } from "@/components/admin/file-uploader";
import { X, Video, FileText, AlignLeft, Loader2, PlayCircle, Eye } from "lucide-react";
import { toast } from "sonner";

interface LessonEditModalProps {
  courseId: string;
  lesson: {
    id: string;
    moduleId: string;
    title: string;
    slug: string;
    position: number;
    contentType: "VIDEO" | "PDF" | "TEXT" | string;
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
  const [contentType, setContentType] = useState<"VIDEO" | "PDF" | "TEXT">(
    (lesson.contentType as "VIDEO" | "PDF" | "TEXT") || "VIDEO"
  );
  const [videoKey, setVideoKey] = useState<string | null>(lesson.videoKey);
  const [pdfKey, setPdfKey] = useState<string | null>(lesson.pdfKey);
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(lesson.bunnyVideoId || null);
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState<string | null>(lesson.bunnyCdnUrl || null);
  const [isFreePreview, setIsFreePreview] = useState<boolean>(lesson.isFreePreview);
  const [isPending, startTransition] = useTransition();

  const hasVideo = videoKey || bunnyVideoId;
  const hasPdf = pdfKey || bunnyCdnUrl;

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
                    : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                }`}>
                  {contentType === "VIDEO" && <Video className="h-3 w-3" />}
                  {contentType === "PDF" && <FileText className="h-3 w-3" />}
                  {contentType === "TEXT" && <AlignLeft className="h-3 w-3" />}
                  {contentType === "VIDEO" ? "Video Lesson" : contentType === "PDF" ? "PDF Document" : "Text Article"}
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

          {/* Upload Area for VIDEO */}
          {contentType === "VIDEO" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-primary" />
                  Video File (Bunny Stream)
                </label>
                {hasVideo && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {bunnyVideoId ? "Bunny Stream (Active)" : "Video Attached"}
                  </span>
                )}
              </div>

              <FileUploader
                category="video"
                courseId={courseId}
                moduleId={lesson.moduleId}
                lessonId={lesson.id}
                currentKey={videoKey}
                currentBunnyVideoId={bunnyVideoId}
                onUploadComplete={handleVideoUploadComplete}
                label="Upload Video"
                description="MP4, MKV, WebM, MOV or AVI — Direct TUS upload to Bunny Stream for HD HLS playback (up to 2GB)"
              />
            </div>
          )}

          {/* Upload Area for PDF */}
          {contentType === "PDF" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  PDF Attachment (Bunny CDN)
                </label>
                {hasPdf && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    {bunnyCdnUrl ? "Bunny CDN (Active)" : "Document Attached"}
                  </span>
                )}
              </div>

              <FileUploader
                category="pdf"
                courseId={courseId}
                moduleId={lesson.moduleId}
                lessonId={lesson.id}
                currentKey={pdfKey}
                onUploadComplete={handlePdfUploadComplete}
                label="Upload PDF Document"
                description="Secure PDF cheatsheet or notes — delivered via Bunny CDN (up to 50MB)"
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

            {/* If Free Preview is enabled, Admin decides how many seconds to show */}
            {isFreePreview ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3.5 space-y-2 animate-in fade-in">
                <label htmlFor="durationSec" className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  ⏱️ Free Preview Duration (in Seconds)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="durationSec"
                    name="durationSec"
                    type="number"
                    min="5"
                    max="600"
                    defaultValue={lesson.durationSec > 0 ? lesson.durationSec : 15}
                    placeholder="e.g. 15, 30 or 60"
                    className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span className="text-xs text-neutral-300">
                    seconds (video will automatically pause & lock after this time)
                  </span>
                </div>
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
      </div>
    </div>
  );
}
