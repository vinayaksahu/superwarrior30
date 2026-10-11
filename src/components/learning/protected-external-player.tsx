"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
 * 
 * Key Protections:
 * 1. fs=0 + no allowfullscreen: Completely removes YouTube's native fullscreen button,
 *    preventing YouTube from triggering its own native mobile fullscreen mode (which exposes the Share button).
 * 2. Custom Fullscreen: Controlled at the container level. Automatically rotates to landscape on mobile
 *    while keeping all click-shields and watermarks locked on top of the player.
 * 3. Top-bar Shield: Blocks video title, channel avatar, and YouTube links.
 * 4. Bottom-left Shield: Blocks Share (curved arrow) and Watch Later (clock) buttons.
 * 5. Bottom-right Shield: Blocks "Watch on YouTube" badge and link.
 * 6. no web-share: Prevents YouTube from opening the device's native mobile share sheet.
 * 7. onContextMenu disabled: Blocks browser context menu ("Copy video URL" / "Copy embed code").
 */
export function ProtectedExternalPlayer({
  src,
  title,
  watermarkText = "Protected • Rahul Trade Warrior Academy",
  className = "",
}: ProtectedExternalPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Append anti-branding, privacy, and fs=0 parameters if YouTube embed
  let finalSrc = src;
  if (finalSrc.includes("youtube.com/embed/") || finalSrc.includes("youtube-nocookie.com/embed/")) {
    const separator = finalSrc.includes("?") ? "&" : "?";
    if (!finalSrc.includes("fs=")) {
      finalSrc += `${separator}fs=0`;
    }
    if (!finalSrc.includes("modestbranding=")) {
      finalSrc += `&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`;
    }
  }

  const toggleFullscreen = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!containerRef.current) return;

    if (!isFullscreen) {
      // 1. Request Native Browser Fullscreen on our container
      if (containerRef.current.requestFullscreen) {
        try {
          await containerRef.current.requestFullscreen();
        } catch {
          // Fallback to CSS fullscreen
        }
      }

      // 2. Lock Orientation to Landscape for full screen cinema view on mobile
      try {
        if (
          typeof window !== "undefined" &&
          window.screen &&
          "orientation" in window.screen &&
          window.screen.orientation &&
          "lock" in window.screen.orientation
        ) {
          await (window.screen.orientation as any).lock("landscape");
        }
      } catch {
        // Orientation lock not supported or denied
      }

      setIsFullscreen(true);
    } else {
      // Exit Fullscreen
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {}
      }

      // Unlock Orientation
      try {
        if (
          typeof window !== "undefined" &&
          window.screen &&
          "orientation" in window.screen &&
          window.screen.orientation &&
          "unlock" in window.screen.orientation
        ) {
          (window.screen.orientation as any).unlock();
        }
      } catch {}

      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen to browser fullscreen changes & ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFs = Boolean(document.fullscreenElement);
      if (!isDocFs && isFullscreen) {
        setIsFullscreen(false);
        try {
          if (
            typeof window !== "undefined" &&
            window.screen &&
            "orientation" in window.screen &&
            window.screen.orientation &&
            "unlock" in window.screen.orientation
          ) {
            (window.screen.orientation as any).unlock();
          }
        } catch {}
      } else if (isDocFs && !isFullscreen) {
        setIsFullscreen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  const handleShieldClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] h-screen w-screen bg-black flex items-center justify-center overflow-hidden select-none"
          : `group relative aspect-video w-full bg-black select-none overflow-hidden rounded-2xl border border-border shadow-2xl ${className}`
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={
          isFullscreen
            ? "relative w-full h-full max-w-[100vw] max-h-[100vh] aspect-video flex items-center justify-center"
            : "relative w-full h-full"
        }
      >
        {/* 1. Underlying Video Iframe (Notice: NO allowFullScreen, NO web-share, NO fullscreen in allow) */}
        <iframe
          src={finalSrc}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />

        {/* 2. Top-Bar Click Shield (Blocks title, channel avatar, and top-right icons) */}
        <div
          onClick={handleShieldClick}
          onContextMenu={(e) => e.preventDefault()}
          title="Protected Content"
          className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent"
        />

        {/* 3. Bottom-Left Click Shield (Blocks Share and Watch Later buttons) */}
        <div
          onClick={handleShieldClick}
          onContextMenu={(e) => e.preventDefault()}
          title="Protected Content"
          className="absolute bottom-0 left-0 w-44 h-16 z-20 cursor-default bg-transparent"
        />

        {/* 4. Bottom-Right Click Shield (Blocks 'Watch on YouTube' button) */}
        <div
          onClick={handleShieldClick}
          onContextMenu={(e) => e.preventDefault()}
          title="Protected Content"
          className="absolute bottom-0 right-0 w-52 h-16 z-20 cursor-default bg-transparent"
        />

        {/* 5. Custom Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className={
            isFullscreen
              ? "absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/85 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xl hover:bg-black transition-all active:scale-95"
              : "absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/85 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xl hover:bg-black transition-all active:scale-95"
          }
        >
          {isFullscreen ? (
            <>
              <Minimize className="h-3.5 w-3.5" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize className="h-3.5 w-3.5" />
              <span>Fullscreen</span>
            </>
          )}
        </button>

        {/* 6. Floating Anti-Piracy Watermark Badge */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-lg bg-black/85 px-2.5 py-1 text-[10px] font-mono text-white/70 backdrop-blur-md border border-white/10 select-none">
          <Shield className="h-3 w-3 text-amber-400" />
          <span>{watermarkText}</span>
        </div>
      </div>
    </div>
  );
}
