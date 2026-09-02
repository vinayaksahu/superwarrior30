"use client";

import React, { useState } from "react";
import { useUploadManager } from "@/contexts/upload-manager-context";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Film,
  FileText,
  ImageIcon,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalUploadWidget() {
  const { uploads, activeCount, openManagerModal, isWidgetVisible, setIsWidgetVisible } = useUploadManager();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no uploads or explicitly closed and no active uploads, don't show
  if (!isWidgetVisible || uploads.length === 0) {
    return null;
  }

  // Find the most relevant active item to display in compact mode
  const activeItem =
    uploads.find((u) => u.status === "UPLOADING" || u.status === "REQUESTING") ||
    uploads.find((u) => u.status === "PROCESSING") ||
    uploads.find((u) => u.status === "QUEUED") ||
    uploads[uploads.length - 1];

  const completedCount = uploads.filter((u) => u.status === "READY").length;
  const failedCount = uploads.filter((u) => u.status === "FAILED").length;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-88 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {activeCount > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : failedCount > 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                {activeCount}
              </span>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {activeCount > 0
                ? `Uploading ${activeCount} file${activeCount > 1 ? "s" : ""}...`
                : failedCount > 0
                ? "Uploads with errors"
                : "All uploads complete"}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {completedCount} of {uploads.length} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsWidgetVisible(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            title="Dismiss widget"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body: Active item overview */}
      {!isCollapsed && activeItem && (
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
              {activeItem.mediaType === "VIDEO" ? (
                <Film className="h-3.5 w-3.5 text-primary" />
              ) : activeItem.mediaType === "PDF" ? (
                <FileText className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{activeItem.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  {activeItem.status === "UPLOADING"
                    ? `${activeItem.progress}%`
                    : activeItem.status === "PROCESSING"
                    ? "Processing..."
                    : activeItem.status === "READY"
                    ? "Ready"
                    : activeItem.status === "FAILED"
                    ? "Failed"
                    : "Queued"}
                </span>
                {activeItem.speed && <span>• {activeItem.speed}</span>}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {(activeItem.status === "UPLOADING" || activeItem.status === "REQUESTING") && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${activeItem.progress}%` }}
              />
            </div>
          )}

          {activeItem.status === "PROCESSING" && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full bg-amber-500 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Footer Action */}
      <div className="mt-3 flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={openManagerModal}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          View Upload Manager
        </button>

        <span className="text-[10px] text-muted-foreground font-mono">
          Background Sync Active
        </span>
      </div>
    </div>
  );
}
