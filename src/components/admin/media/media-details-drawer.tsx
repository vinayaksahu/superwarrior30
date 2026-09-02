"use client";

import React, { useState, useEffect } from "react";
import { getMediaAssetDetailsAction } from "@/server/actions/media.actions";
import {
  X,
  Film,
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  BookOpen,
  Layers,
  Calendar,
  User,
  HardDrive,
  Clock,
  FileCode,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface MediaDetailsDrawerProps {
  mediaId: string | null;
  onClose: () => void;
  onRequestDelete: (media: any) => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function MediaDetailsDrawer({
  mediaId,
  onClose,
  onRequestDelete,
}: MediaDetailsDrawerProps) {
  const [media, setMedia] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setMedia(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getMediaAssetDetailsAction(mediaId)
      .then((res) => {
        if (res.success && res.data) {
          setMedia(res.data);
        } else {
          setError(res.error || "Failed to load media details.");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load media details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [mediaId]);

  if (!mediaId) return null;

  const handleCopyId = () => {
    if (media?.id) {
      navigator.clipboard.writeText(media.id);
      toast.success("Media ID copied to clipboard!");
    }
  };

  const isVideo = media?.mediaType === "VIDEO";
  const isPdf = media?.mediaType === "PDF";
  const isImage = media?.mediaType === "IMAGE";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isVideo ? (
                <Film className="h-4.5 w-4.5" />
              ) : isPdf ? (
                <FileText className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <ImageIcon className="h-4.5 w-4.5 text-sky-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Media Asset Details</h3>
              <p className="text-[11px] text-muted-foreground font-mono">ID: {mediaId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs">Loading media asset...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-destructive">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : media ? (
            <>
              {/* Preview Box */}
              <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-md">
                {isVideo && media.playbackUrl ? (
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={media.playbackUrl}
                      loading="lazy"
                      className="h-full w-full border-0"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={media.fileName}
                    />
                  </div>
                ) : isVideo && media.bunnyVideoId ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 p-6 text-center bg-black/80">
                    <Film className="h-12 w-12 text-primary animate-pulse" />
                    <p className="text-sm font-bold text-foreground">{media.fileName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Bunny Video GUID: {media.bunnyVideoId}
                    </p>
                  </div>
                ) : isImage && (media.storageUrl || media.thumbnailUrl) ? (
                  <div className="relative aspect-video w-full bg-black/40 flex items-center justify-center p-2">
                    <img
                      src={media.storageUrl || media.thumbnailUrl}
                      alt={media.fileName}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                ) : isPdf ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center bg-amber-500/5">
                    <FileText className="h-12 w-12 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{media.fileName}</p>
                      <p className="text-xs text-muted-foreground">PDF Document ({formatBytes(media.fileSize)})</p>
                    </div>
                    {media.storageUrl && (
                      <a
                        href={media.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open PDF in New Tab
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-muted-foreground text-xs">
                    No preview available
                  </div>
                )}
              </div>

              {/* Title and Status */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground break-words">{media.fileName}</h2>
                    {media.originalFileName && media.originalFileName !== media.fileName && (
                      <p className="text-xs text-muted-foreground">Original: {media.originalFileName}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border shrink-0 ${
                      media.status === "READY"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : media.status === "PROCESSING"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : media.status === "FAILED"
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-primary/15 text-primary border-primary/30"
                    }`}
                  >
                    {media.status === "READY" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {media.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy Media ID
                </button>

                {media.storageUrl && (
                  <a
                    href={media.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    Open CDN URL
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onRequestDelete(media)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 cursor-pointer transition-colors ml-auto shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Media
                </button>
              </div>

              {/* Metadata Grid */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  File Specifications
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-[11px]">Size</p>
                      <p className="font-semibold text-foreground">{formatBytes(media.fileSize)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-[11px]">MIME Type</p>
                      <p className="font-semibold text-foreground font-mono">{media.mimeType || "—"}</p>
                    </div>
                  </div>

                  {isVideo && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-[11px]">Duration</p>
                        <p className="font-semibold text-foreground">{formatDuration(media.duration)}</p>
                      </div>
                    </div>
                  )}

                  {isPdf && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-[11px]">Pages</p>
                        <p className="font-semibold text-foreground">{media.pageCount || "1"}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-[11px]">Uploaded Date</p>
                      <p className="font-semibold text-foreground">
                        {new Date(media.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-[11px]">Uploaded By</p>
                      <p className="font-semibold text-foreground">
                        {media.uploadedBy?.name || media.uploadedBy?.email || "Admin"}
                      </p>
                    </div>
                  </div>
                </div>

                {media.bunnyVideoId && (
                  <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                    <span className="text-foreground font-semibold">Bunny Video ID:</span> {media.bunnyVideoId}
                  </div>
                )}

                {media.checksum && (
                  <div className="text-[11px] font-mono text-muted-foreground truncate">
                    <span className="text-foreground font-semibold">SHA-256:</span> {media.checksum}
                  </div>
                )}
              </div>

              {/* Usage Section */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Used In Course Lessons ({media.usageCount || 0})
                  </h4>
                </div>

                {media.usages && media.usages.length > 0 ? (
                  <div className="space-y-2">
                    {media.usages.map((u: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{u.courseTitle}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Layers className="h-3 w-3" />
                            {u.moduleTitle} → <span className="text-foreground font-medium">{u.lessonTitle}</span>
                          </p>
                        </div>

                        <Link
                          href={`/admin/courses/${u.courseId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
                        >
                          View Lesson
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    This media asset is not currently attached to any course lesson.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
