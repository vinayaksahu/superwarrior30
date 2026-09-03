"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getLessonHomeworkAction,
  saveHomeworkAction,
  type HomeworkAttachment,
  type SaveHomeworkPayload,
} from "@/server/actions/homework.actions";
import { MediaPickerModal } from "@/components/admin/media/media-picker-modal";
import {
  Save,
  Loader2,
  Calendar,
  Clock,
  Award,
  FileText,
  ImageIcon,
  Paperclip,
  Plus,
  Trash2,
  ExternalLink,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface HomeworkBuilderProps {
  lessonId: string;
  lessonTitle: string;
  onSaveSuccess?: () => void;
  onClose?: () => void;
}

export function HomeworkBuilder({
  lessonId,
  lessonTitle,
  onSaveSuccess,
  onClose,
}: HomeworkBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Homework Fields State
  const [title, setTitle] = useState(lessonTitle || "Practical Homework Assignment");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number | "">(50);
  const [deadline, setDeadline] = useState<string>("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED">("PUBLISHED");
  const [attachedMedia, setAttachedMedia] = useState<HomeworkAttachment[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<"IMAGE" | "PDF" | "DOCUMENT">("DOCUMENT");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadHomework() {
      try {
        const res = await getLessonHomeworkAction(lessonId);
        if (!isMounted) return;

        if (res && res.homework) {
          setTitle(res.homework.title || lessonTitle);
          setDescription(res.homework.description || "");
          setInstructions(res.homework.instructions || "");
          setTotalMarks(res.homework.totalMarks || 100);
          setPassingMarks(res.homework.passingMarks ?? "");
          if (res.homework.deadline) {
            // Format to datetime-local string (YYYY-MM-DDTHH:mm)
            const d = new Date(res.homework.deadline);
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setDeadline(localIso);
          } else {
            setDeadline("");
          }
          setAllowLateSubmission(res.homework.allowLateSubmission);
          setMaxAttempts(res.homework.maxAttempts || 3);
          setStatus(res.homework.status as any);
          setAttachedMedia(res.homework.attachedMedia || []);
        } else {
          // Default initial instructions
          setInstructions(
            `### Task Overview\n1. Analyze the NIFTY/BANKNIFTY 15-minute timeframe chart for today's market session.\n2. Mark the liquidity grab zones, Fair Value Gaps (FVG), and order blocks.\n3. Take a screenshot of your chart analysis and upload it along with your trade rationale.\n\n### Deliverables\n- Chart Screenshot / PDF\n- Detailed text explanation of your entry, stoploss, and target rules.`
          );
        }
      } catch (err) {
        console.error("Failed to load homework:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHomework();
    return () => {
      isMounted = false;
    };
  }, [lessonId, lessonTitle]);

  const handleAttachMedia = (media: any) => {
    const isImg =
      media.mediaType === "IMAGE" ||
      media.mimeType?.startsWith("image/") ||
      Boolean(media.thumbnailUrl && !media.bunnyVideoId);

    const item: HomeworkAttachment = {
      mediaId: media.id,
      title: media.title || media.fileName || media.originalFileName || "Attached Resource",
      url: media.storageUrl || media.bunnyCdnUrl || media.thumbnailUrl || "",
      type: isImg ? "IMAGE" : "PDF",
      size: media.fileSize || 0,
    };
    setAttachedMedia([...attachedMedia, item]);
    setShowMediaPicker(false);
    toast.success(`Attached ${isImg ? "image/chart" : "PDF"} successfully!`);
  };

  const handleRemoveMedia = (idx: number) => {
    setAttachedMedia(attachedMedia.filter((_, i) => i !== idx));
  };

  const handleSaveHomework = () => {
    if (!title.trim()) {
      toast.error("Homework title is required.");
      return;
    }
    if (!instructions.trim()) {
      toast.error("Detailed instructions are required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: SaveHomeworkPayload = {
          title,
          description,
          instructions,
          totalMarks: Number(totalMarks) || 100,
          passingMarks: passingMarks === "" ? null : Number(passingMarks),
          deadline: deadline ? new Date(deadline).toISOString() : null,
          allowLateSubmission,
          maxAttempts: Number(maxAttempts) || 1,
          status,
          attachedMedia,
        };

        const res = await saveHomeworkAction(lessonId, payload);
        if (res.success) {
          toast.success("Homework saved successfully!");
          if (onSaveSuccess) onSaveSuccess();
          if (onClose) onClose();
        } else {
          toast.error("Failed to save homework");
        }
      } catch (err: any) {
        toast.error(err.message || "Error saving homework");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading Homework Builder...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-foreground">Homework / Assignment Details</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            >
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground">Homework Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Day 14: Order Flow & Liquidity Chart Assignment"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Short Summary / Purpose</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Practical exercise to identify liquidity grab zones before market open."
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Total Marks</label>
            <input
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value) || 100)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Passing Marks</label>
            <input
              type="number"
              min={0}
              placeholder="Optional"
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Submission Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Max Attempts</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2 border-t border-border/60 text-xs font-semibold">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowLateSubmission}
              onChange={(e) => setAllowLateSubmission(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Allow Late Submissions (marked as "Late")</span>
          </label>
        </div>
      </div>

      {/* Task Content / Detailed Instructions */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Task Instructions & Trading Exercise (Markdown Supported)
          </label>
        </div>

        <textarea
          rows={10}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Write the complete assignment details, guidelines, chart requirements, questions, and formatting rules..."
          className="w-full rounded-xl border border-input bg-background p-3.5 text-xs font-mono leading-relaxed focus:border-primary focus:outline-none"
        />
      </div>

      {/* Media Attachments Section */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Study Materials & Attachments
            </h4>
            <p className="text-[11px] text-muted-foreground">Attach reference charts (PNG/JPG), assignment PDFs, or templates.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMediaPickerType("IMAGE");
                setShowMediaPicker(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20 cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Attach Chart / Image
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaPickerType("PDF");
                setShowMediaPicker(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              Attach PDF
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaPickerType("DOCUMENT");
                setShowMediaPicker(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Media Library
            </button>
          </div>
        </div>

        {attachedMedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            No media attachments yet. Click <span className="text-foreground font-bold">"Attach Chart / Image"</span> or <span className="text-foreground font-bold">"Attach PDF"</span> to add reference study materials.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {attachedMedia.map((att, idx) => {
              const isImage = att.type === "IMAGE" || att.url?.match(/\.(png|jpg|jpeg|webp|gif|svg)/i);

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    {isImage ? (
                      <div className="h-9 w-9 rounded-lg overflow-hidden border border-border shrink-0 bg-black/40 flex items-center justify-center">
                        {att.url ? (
                          <img src={att.url} alt={att.title} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-sky-400" />
                        )}
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-lg border border-border shrink-0 bg-amber-500/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="truncate font-semibold text-foreground block">{att.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {isImage ? "Chart / Image" : "PDF Document"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="View Full Resource"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Remove Attachment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          mediaType={mediaPickerType}
          onSelect={handleAttachMedia}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleSaveHomework}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Homework Assignment
        </button>
      </div>
    </div>
  );
}
