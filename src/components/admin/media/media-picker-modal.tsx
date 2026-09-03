"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getMediaAssetsAction } from "@/server/actions/media.actions";
import { useUploadManager, type UploadItem } from "@/contexts/upload-manager-context";
import { MediaThumbnail } from "./media-thumbnail";
import {
  X,
  Search,
  Film,
  FileText,
  ImageIcon,
  CheckCircle2,
  UploadCloud,
  Loader2,
  Clock,
  HardDrive,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaPickerModalProps {
  mediaType?: "VIDEO" | "PDF" | "IMAGE" | "DOCUMENT" | "ALL";
  currentMediaId?: string | null;
  onSelect: (media: any) => Promise<void> | void;
  onClose: () => void;
  title?: string;
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
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function MediaPickerModal({
  mediaType = "ALL",
  currentMediaId,
  onSelect,
  onClose,
  title,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "IMAGE" | "PDF" | "VIDEO">(
    mediaType === "DOCUMENT" ? "ALL" : mediaType
  );
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(currentMediaId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFiles, openManagerModal } = useUploadManager();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const typeFilter = activeTab === "ALL" ? (mediaType === "DOCUMENT" ? undefined : undefined) : activeTab;
      const res = await getMediaAssetsAction({
        page: 1,
        pageSize: 50,
        mediaType: typeFilter as any,
        status: "READY", // ONLY READY media is selectable
        search: searchQuery,
        sort: "newest",
      });
      if (res.success && res.data) {
        // If DOCUMENT mode and ALL is active, filter out VIDEO
        if (mediaType === "DOCUMENT" && activeTab === "ALL") {
          setItems(res.data.filter((item: any) => item.mediaType === "PDF" || item.mediaType === "IMAGE"));
        } else {
          setItems(res.data);
        }
      }
    } catch (err) {
      console.error("Error loading media for picker:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, mediaType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedia(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, loadMedia]);

  const handleUploadNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadFiles(files, {
        onReady: async (uploadedItem: UploadItem) => {
          if (uploadedItem.mediaId) {
            // Auto select newly uploaded media when ready
            await loadMedia("");
            setSelectedId(uploadedItem.mediaId);
          }
        },
      });
      openManagerModal();
    }
  };

  const handleConfirmSelect = async (mediaItem?: any) => {
    const target = mediaItem || items.find((i) => i.id === selectedId);
    if (!target) return;

    setIsSubmitting(true);
    try {
      await onSelect(target);
      onClose();
    } catch (err) {
      console.error("Error in onSelect:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVideo = activeTab === "VIDEO";
  const isPdf = activeTab === "PDF";
  const isImage = activeTab === "IMAGE";

  const modalTitle =
    title ||
    (mediaType === "VIDEO"
      ? "Select Video from Media Library"
      : mediaType === "PDF"
      ? "Select PDF Document from Media Library"
      : mediaType === "IMAGE"
      ? "Select Image from Media Library"
      : "Select Media Resource from Media Library");

  const showTabs = mediaType === "ALL" || mediaType === "DOCUMENT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
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
              <h3 className="text-base font-bold text-foreground">{modalTitle}</h3>
              <p className="text-xs text-muted-foreground">
                Only READY and verified media assets are listed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Tabs (when ALL or DOCUMENT) */}
        {showTabs && (
          <div className="flex items-center gap-1.5 border-b border-border px-6 py-2 bg-muted/10">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Assets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("IMAGE")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                activeTab === "IMAGE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Images / Charts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PDF")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                activeTab === "PDF"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              PDFs / Documents
            </button>
            {mediaType === "ALL" && (
              <button
                type="button"
                onClick={() => setActiveTab("VIDEO")}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  activeTab === "VIDEO"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Videos
              </button>
            )}
          </div>
        )}

        {/* Action Bar: Search & Upload New */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === "ALL" ? "media" : activeTab.toLowerCase() + "s"} by name...`}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={
              activeTab === "VIDEO"
                ? "video/*"
                : activeTab === "PDF"
                ? "application/pdf"
                : activeTab === "IMAGE"
                ? "image/*"
                : "image/*,application/pdf,video/*"
            }
            className="hidden"
            onChange={handleUploadNew}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer transition-colors"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload New {activeTab === "VIDEO" ? "Video" : activeTab === "PDF" ? "PDF" : activeTab === "IMAGE" ? "Image" : "Media"}
          </button>
        </div>

        {/* Media Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs">Loading media assets...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              {isVideo ? (
                <Film className="h-9 w-9 text-muted-foreground/40" />
              ) : (
                <FileText className="h-9 w-9 text-muted-foreground/40" />
              )}
              <p className="text-xs font-semibold text-foreground">
                No READY {mediaType.toLowerCase()} assets found
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Upload a new file using the button above or wait for background transcoding to complete.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                      : "border-border bg-card hover:border-border/90 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black overflow-hidden border border-border/70">
                      <MediaThumbnail
                        mediaType={item.mediaType}
                        thumbnailUrl={item.thumbnailUrl}
                        fileName={item.fileName}
                        bunnyVideoId={item.bunnyVideoId}
                        status={item.status}
                        showPlayIcon={false}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-foreground max-w-md">
                          {item.fileName}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          READY
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatBytes(item.fileSize)}
                        </span>
                        {isVideo && item.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.duration)}
                          </span>
                        )}
                        {item.usageCount > 0 && (
                          <span className="text-primary font-sans font-semibold text-[10px]">
                            Used in {item.usageCount} lesson{item.usageCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmSelect(item);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-colors shadow-sm",
                        isSelected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border bg-card hover:bg-muted text-foreground"
                      )}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Selected
                        </>
                      ) : (
                        "Select"
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <p className="text-xs text-muted-foreground">
            {selectedId ? "1 asset selected." : "Select an asset from the list."}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedId || isSubmitting}
              onClick={() => handleConfirmSelect()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Attach Selected Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
