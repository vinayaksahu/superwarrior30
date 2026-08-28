"use client";

import { useState, useTransition } from "react";
import { getLessonPreviewMediaUrlAction } from "@/server/actions/course.actions";
import { Eye, X, Loader2, Play, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FreePreviewModalProps {
  lessonId: string;
  lessonTitle: string;
  contentType: string;
}

export function FreePreviewButton({
  lessonId,
  lessonTitle,
  contentType,
}: FreePreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaData, setMediaData] = useState<{
    lesson: {
      id: string;
      title: string;
      contentType: string;
      textContent: string | null;
    };
    signedUrl: string | null;
    provider?: string;
    bunnyVideoId?: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setIsOpen(true);
    if (!mediaData) {
      startTransition(async () => {
        try {
          const res = await getLessonPreviewMediaUrlAction(lessonId);
          setMediaData(res);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to load preview";
          toast.error(msg);
        }
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Free Preview
                </span>
                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate max-w-md">
                  {lessonTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {isPending ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating secure preview stream...</p>
                </div>
              ) : mediaData?.signedUrl && contentType === "VIDEO" ? (
                mediaData.provider === "BUNNY" || mediaData.bunnyVideoId ? (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner">
                    <iframe
                      src={mediaData.signedUrl}
                      loading="lazy"
                      className="h-full w-full border-0"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={lessonTitle}
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner">
                    <video
                      src={mediaData.signedUrl}
                      controls
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      autoPlay
                      className="h-full w-full object-contain"
                    />
                  </div>
                )
              ) : mediaData?.signedUrl && contentType === "PDF" ? (
                <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`${mediaData.signedUrl}#toolbar=0`}
                    className="h-full w-full"
                    title={lessonTitle}
                  />
                </div>
              ) : mediaData?.lesson?.textContent && contentType === "TEXT" ? (
                <div className="prose prose-invert max-w-none max-h-96 overflow-y-auto whitespace-pre-wrap p-4 rounded-lg bg-muted/30 text-sm leading-relaxed">
                  {mediaData.lesson.textContent}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No media uploaded for this preview lesson yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
