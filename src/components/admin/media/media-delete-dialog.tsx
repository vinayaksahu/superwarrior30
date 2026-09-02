"use client";

import React, { useState } from "react";
import { deleteMediaAssetAction } from "@/server/actions/media.actions";
import { AlertCircle, AlertTriangle, Trash2, X, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface MediaDeleteDialogProps {
  media: any | null;
  onClose: () => void;
  onDeleted: () => void;
  currentEnvironment?: string;
}

export function MediaDeleteDialog({
  media,
  onClose,
  onDeleted,
  currentEnvironment = "LIVE",
}: MediaDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockingUsages, setBlockingUsages] = useState<any[] | null>(null);

  if (!media) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteMediaAssetAction(media.id);
      if (!res.success) {
        if (res.isProtected && res.usedIn) {
          setBlockingUsages(res.usedIn);
        } else {
          toast.error(res.error || "Failed to delete media asset.");
        }
      } else {
        toast.success(res.message || "Media asset deleted successfully.");
        onDeleted();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting media asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  // If already identified as blocked by usage count
  const isUsed = media.usageCount > 0 || (blockingUsages && blockingUsages.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {isUsed ? (
          /* BLOCKED: Delete Protection */
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Cannot Delete Media</h3>
              <p className="text-xs text-muted-foreground">
                This media file is currently attached to course lessons. Remove it from the lessons before deleting.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Active Attachments:
              </p>
              {(blockingUsages || media.usages || []).map((u: any, idx: number) => (
                <div key={idx} className="rounded-lg bg-card p-2 border border-border/60">
                  <p className="font-bold text-foreground truncate">{u.courseTitle || "Course"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    → {u.lessonTitle || "Lesson"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
              >
                Understood, Close
              </button>
            </div>
          </div>
        ) : (
          /* UNUSED: Safe Deletion Confirmation */
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Delete Media Asset?</h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{media.fileName}&quot;</span>?
              </p>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 text-destructive font-semibold">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {currentEnvironment === "LIVE" ? "LIVE PRODUCTION" : "TEST ENVIRONMENT"}
                </span>
              </div>
              <p className="text-[11px]">
                This media is not used in any lessons and will be safely soft-deleted from the media library.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete Media"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
