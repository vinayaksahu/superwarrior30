"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileIcon, X } from "lucide-react";
import { toast } from "sonner";

interface FileUploaderProps {
  category: "video" | "pdf" | "thumbnail" | "image";
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  currentKey?: string | null;
  onUploadComplete: (key: string) => Promise<void> | void;
  accept?: string;
  label?: string;
  description?: string;
}

export function FileUploader({
  category,
  courseId,
  moduleId,
  lessonId,
  currentKey,
  onUploadComplete,
  accept,
  label = "Upload File",
  description,
}: FileUploaderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "requesting" | "uploading" | "saving" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = (() => {
    if (accept) return accept;
    switch (category) {
      case "video":
        return "video/mp4,video/webm";
      case "pdf":
        return "application/pdf";
      case "thumbnail":
      case "image":
        return "image/jpeg,image/png,image/webp";
    }
  })();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("uploading");
    setProgress(10);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("courseId", courseId);
      if (moduleId) formData.append("moduleId", moduleId);
      if (lessonId) formData.append("lessonId", lessonId);

      // Direct REST API Upload with progress tracking
      const uploadPromise = new Promise<{ success: boolean; key: string; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
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
            reject(new Error(`Server returned unexpected response (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during file upload"));
        xhr.send(formData);
      });

      const res = await uploadPromise;

      if (!res.success || !res.key) {
        throw new Error(res.error || "File upload failed");
      }

      setStatus("saving");
      await onUploadComplete(res.key);

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

  const resetUpload = () => {
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setFileName(null);
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 transition-colors hover:border-primary/40">
      <input
        ref={fileInputRef}
        type="file"
        accept={defaultAccept}
        className="hidden"
        onChange={handleFileChange}
        disabled={status === "uploading" || status === "saving"}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-3 rounded-full bg-muted p-3">
          {status === "completed" ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : status === "error" ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : status === "uploading" || status === "saving" ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : currentKey ? (
            <FileIcon className="h-6 w-6 text-primary" />
          ) : (
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <p className="text-sm font-semibold text-foreground">
          {status === "uploading"
            ? `Uploading (${progress}%)...`
            : status === "saving"
            ? "Saving file..."
            : status === "completed"
            ? "Upload successful!"
            : label}
        </p>

        {description && status === "idle" && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {currentKey && status === "idle" && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <FileIcon className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[200px] truncate font-mono">
              {currentKey.startsWith("data:") ? "Uploaded Document (Ready)" : currentKey.split("/").pop()}
            </span>
          </div>
        )}

        {fileName && (status === "uploading" || status === "completed") && (
          <p className="mt-1 text-xs font-mono text-muted-foreground truncate max-w-xs">{fileName}</p>
        )}

        {(status === "uploading" || status === "saving") && (
          <div className="mt-3 w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "error" && errorMessage && (
          <p className="mt-2 text-xs font-medium text-destructive">{errorMessage}</p>
        )}

        <div className="mt-4 flex gap-2">
          {status === "completed" || status === "error" ? (
            <button
              type="button"
              onClick={resetUpload}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Upload Different File
            </button>
          ) : (
            <button
              type="button"
              disabled={status === "uploading" || status === "saving"}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {currentKey ? "Replace File" : "Choose File"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
