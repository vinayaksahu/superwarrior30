"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileIcon, X, Film, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import { BUNNY_VIDEO_POLL_INTERVAL } from "@/lib/constants";

interface UploadResult {
  key: string | null;
  bunnyVideoId: string | null;
  cdnUrl: string | null;
  provider: "R2" | "BUNNY";
}

interface FileUploaderProps {
  category: "video" | "pdf" | "thumbnail" | "image";
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  currentKey?: string | null;
  currentBunnyVideoId?: string | null;
  onUploadComplete: (result: UploadResult) => Promise<void> | void;
  accept?: string;
  label?: string;
  description?: string;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function FileUploader({
  category,
  courseId,
  moduleId,
  lessonId,
  currentKey,
  currentBunnyVideoId,
  onUploadComplete,
  accept,
  label = "Upload File",
  description,
}: FileUploaderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<number>(0);
  const [bytesTotal, setBytesTotal] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "uploading" | "paused" | "saving" | "encoding" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [encodingProgress, setEncodingProgress] = useState<number>(0);
  const [encodingVideoId, setEncodingVideoId] = useState<string | null>(currentBunnyVideoId || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const encodingPollRef = useRef<NodeJS.Timeout | null>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const lastProgressTimeRef = useRef<number>(0);
  const lastBytesRef = useRef<number>(0);

  const defaultAccept = (() => {
    if (accept) return accept;
    switch (category) {
      case "video":
        return "video/mp4,video/webm,video/quicktime";
      case "pdf":
        return "application/pdf";
      case "thumbnail":
      case "image":
        return "image/jpeg,image/png,image/webp";
    }
  })();

  // Poll Bunny video encoding status
  const pollEncodingStatus = useCallback(async (guid: string) => {
    try {
      const res = await fetch(`/api/bunny/video-status/${guid}`);
      const data = await res.json();

      if (!data.success) return;

      setEncodingProgress(data.encodeProgress || 0);

      if (data.isReady) {
        setStatus("completed");
        setEncodingProgress(100);
        if (encodingPollRef.current) {
          clearInterval(encodingPollRef.current);
          encodingPollRef.current = null;
        }
        toast.success("Video encoding complete! Ready for playback.");
      } else if (data.status === "FAILED") {
        setStatus("error");
        setErrorMessage("Video encoding failed on Bunny Stream. Please re-upload.");
        if (encodingPollRef.current) {
          clearInterval(encodingPollRef.current);
          encodingPollRef.current = null;
        }
      }
    } catch {
      // Silently continue polling
    }
  }, []);

  // Poll timer for encoding state
  useEffect(() => {
    if (status === "encoding" && encodingVideoId) {
      const timer = setTimeout(() => {
        pollEncodingStatus(encodingVideoId);
      }, 500);

      encodingPollRef.current = setInterval(() => {
        pollEncodingStatus(encodingVideoId);
      }, BUNNY_VIDEO_POLL_INTERVAL);

      return () => {
        clearTimeout(timer);
        if (encodingPollRef.current) {
          clearInterval(encodingPollRef.current);
          encodingPollRef.current = null;
        }
      };
    }
  }, [status, encodingVideoId, pollEncodingStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (encodingPollRef.current) {
        clearInterval(encodingPollRef.current);
      }
      if (tusUploadRef.current) {
        tusUploadRef.current.abort();
      }
    };
  }, []);

  // Direct TUS upload for videos (bypasses Next.js server)
  const handleDirectBunnyVideoUpload = async (file: File) => {
    setStatus("requesting");
    setProgress(0);
    setErrorMessage(null);
    setFileName(file.name);
    setBytesTotal(file.size);
    setBytesUploaded(0);
    setUploadSpeed(null);

    try {
      // Step 1: Request upload signature from server (server authenticates admin & creates video entry)
      const authRes = await fetch("/api/bunny/create-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""),
          filename: file.name,
          fileSize: file.size,
          courseId,
          lessonId,
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok || !authData.success) {
        throw new Error(authData.error || "Failed to authorize video upload to Bunny Stream.");
      }

      const { videoId, libraryId, expirationTime, signature, endpoint } = authData;

      // Step 2: Direct browser-to-Bunny TUS upload (supports multi-GB chunked & resumable upload)
      setStatus("uploading");
      lastProgressTimeRef.current = Date.now();
      lastBytesRef.current = 0;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          chunkSize: 5 * 1024 * 1024, // 5MB chunks for optimal browser throughput
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expirationTime),
            VideoId: videoId,
            LibraryId: String(libraryId),
          },
          metadata: {
            filename: file.name,
            filetype: file.type || "video/mp4",
          },
          onError: (error) => {
            console.error("TUS Direct Video Upload Error:", error);
            reject(new Error(error.message || "Direct video upload failed"));
          },
          onProgress: (bytesSent, bytesTotalSize) => {
            setBytesUploaded(bytesSent);
            setBytesTotal(bytesTotalSize);
            const pct = Math.round((bytesSent / bytesTotalSize) * 100);
            setProgress(pct);

            // Calculate upload speed
            const now = Date.now();
            const timeDiff = (now - lastProgressTimeRef.current) / 1000;
            if (timeDiff >= 0.5) {
              const bytesDiff = bytesSent - lastBytesRef.current;
              const speedBytesPerSec = bytesDiff / timeDiff;
              setUploadSpeed(`${formatBytes(speedBytesPerSec)}/s`);
              lastProgressTimeRef.current = now;
              lastBytesRef.current = bytesSent;
            }
          },
          onSuccess: () => {
            resolve();
          },
        });

        tusUploadRef.current = upload;
        upload.start();
      });

      // Step 3: Direct upload binary complete! Notify parent component & save to DB
      setStatus("saving");
      setProgress(100);

      const uploadResult: UploadResult = {
        key: null,
        bunnyVideoId: videoId,
        cdnUrl: null,
        provider: "BUNNY",
      };

      await onUploadComplete(uploadResult);

      // Step 4: Video uploaded to Bunny Stream, start monitoring encoding
      setEncodingVideoId(videoId);
      setStatus("encoding");
      setEncodingProgress(0);
      toast.success("Video uploaded directly to Bunny Stream! Encoding started...");
    } catch (err: unknown) {
      console.error("Video upload error:", err);
      const msg = err instanceof Error ? err.message : "Video upload failed";
      setStatus("error");
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  // Standard upload for PDFs, images, and thumbnails
  const handleStandardUpload = async (file: File) => {
    setStatus("uploading");
    setProgress(10);
    setErrorMessage(null);
    setFileName(file.name);
    setBytesTotal(file.size);
    setBytesUploaded(0);
    setUploadSpeed(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("courseId", courseId);
      if (moduleId) formData.append("moduleId", moduleId);
      if (lessonId) formData.append("lessonId", lessonId);

      const uploadPromise = new Promise<{
        success: boolean;
        key: string | null;
        bunnyVideoId: string | null;
        cdnUrl: string | null;
        provider: "R2" | "BUNNY";
        error?: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setBytesUploaded(event.loaded);
            setBytesTotal(event.total);
            const percent = Math.round((event.loaded / event.total) * 85) + 10;
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              setProgress(95);
              resolve(json);
            } else {
              reject(new Error(json.error || `Upload failed with status ${xhr.status}`));
            }
          } catch {
            if (xhr.status === 413) {
              reject(new Error("File exceeds server payload limit (413). Please upload a smaller file."));
            } else {
              reject(new Error(`Server returned unexpected response (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during file upload"));
        xhr.send(formData);
      });

      const res = await uploadPromise;

      if (!res.success) {
        throw new Error("File upload failed");
      }

      setStatus("saving");
      const uploadResult: UploadResult = {
        key: res.key,
        bunnyVideoId: res.bunnyVideoId,
        cdnUrl: res.cdnUrl,
        provider: res.provider || "R2",
      };

      await onUploadComplete(uploadResult);
      setProgress(100);
      setStatus("completed");
      toast.success(`${label} uploaded successfully!`);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      setStatus("error");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = "";

    // Route videos to direct TUS upload (bypasses Next.js server body limit)
    if (category === "video") {
      await handleDirectBunnyVideoUpload(file);
    } else {
      await handleStandardUpload(file);
    }
  };

  const togglePauseResume = () => {
    if (!tusUploadRef.current) return;
    if (status === "uploading") {
      tusUploadRef.current.abort();
      setStatus("paused");
      toast.info("Video upload paused");
    } else if (status === "paused") {
      tusUploadRef.current.start();
      setStatus("uploading");
      toast.info("Resuming video upload...");
    }
  };

  const resetUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    if (encodingPollRef.current) {
      clearInterval(encodingPollRef.current);
      encodingPollRef.current = null;
    }
    setStatus("idle");
    setProgress(0);
    setBytesUploaded(0);
    setBytesTotal(0);
    setUploadSpeed(null);
    setErrorMessage(null);
    setFileName(null);
    setEncodingProgress(0);
    setEncodingVideoId(null);
  };

  const hasExistingFile = currentKey || currentBunnyVideoId;

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 transition-colors hover:border-primary/40">
      <input
        ref={fileInputRef}
        type="file"
        accept={defaultAccept}
        className="hidden"
        onChange={handleFileChange}
        disabled={status === "requesting" || status === "uploading" || status === "saving" || status === "encoding"}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-3 rounded-full bg-muted p-3">
          {status === "completed" ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : status === "error" ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : status === "requesting" || status === "uploading" || status === "saving" ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : status === "encoding" ? (
            <Film className="h-6 w-6 animate-pulse text-amber-500" />
          ) : hasExistingFile ? (
            <FileIcon className="h-6 w-6 text-primary" />
          ) : (
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <p className="text-sm font-semibold text-foreground">
          {status === "requesting"
            ? "Authorizing Direct Video Upload..."
            : status === "uploading"
            ? `Uploading directly to Bunny Stream (${progress}%)...`
            : status === "paused"
            ? "Upload Paused"
            : status === "saving"
            ? "Saving Lesson Record..."
            : status === "encoding"
            ? `Processing & Encoding Video (${encodingProgress}%)...`
            : status === "completed"
            ? "Upload Complete & Ready!"
            : label}
        </p>

        {description && status === "idle" && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {hasExistingFile && status === "idle" && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <FileIcon className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[220px] truncate font-mono">
              {currentBunnyVideoId
                ? `Bunny Video: ${currentBunnyVideoId.slice(0, 14)}...`
                : currentKey?.startsWith("data:")
                ? "Uploaded Document (Ready)"
                : currentKey?.split("/").pop()}
            </span>
          </div>
        )}

        {fileName && (status === "requesting" || status === "uploading" || status === "paused" || status === "completed" || status === "encoding") && (
          <div className="mt-1 flex flex-col items-center">
            <p className="text-xs font-mono text-muted-foreground truncate max-w-xs">{fileName}</p>
            {bytesTotal > 0 && (status === "uploading" || status === "paused") && (
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
                {uploadSpeed && ` • ${uploadSpeed}`}
              </p>
            )}
          </div>
        )}

        {/* Upload progress bar */}
        {(status === "uploading" || status === "paused" || status === "saving") && (
          <div className="mt-3 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ease-out ${status === "paused" ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Encoding progress bar */}
        {status === "encoding" && (
          <div className="mt-3 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${encodingProgress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-amber-500 font-medium">
              Bunny Stream is transcoding video resolutions. You can safely close this modal.
            </p>
          </div>
        )}

        {status === "error" && errorMessage && (
          <p className="mt-2 text-xs font-medium text-destructive">{errorMessage}</p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {category === "video" && (status === "uploading" || status === "paused") && (
            <button
              type="button"
              onClick={togglePauseResume}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer"
            >
              {status === "uploading" ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Resume
                </>
              )}
            </button>
          )}

          {status === "completed" || status === "error" || status === "paused" ? (
            <button
              type="button"
              onClick={resetUpload}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Upload Different File
            </button>
          ) : status === "encoding" ? (
            <p className="text-xs text-muted-foreground">
              Encoding continues in background on Bunny CDN.
            </p>
          ) : (
            <button
              type="button"
              disabled={status === "requesting" || status === "uploading" || status === "saving"}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {hasExistingFile ? "Replace File" : "Choose File"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
