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
  const [isPending, startTransition] = useTransition();

  const handleVideoUploadComplete = async (key: string) => {
    setVideoKey(key);
    await updateLessonFileAction(lesson.id, "video", key);
    if (onRefresh) onRefresh();
  };

  const handlePdfUploadComplete = async (key: string) => {
    setPdfKey(key);
    await updateLessonFileAction(lesson.id, "pdf", key);
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
          <div>
            <h3 className="text-lg font-semibold text-foreground">Edit Lesson</h3>
            <p className="text-xs text-muted-foreground">Manage lesson content, video, and attachments</p>
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

          {/* Content Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Content Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: "VIDEO", label: "Video Lesson", icon: Video },
                { type: "PDF", label: "PDF Document", icon: FileText },
                { type: "TEXT", label: "Article / Text", icon: AlignLeft },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type as "VIDEO" | "PDF" | "TEXT")}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                    contentType === type
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1.5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area for VIDEO */}
          {contentType === "VIDEO" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-primary" />
                  Video File (Private Cloudflare R2)
                </label>
                {videoKey && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <PlayCircle className="h-3.5 w-3.5" />
                    Video Attached
                  </span>
                )}
              </div>

              <FileUploader
                category="video"
                courseId={courseId}
                moduleId={lesson.moduleId}
                lessonId={lesson.id}
                currentKey={videoKey}
                onUploadComplete={handleVideoUploadComplete}
                label="Upload Video"
                description="MP4 or WebM (Direct to private R2 storage, up to 500MB)"
              />
            </div>
          )}

          {/* Upload Area for PDF */}
          {contentType === "PDF" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  PDF Attachment (Private Cloudflare R2)
                </label>
                {pdfKey && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    Document Attached
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
                description="Secure PDF cheatsheet or notes (Up to 50MB)"
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

          {/* Duration in Minutes/Seconds */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="durationSec" className="text-sm font-medium leading-none">
                Duration (in Seconds)
              </label>
              <input
                id="durationSec"
                name="durationSec"
                type="number"
                min="0"
                defaultValue={lesson.durationSec || 0}
                placeholder="e.g. 600 for 10 min"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Approx {Math.round((lesson.durationSec || 0) / 60)} minutes
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFreePreview"
                  value="true"
                  defaultChecked={lesson.isFreePreview}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">Free Preview Lesson</p>
                  <p className="text-xs text-muted-foreground">Allow potential students to watch without enrolling</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  value="true"
                  defaultChecked={lesson.isPublished}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">Visible to enrolled students</p>
                </div>
              </label>
            </div>
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
