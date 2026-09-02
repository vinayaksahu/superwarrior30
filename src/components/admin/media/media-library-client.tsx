"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getMediaAssetsAction } from "@/server/actions/media.actions";
import { useUploadManager } from "@/contexts/upload-manager-context";
import { MediaDetailsDrawer } from "./media-details-drawer";
import { MediaDeleteDialog } from "./media-delete-dialog";
import {
  UploadCloud,
  Search,
  Film,
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  Clock,
  HardDrive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface MediaLibraryClientProps {
  initialEnvironment: string;
}

export function MediaLibraryClient({ initialEnvironment }: MediaLibraryClientProps) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(18);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [mediaType, setMediaType] = useState<"ALL" | "VIDEO" | "PDF" | "IMAGE">("ALL");
  const [status, setStatus] = useState<"ALL" | "READY" | "PROCESSING" | "UPLOADING" | "FAILED">("ALL");
  const [usage, setUsage] = useState<"ALL" | "USED" | "UNUSED">("ALL");
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Drawers & Modals
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<any | null>(null);

  const { uploadFiles, openManagerModal } = useUploadManager();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMediaAssetsAction({
        page,
        pageSize,
        mediaType,
        status,
        usage,
        search,
        sort,
      });

      if (res.success && res.data) {
        setItems(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else {
        toast.error(res.error || "Failed to load media assets");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load media library");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, mediaType, status, usage, search, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssets();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadFiles(files);
      openManagerModal();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success("Media ID copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Media Library</h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                initialEnvironment === "TEST"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              )}
            >
              {initialEnvironment === "TEST" ? "TEST ENVIRONMENT" : "LIVE PRODUCTION"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage reusable course media (videos, PDFs, images) before attaching to lessons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,application/pdf,image/*"
            className="hidden"
            onChange={handleUploadFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="h-4 w-4" />
            + Upload Media
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
        {/* Top Controls: Search, Sort, View Toggle */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by filename, original name, ID..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sorting */}
            <select
              value={sort}
              onChange={(e: any) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="size_desc">Largest Size</option>
              <option value="size_asc">Smallest Size</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-lg p-1.5 transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "rounded-lg p-1.5 transition-colors cursor-pointer",
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={fetchAssets}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors shadow-sm"
              title="Refresh Media List"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/60 text-xs">
          {/* Media Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-semibold text-[11px] mr-1">Type:</span>
            {(["ALL", "VIDEO", "PDF", "IMAGE"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setMediaType(t);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                  mediaType === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t === "ALL" ? "All Types" : t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-semibold text-[11px] mr-1">Status:</span>
            {(["ALL", "READY", "PROCESSING", "UPLOADING", "FAILED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                  status === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {s === "ALL" ? "All Statuses" : s}
              </button>
            ))}
          </div>

          {/* Usage Filter */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-semibold text-[11px] mr-1">Usage:</span>
            {(["ALL", "USED", "UNUSED"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  setUsage(u);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                  usage === u
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {u === "ALL" ? "All Usage" : u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Media Grid / Table Content */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading media library assets...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <UploadCloud className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No media assets found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search || mediaType !== "ALL" || status !== "ALL" || usage !== "ALL"
              ? "Try adjusting your filters or search terms."
              : "Upload videos, PDFs, and images to build your reusable media library."}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Media Now
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => {
            const isVideo = item.mediaType === "VIDEO";
            const isPdf = item.mediaType === "PDF";
            const isImage = item.mediaType === "IMAGE";

            return (
              <div
                key={item.id}
                onClick={() => setActiveDetailsId(item.id)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md cursor-pointer"
              >
                {/* Thumbnail / Preview Area */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/60 flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.fileName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : isVideo ? (
                    <Film className="h-8 w-8 text-primary" />
                  ) : isPdf ? (
                    <FileText className="h-8 w-8 text-amber-500" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-sky-400" />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/10">
                      {item.mediaType}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-md border",
                        item.status === "READY"
                          ? "bg-emerald-500/90 text-black border-emerald-400"
                          : item.status === "PROCESSING"
                          ? "bg-amber-500/90 text-black border-amber-400"
                          : item.status === "FAILED"
                          ? "bg-destructive/90 text-white border-destructive"
                          : "bg-primary/90 text-black border-primary"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Duration Badge for Videos */}
                  {isVideo && item.duration > 0 && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white border border-white/10">
                      {formatDuration(item.duration)}
                    </div>
                  )}

                  {/* Page Count Badge for PDFs */}
                  {isPdf && item.pageCount > 0 && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white border border-white/10">
                      {item.pageCount} pages
                    </div>
                  )}
                </div>

                {/* Card Info Body */}
                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <h4 className="truncate text-xs font-bold text-foreground" title={item.fileName}>
                      {item.fileName}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                      {formatBytes(item.fileSize)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
                    <span
                      className={cn(
                        "font-semibold",
                        item.usageCount > 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {item.usageCount > 0
                        ? `Used in ${item.usageCount} lesson${item.usageCount > 1 ? "s" : ""}`
                        : "Unused"}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, item.id)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy Media ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">File Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded Date</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setActiveDetailsId(item.id)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {item.mediaType === "VIDEO" ? (
                            <Film className="h-4 w-4 text-primary" />
                          ) : item.mediaType === "PDF" ? (
                            <FileText className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-sky-400" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-bold text-foreground">{item.fileName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {item.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-muted-foreground">
                      {item.mediaType}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {formatBytes(item.fileSize)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                          item.status === "READY"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : item.status === "PROCESSING"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : item.status === "FAILED"
                            ? "bg-destructive/15 text-destructive border-destructive/30"
                            : "bg-primary/15 text-primary border-primary/30"
                        )}
                      >
                        {item.status === "READY" && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-semibold",
                          item.usageCount > 0 ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {item.usageCount > 0 ? `Used in ${item.usageCount}` : "Unused"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Copy Media ID"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaToDelete(item);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive cursor-pointer"
                          title="Delete Media"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} media assets
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-xs font-bold text-foreground px-2">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer shadow-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Media Details Drawer */}
      <MediaDetailsDrawer
        mediaId={activeDetailsId}
        onClose={() => setActiveDetailsId(null)}
        onRequestDelete={(media) => {
          setActiveDetailsId(null);
          setMediaToDelete(media);
        }}
      />

      {/* Media Delete Dialog */}
      <MediaDeleteDialog
        media={mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onDeleted={() => fetchAssets()}
        currentEnvironment={initialEnvironment}
      />
    </div>
  );
}
