"use client";

import React, { useState } from "react";
import { Film, FileText, ImageIcon, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaThumbnailProps {
  mediaType: "VIDEO" | "PDF" | "IMAGE" | string;
  thumbnailUrl?: string | null;
  fileName: string;
  bunnyVideoId?: string | null;
  status?: string;
  className?: string;
  showPlayIcon?: boolean;
}

export function MediaThumbnail({
  mediaType,
  thumbnailUrl,
  fileName,
  bunnyVideoId,
  status,
  className,
  showPlayIcon = true,
}: MediaThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const isVideo = mediaType === "VIDEO";
  const isPdf = mediaType === "PDF";
  const isImage = mediaType === "IMAGE";

  // Fallback / placeholder when image is not present or failed to load
  if (hasError || !thumbnailUrl) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 via-black to-neutral-950 text-muted-foreground select-none",
          className
        )}
      >
        {isVideo ? (
          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            {status === "PROCESSING" || status === "UPLOADING" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : showPlayIcon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/40 shadow-inner group-hover:scale-110 transition-transform">
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </div>
            ) : (
              <Film className="h-6 w-6 text-primary/70" />
            )}
            <span className="text-[10px] font-mono text-muted-foreground/80 truncate max-w-[120px]">
              {fileName.replace(/\.[^/.]+$/, "")}
            </span>
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider">
              PDF Document
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <ImageIcon className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black select-none",
        className
      )}
    >
      <img
        src={thumbnailUrl}
        alt={fileName}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-300 group-hover:scale-105",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Subtle play overlay on video thumbnails */}
      {isVideo && showPlayIcon && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-80 group-hover:opacity-100 group-hover:bg-black/30 transition-all">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-3.5 w-3.5 fill-current ml-0.5 text-white" />
          </div>
        </div>
      )}

      {/* Loading state before image renders */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
          <Film className="h-6 w-6 text-muted-foreground/40 animate-pulse" />
        </div>
      )}
    </div>
  );
}
