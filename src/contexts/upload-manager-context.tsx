"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import * as tus from "tus-js-client";
import { toast } from "sonner";
import { BUNNY_VIDEO_POLL_INTERVAL } from "@/lib/constants";

export type UploadMediaType = "VIDEO" | "PDF" | "IMAGE" | "OTHER";
export type UploadTaskStatus =
  | "QUEUED"
  | "REQUESTING"
  | "UPLOADING"
  | "PAUSED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "CANCELLED";

export interface UploadItem {
  id: string;
  mediaId?: string;
  file: File;
  name: string;
  size: number;
  mediaType: UploadMediaType;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed: string | null;
  estimatedTimeRemainingSec: number | null;
  status: UploadTaskStatus;
  errorMessage: string | null;
  bunnyVideoId?: string | null;
  storageUrl?: string | null;
  storageKey?: string | null;
  isReady: boolean;
  createdAt: number;
  lastProgressTime?: number;
  lastBytes?: number;
  tusUpload?: tus.Upload | null;
  xhr?: XMLHttpRequest | null;
  pollInterval?: NodeJS.Timeout | null;
}

interface UploadManagerContextType {
  uploads: UploadItem[];
  activeCount: number;
  isManagerModalOpen: boolean;
  isWidgetVisible: boolean;
  openManagerModal: () => void;
  closeManagerModal: () => void;
  toggleManagerModal: () => void;
  setIsWidgetVisible: (visible: boolean) => void;
  uploadFiles: (files: File[], options?: { autoAttachToLessonId?: string; onReady?: (item: UploadItem) => void }) => Promise<void>;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearCompleted: () => void;
  removeUpload: (id: string) => void;
}

const UploadManagerContext = createContext<UploadManagerContextType | null>(null);

const MAX_CONCURRENT_UPLOADS = 3;

function detectMediaType(file: File): UploadMediaType {
  const type = file.type?.toLowerCase() || "";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (
    type.startsWith("video/") ||
    ["mp4", "webm", "mov", "mkv", "avi", "m4v"].includes(ext)
  ) {
    return "VIDEO";
  }

  if (type === "application/pdf" || ext === "pdf") {
    return "PDF";
  }

  if (
    type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)
  ) {
    return "IMAGE";
  }

  return "OTHER";
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState<boolean>(true);

  // References to keep non-state mutable objects (TUS uploads, XHRs, Poll timers)
  const tusUploadsMap = useRef<Map<string, tus.Upload>>(new Map());
  const xhrsMap = useRef<Map<string, XMLHttpRequest>>(new Map());
  const pollTimersMap = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const callbacksMap = useRef<Map<string, (item: UploadItem) => void>>(new Map());

  // Count active uploads
  const activeCount = uploads.filter(
    (u) => u.status === "REQUESTING" || u.status === "UPLOADING" || u.status === "PROCESSING"
  ).length;

  const updateUploadItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // Poll Bunny Stream video processing status
  const startStatusPolling = useCallback(
    (id: string, mediaId: string) => {
      if (pollTimersMap.current.has(id)) {
        clearInterval(pollTimersMap.current.get(id)!);
      }

      const poll = async () => {
        try {
          const res = await fetch(`/api/admin/media/status/${mediaId}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.isReady || data.status === "READY") {
            // Processing Complete!
            if (pollTimersMap.current.has(id)) {
              clearInterval(pollTimersMap.current.get(id)!);
              pollTimersMap.current.delete(id);
            }

            updateUploadItem(id, {
              status: "READY",
              isReady: true,
              progress: 100,
            });

            toast.success(`✓ Media Ready: Transcoding completed for video!`);

            const cb = callbacksMap.current.get(id);
            if (cb) {
              setUploads((curr) => {
                const updatedItem = curr.find((u) => u.id === id);
                if (updatedItem) cb(updatedItem);
                return curr;
              });
            }
          } else if (data.status === "FAILED") {
            if (pollTimersMap.current.has(id)) {
              clearInterval(pollTimersMap.current.get(id)!);
              pollTimersMap.current.delete(id);
            }

            updateUploadItem(id, {
              status: "FAILED",
              errorMessage: data.errorMessage || "Video processing failed on Bunny Stream.",
            });

            toast.error(`⚠ Processing Failed on Bunny Stream.`);
          }
        } catch {}
      };

      // Initial check after 1.5s
      setTimeout(poll, 1500);
      const timer = setInterval(poll, BUNNY_VIDEO_POLL_INTERVAL || 5000);
      pollTimersMap.current.set(id, timer);
    },
    [updateUploadItem]
  );

  // Execute Direct TUS Video Upload to Bunny Stream
  const executeVideoUpload = useCallback(
    async (item: UploadItem) => {
      updateUploadItem(item.id, { status: "REQUESTING", errorMessage: null, progress: 0 });

      try {
        // Step 1: Create media session & authorize Bunny direct upload
        const sessionRes = await fetch("/api/admin/media/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: item.file.name,
            originalFileName: item.file.name,
            mediaType: "VIDEO",
            mimeType: item.file.type || "video/mp4",
            fileSize: item.file.size,
          }),
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.success) {
          throw new Error(sessionData.error || "Failed to initialize video upload session.");
        }

        const { mediaId, uploadAuth } = sessionData;
        const { videoId, libraryId, expirationTime, signature, endpoint } = uploadAuth;

        updateUploadItem(item.id, {
          mediaId,
          bunnyVideoId: videoId,
          status: "UPLOADING",
          lastProgressTime: Date.now(),
          lastBytes: 0,
        });

        // Step 2: Initialize TUS Direct Upload
        await new Promise<void>((resolve, reject) => {
          let lastTime = Date.now();
          let lastUploaded = 0;

          const upload = new tus.Upload(item.file, {
            endpoint: endpoint || "https://video.bunnycdn.com/tusupload",
            retryDelays: [0, 1000, 3000, 5000, 10000],
            chunkSize: 5 * 1024 * 1024, // 5MB chunk
            removeFingerprintOnSuccess: true,
            fingerprint: () => Promise.resolve(`bunny_media_${videoId}`),
            headers: {
              AuthorizationSignature: signature,
              AuthorizationExpire: String(expirationTime),
              VideoId: videoId,
              LibraryId: String(libraryId),
            },
            metadata: {
              title: item.file.name,
              filetype: item.file.type || "video/mp4",
            },
            onError: (error: any) => {
              console.error("Direct Bunny Video TUS Upload Error:", error);
              const status = error?.originalResponse?.getStatus?.();
              const errStr = error?.message || String(error);
              if (status) {
                reject(new Error(`Bunny Stream Error (HTTP ${status})`));
              } else {
                reject(new Error(errStr || "Direct video upload failed."));
              }
            },
            onProgress: (bytesSent, bytesTotal) => {
              const pct = Math.min(100, Math.round((bytesSent / bytesTotal) * 100));
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;

              let speedStr: string | null = null;
              let etaSec: number | null = null;

              if (timeDiff >= 0.5) {
                const bytesDiff = bytesSent - lastUploaded;
                const speedBytes = bytesDiff / timeDiff;
                speedStr = `${formatBytes(speedBytes)}/s`;
                if (speedBytes > 0) {
                  etaSec = Math.round((bytesTotal - bytesSent) / speedBytes);
                }
                lastTime = now;
                lastUploaded = bytesSent;
              }

              updateUploadItem(item.id, {
                progress: pct,
                bytesUploaded: bytesSent,
                bytesTotal,
                speed: speedStr,
                estimatedTimeRemainingSec: etaSec,
              });
            },
            onSuccess: () => {
              resolve();
            },
          });

          tusUploadsMap.current.set(item.id, upload);
          upload.start();
        });

        // Step 3: Direct binary upload finished!
        tusUploadsMap.current.delete(item.id);
        updateUploadItem(item.id, {
          progress: 100,
          status: "PROCESSING",
          speed: null,
          estimatedTimeRemainingSec: null,
        });

        // Step 4: Notify server upload is complete & start polling transcoding
        await fetch("/api/admin/media/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            mediaId,
            bunnyVideoId: videoId,
          }),
        }).catch(() => {});

        toast.info(`✓ "${item.name}" uploaded. Transcoding in background...`);
        startStatusPolling(item.id, mediaId);
      } catch (err: any) {
        console.error("Video Upload Execution Error:", err);
        const msg = err instanceof Error ? err.message : "Video upload failed";
        updateUploadItem(item.id, {
          status: "FAILED",
          errorMessage: msg,
          speed: null,
          estimatedTimeRemainingSec: null,
        });
        toast.error(`⚠ Upload Failed: ${msg}`);
      }
    },
    [updateUploadItem, startStatusPolling]
  );

  // Execute Standard PDF / Image Upload to Bunny Storage
  const executeStorageUpload = useCallback(
    async (item: UploadItem) => {
      updateUploadItem(item.id, { status: "REQUESTING", errorMessage: null, progress: 0 });

      try {
        // Step 1: Create media session
        const sessionRes = await fetch("/api/admin/media/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: item.file.name,
            originalFileName: item.file.name,
            mediaType: item.mediaType,
            mimeType: item.file.type,
            fileSize: item.file.size,
          }),
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.success) {
          throw new Error(sessionData.error || "Failed to initialize upload session.");
        }

        const { mediaId, storageKey } = sessionData;

        updateUploadItem(item.id, {
          mediaId,
          storageKey,
          status: "UPLOADING",
        });

        // Step 2: Upload file with XHR progress
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("mediaId", mediaId);
        if (storageKey) formData.append("storageKey", storageKey);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrsMap.current.set(item.id, xhr);

          let lastTime = Date.now();
          let lastLoaded = 0;

          xhr.open("POST", "/api/admin/media/upload-file");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;

              let speedStr: string | null = null;
              let etaSec: number | null = null;

              if (timeDiff >= 0.5) {
                const bytesDiff = event.loaded - lastLoaded;
                const speedBytes = bytesDiff / timeDiff;
                speedStr = `${formatBytes(speedBytes)}/s`;
                if (speedBytes > 0) {
                  etaSec = Math.round((event.total - event.loaded) / speedBytes);
                }
                lastTime = now;
                lastLoaded = event.loaded;
              }

              updateUploadItem(item.id, {
                progress: pct,
                bytesUploaded: event.loaded,
                bytesTotal: event.total,
                speed: speedStr,
                estimatedTimeRemainingSec: etaSec,
              });
            }
          };

          xhr.onload = () => {
            xhrsMap.current.delete(item.id);
            try {
              const res = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && res.success) {
                updateUploadItem(item.id, {
                  status: "READY",
                  isReady: true,
                  progress: 100,
                  storageUrl: res.cdnUrl,
                  speed: null,
                  estimatedTimeRemainingSec: null,
                });
                toast.success(`✓ "${item.name}" uploaded successfully!`);
                const cb = callbacksMap.current.get(item.id);
                if (cb) {
                  setUploads((curr) => {
                    const updated = curr.find((u) => u.id === item.id);
                    if (updated) cb(updated);
                    return curr;
                  });
                }
                resolve();
              } else {
                reject(new Error(res.error || `Upload failed (Status ${xhr.status})`));
              }
            } catch {
              reject(new Error(`Server error (${xhr.status})`));
            }
          };

          xhr.onerror = () => {
            xhrsMap.current.delete(item.id);
            reject(new Error("Network connection error during file upload."));
          };

          xhr.send(formData);
        });
      } catch (err: any) {
        console.error("Storage upload error:", err);
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateUploadItem(item.id, {
          status: "FAILED",
          errorMessage: msg,
          speed: null,
          estimatedTimeRemainingSec: null,
        });
        toast.error(`⚠ Upload Failed: ${msg}`);
      }
    },
    [updateUploadItem]
  );

  // Upload Queue Worker (Enforces concurrency limit)
  useEffect(() => {
    const running = uploads.filter(
      (u) => u.status === "REQUESTING" || u.status === "UPLOADING"
    ).length;

    if (running >= MAX_CONCURRENT_UPLOADS) return;

    const nextQueued = uploads.find((u) => u.status === "QUEUED");
    if (!nextQueued) return;

    if (nextQueued.mediaType === "VIDEO") {
      executeVideoUpload(nextQueued);
    } else {
      executeStorageUpload(nextQueued);
    }
  }, [uploads, executeVideoUpload, executeStorageUpload]);

  // Upload multiple files
  const uploadFiles = useCallback(
    async (
      files: File[],
      options?: { autoAttachToLessonId?: string; onReady?: (item: UploadItem) => void }
    ) => {
      if (!files || files.length === 0) return;

      const newItems: UploadItem[] = files.map((file) => {
        const id = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        if (options?.onReady) {
          callbacksMap.current.set(id, options.onReady);
        }

        return {
          id,
          file,
          name: file.name,
          size: file.size,
          mediaType: detectMediaType(file),
          progress: 0,
          bytesUploaded: 0,
          bytesTotal: file.size,
          speed: null,
          estimatedTimeRemainingSec: null,
          status: "QUEUED",
          errorMessage: null,
          isReady: false,
          createdAt: Date.now(),
        };
      });

      setUploads((prev) => [...prev, ...newItems]);
      setIsWidgetVisible(true);
      toast.info(`Upload started for ${files.length} file${files.length > 1 ? "s" : ""}.`);
    },
    []
  );

  const pauseUpload = useCallback(
    (id: string) => {
      const tusUpload = tusUploadsMap.current.get(id);
      if (tusUpload) {
        tusUpload.abort();
        updateUploadItem(id, { status: "PAUSED", speed: null });
        toast.info("Upload paused.");
      }
    },
    [updateUploadItem]
  );

  const resumeUpload = useCallback(
    (id: string) => {
      const tusUpload = tusUploadsMap.current.get(id);
      if (tusUpload) {
        tusUpload.start();
        updateUploadItem(id, { status: "UPLOADING" });
        toast.info("Resuming upload...");
      } else {
        const item = uploads.find((u) => u.id === id);
        if (item) {
          if (item.mediaType === "VIDEO") executeVideoUpload(item);
          else executeStorageUpload(item);
        }
      }
    },
    [uploads, updateUploadItem, executeVideoUpload, executeStorageUpload]
  );

  const cancelUpload = useCallback(
    (id: string) => {
      const tusUpload = tusUploadsMap.current.get(id);
      if (tusUpload) {
        tusUpload.abort();
        tusUploadsMap.current.delete(id);
      }
      const xhr = xhrsMap.current.get(id);
      if (xhr) {
        xhr.abort();
        xhrsMap.current.delete(id);
      }
      if (pollTimersMap.current.has(id)) {
        clearInterval(pollTimersMap.current.get(id)!);
        pollTimersMap.current.delete(id);
      }
      updateUploadItem(id, { status: "CANCELLED", speed: null, estimatedTimeRemainingSec: null });
      toast.info("Upload cancelled.");
    },
    [updateUploadItem]
  );

  const retryUpload = useCallback(
    (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (!item) return;

      updateUploadItem(id, {
        status: "QUEUED",
        progress: 0,
        bytesUploaded: 0,
        errorMessage: null,
        speed: null,
        estimatedTimeRemainingSec: null,
      });
    },
    [uploads, updateUploadItem]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "READY" && u.status !== "CANCELLED"));
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const openManagerModal = () => setIsManagerModalOpen(true);
  const closeManagerModal = () => setIsManagerModalOpen(false);
  const toggleManagerModal = () => setIsManagerModalOpen((prev) => !prev);

  return (
    <UploadManagerContext.Provider
      value={{
        uploads,
        activeCount,
        isManagerModalOpen,
        isWidgetVisible,
        openManagerModal,
        closeManagerModal,
        toggleManagerModal,
        setIsWidgetVisible,
        uploadFiles,
        pauseUpload,
        resumeUpload,
        cancelUpload,
        retryUpload,
        clearCompleted,
        removeUpload,
      }}
    >
      {children}
    </UploadManagerContext.Provider>
  );
}

export function useUploadManager() {
  const context = useContext(UploadManagerContext);
  if (!context) {
    throw new Error("useUploadManager must be used within an UploadManagerProvider");
  }
  return context;
}
