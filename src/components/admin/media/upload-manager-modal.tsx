"use client";

import React, { useRef, useEffect } from "react";
import { useUploadManager, type UploadItem } from "@/contexts/upload-manager-context";
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  FileText,
  ImageIcon,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Minimize2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function UploadManagerModal() {
  const {
    uploads,
    activeCount,
    isManagerModalOpen,
    closeManagerModal,
    uploadFiles,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    removeUpload,
  } = useUploadManager();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isManagerModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeManagerModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isManagerModalOpen, closeManagerModal]);

  if (!isManagerModalOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const completedCount = uploads.filter((u) => u.status === "READY").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto cursor-pointer"
      onClick={closeManagerModal}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3 sm:py-4 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  Upload Manager
                </h3>
                {activeCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {activeCount} active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Uploads run in the background. You can minimize and continue working anywhere in the admin panel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={closeManagerModal}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer transition-colors"
              title="Minimize and continue working"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Minimize</span>
            </button>
            <button
              type="button"
              onClick={closeManagerModal}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close upload manager"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dropzone / Upload Action */}
        <div className="p-6 border-b border-border/60 bg-muted/20">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,application/pdf,image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/60 p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Drop videos, PDFs, or images here or <span className="text-primary underline">browse files</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Direct TUS multi-GB video uploads to Bunny Stream • PDFs & Images to Bunny Storage
            </p>
          </div>
        </div>

        {/* Uploads List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
            <span>
              Files ({uploads.length}) {completedCount > 0 && `• ${completedCount} ready`}
            </span>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer hover:underline"
              >
                Clear Completed
              </button>
            )}
          </div>

          {uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <UploadCloud className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No uploads in queue</p>
              <p className="text-xs text-muted-foreground">Select or drop files above to start background uploading.</p>
            </div>
          ) : (
            uploads.map((item) => {
              const isVideo = item.mediaType === "VIDEO";
              const isPdf = item.mediaType === "PDF";
              const isImage = item.mediaType === "IMAGE";

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {isVideo ? (
                          <Film className="h-5 w-5 text-primary" />
                        ) : isPdf ? (
                          <FileText className="h-5 w-5 text-amber-500" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-sky-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-foreground max-w-md">
                            {item.name}
                          </h4>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                            {item.mediaType}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                          <span>{formatBytes(item.size)}</span>

                          {item.bytesUploaded > 0 && item.status === "UPLOADING" && (
                            <span>
                              {formatBytes(item.bytesUploaded)} of {formatBytes(item.bytesTotal)} ({item.progress}%)
                            </span>
                          )}

                          {item.speed && <span>• {item.speed}</span>}

                          {item.estimatedTimeRemainingSec && item.estimatedTimeRemainingSec > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(item.estimatedTimeRemainingSec)} left
                            </span>
                          )}
                        </div>

                        {item.errorMessage && (
                          <p className="mt-1.5 text-xs font-medium text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status badge and Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "READY" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          READY
                        </span>
                      ) : item.status === "PROCESSING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          PROCESSING
                        </span>
                      ) : item.status === "UPLOADING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary border border-primary/30">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {item.progress}%
                        </span>
                      ) : item.status === "PAUSED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          <Pause className="h-3.5 w-3.5" />
                          PAUSED
                        </span>
                      ) : item.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive border border-destructive/30">
                          <AlertCircle className="h-3.5 w-3.5" />
                          FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          QUEUED
                        </span>
                      )}

                      {/* Control buttons */}
                      {item.status === "UPLOADING" && isVideo && (
                        <button
                          type="button"
                          onClick={() => pauseUpload(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Pause Upload"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}

                      {item.status === "PAUSED" && (
                        <button
                          type="button"
                          onClick={() => resumeUpload(item.id)}
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 cursor-pointer"
                          title="Resume Upload"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}

                      {item.status === "FAILED" && (
                        <button
                          type="button"
                          onClick={() => retryUpload(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      )}

                      {(item.status === "UPLOADING" || item.status === "REQUESTING" || item.status === "QUEUED") && (
                        <button
                          type="button"
                          onClick={() => cancelUpload(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive cursor-pointer transition-colors"
                          title="Cancel Upload"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {(item.status === "READY" || item.status === "FAILED" || item.status === "CANCELLED") && (
                        <button
                          type="button"
                          onClick={() => removeUpload(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Remove from list"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(item.status === "UPLOADING" || item.status === "PAUSED" || item.status === "REQUESTING") && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            item.status === "PAUSED" ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {item.status === "PROCESSING" && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-full bg-amber-500 animate-pulse" />
                      </div>
                      <p className="mt-1 text-[11px] text-amber-400 font-medium">
                        Bunny Stream is transcoding multi-resolution HLS streams. This is safe to close.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <p className="text-xs text-muted-foreground">
            {activeCount > 0 ? "Uploads will continue in the background." : "Uploads complete."}
          </p>

          <button
            type="button"
            onClick={closeManagerModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer transition-colors"
          >
            Minimize & Continue Working
          </button>
        </div>
      </div>
    </div>
  );
}
