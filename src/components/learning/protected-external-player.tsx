"use client";

import React, { useRef, useState, useEffect } from "react";
import { Shield, Maximize, Minimize } from "lucide-react";

interface ProtectedExternalPlayerProps {
  src: string;
  title: string;
  watermarkText?: string;
  className?: string;
}

/**
 * ProtectedExternalPlayer
 * Renders an external video (YouTube / Vimeo / Embed) with Click-Shield Protection.
 * Blocks unauthorized clicking on "Share", "Watch on YouTube", channel links, and context menus
 * while keeping play/pause and playback controls fully usable.
 */
export function ProtectedExternalPlayer({
  src,
  title,
  watermarkText = "Protected • Rahul Trade Warrior Academy",
  className = "",
}: ProtectedExternalPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Append anti-branding and privacy parameters if YouTube embed
  let finalSrc = src;
  if (finalSrc.includes("youtube.com/embed/") || finalSrc.includes("youtube-nocookie.com/embed/")) {
    const separator = finalSrc.includes("?") ? "&" : "?";
    if (!finalSrc.includes("modestbranding=")) {
      finalSrc += `${separator}modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`;
    }
  }

  // Handle Fullscreen Change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen permission errors
    }
  };

  const handleShieldClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full bg-black select-none overflow-hidden rounded-2xl border border-border shadow-2xl ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Underlying Video Iframe */}
      <iframe
        src={finalSrc}
        title={title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />

      {/* 2. Top-Bar Click Shield (Blocks clicking title, channel avatar, and top-right icons) */}
      <div
        onClick={handleShieldClick}
        onContextMenu={(e) => e.preventDefault()}
        title="Protected Content"
        className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent"
      />

      {/* 3. Bottom-Left Click Shield (Blocks clicking Share / Watch Later buttons) */}
      <div
        onClick={handleShieldClick}
        onContextMenu={(e) => e.preventDefault()}
        title="Protected Content"
        className="absolute bottom-2 left-0 w-44 h-16 z-20 cursor-default bg-transparent"
      />

      {/* 4. Bottom-Right Click Shield (Blocks clicking 'Watch on YouTube' button) */}
      <div
        onClick={handleShieldClick}
        onContextMenu={(e) => e.preventDefault()}
        title="Protected Content"
        className="absolute bottom-0 right-0 w-52 h-14 z-20 cursor-default bg-transparent"
      />

      {/* 5. Custom Fullscreen Control (Top-Right, above the shield) */}
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className="absolute top-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white/80 opacity-0 transition-opacity hover:bg-black/90 hover:text-white group-hover:opacity-100 backdrop-blur-sm border border-white/10"
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>

      {/* 6. Floating Anti-Piracy Watermark Badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded bg-black/75 px-2.5 py-1 text-[10px] font-mono text-white/60 backdrop-blur-sm border border-white/10 select-none">
        <Shield className="h-3 w-3 text-amber-400" />
        <span>{watermarkText}</span>
      </div>
    </div>
  );
}
