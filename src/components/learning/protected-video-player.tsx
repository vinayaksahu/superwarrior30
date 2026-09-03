"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Check,
} from "lucide-react";

interface ProtectedVideoPlayerProps {
  src: string;
  title: string;
  durationSec?: number;
  onEnded?: () => void;
  watermarkText?: string;
}

export function ProtectedVideoPlayer({
  src,
  title,
  durationSec,
  onEnded,
  watermarkText = "Trade Warrior Academy • Protected Content",
}: ProtectedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [feedbackOverlay, setFeedbackOverlay] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) || window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show quick on-screen feedback (e.g., "+10s", "-10s", "1.5x")
  const triggerFeedback = (text: string) => {
    setFeedbackOverlay(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackOverlay(null);
    }, 800);
  };

  // Initialize Video & HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsBuffering(true);

    const isHlsStream = src.includes(".m3u8");

    if (isHlsStream && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS Fatal Error:", data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError("Failed to load video stream. Please try refreshing.");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl") || !isHlsStream) {
      // Native Safari HLS or direct MP4 stream
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false);
      });
    } else {
      setError("Your browser does not support HLS video streaming.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Sync Fullscreen state from browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      const isFs = Boolean(fsElement);
      setIsFullscreen(isFs);

      if (!isFs && isLandscape) {
        setIsLandscape(false);
        try {
          if ((screen.orientation as any)?.unlock) {
            (screen.orientation as any).unlock();
          }
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isLandscape]);

  // Keyboard Shortcuts (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (videoRef.current) {
          const nextVol = Math.min(1, volume + 0.1);
          setVolume(nextVol);
          setIsMuted(false);
          videoRef.current.volume = nextVol;
          videoRef.current.muted = false;
          triggerFeedback(`${Math.round(nextVol * 100)}% Volume`);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (videoRef.current) {
          const nextVol = Math.max(0, volume - 0.1);
          setVolume(nextVol);
          setIsMuted(nextVol === 0);
          videoRef.current.volume = nextVol;
          videoRef.current.muted = nextVol === 0;
          triggerFeedback(`${Math.round(nextVol * 100)}% Volume`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, isPlaying, isMuted]);

  // Video Events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration || duration === 0) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    triggerFeedback(newMuted ? "Muted" : "Unmuted");
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    triggerFeedback(`${seconds > 0 ? `+${seconds}s` : `${seconds}s`}`);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    triggerFeedback(`${rate}x Speed`);
    setShowSettings(false);
  };

  // Toggle Fullscreen (Desktop & General)
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle exception:", err);
    }
  };

  // Toggle Mobile Landscape Mode
  const toggleMobileLandscape = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!isLandscape) {
        // Enter Fullscreen & Lock to Landscape
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (container.requestFullscreen) {
            await container.requestFullscreen().catch(() => {});
          } else if ((container as any).webkitRequestFullscreen) {
            await (container as any).webkitRequestFullscreen().catch(() => {});
          } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
            (videoRef.current as any).webkitEnterFullscreen();
          }
        }

        // Lock screen orientation to landscape if supported
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock("landscape").catch(() => {
            // Orientation lock may fail if permission denied, fallback smoothly
          });
        }

        setIsLandscape(true);
        setIsFullscreen(true);
        triggerFeedback("Landscape View Enabled");
      } else {
        // Exit Landscape & Fullscreen
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen().catch(() => {});
          }
        }

        if ((screen.orientation as any)?.unlock) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }

        setIsLandscape(false);
        setIsFullscreen(false);
        triggerFeedback("Portrait View");
      }
    } catch (err) {
      console.warn("Landscape toggle exception:", err);
    }
  };

  // Double-tap seeking on Mobile & Double-click fullscreen on Desktop
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapRef.current.time < 300) {
      // Double Tap detected
      if (touchX < width * 0.35) {
        // Left side double tap -> Rewind 10s
        handleSkip(-10);
      } else if (touchX > width * 0.65) {
        // Right side double tap -> Forward 10s
        handleSkip(10);
      } else {
        // Center double tap -> Toggle Fullscreen / Landscape
        if (isMobileDevice) {
          toggleMobileLandscape();
        } else {
          toggleFullscreen();
        }
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: touchX };
      handleMouseMove();
    }
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3500);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (error) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm font-bold text-foreground">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground cursor-pointer shadow hover:bg-primary/90"
        >
          Reload Player
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={toggleFullscreen}
      onContextMenu={(e) => e.preventDefault()}
      className={`group relative w-full overflow-hidden bg-black select-none transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none max-w-none"
          : "aspect-video rounded-2xl border border-border shadow-2xl"
      }`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onEnded={onEnded}
        onClick={togglePlay}
        className="h-full w-full object-contain cursor-pointer"
      />

      {/* Dynamic Security Watermark Overlay */}
      <div className="pointer-events-none absolute bottom-16 right-4 z-20 rounded bg-black/60 px-2.5 py-1 text-[10px] font-mono text-white/50 backdrop-blur-sm">
        {watermarkText}
      </div>

      {/* On-screen Action Feedback Overlay (e.g., "+10s", "1.5x Speed", "Muted") */}
      {feedbackOverlay && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="rounded-2xl bg-black/80 border border-white/20 px-6 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            {feedbackOverlay}
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <span className="text-[11px] font-medium text-white/80">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/40 p-3 sm:p-5 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Bar: Title, DRM Badge & Quick Actions */}
        <div className="flex items-center justify-between text-white/95 gap-2">
          <span className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-[65%] drop-shadow">
            {title}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] text-amber-400 font-bold backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              DRM Protected
            </span>

            {/* Mobile Landscape Quick Button (Top-Right on Mobile) */}
            <button
              type="button"
              onClick={toggleMobileLandscape}
              className="inline-flex sm:hidden items-center gap-1.5 rounded-lg bg-white/20 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md active:bg-white/30 cursor-pointer"
              title="Landscape View"
            >
              <Smartphone className={`h-3.5 w-3.5 ${isLandscape ? "rotate-90 text-amber-400" : ""}`} />
              <span>{isLandscape ? "Portrait" : "Landscape"}</span>
            </button>
          </div>
        </div>

        {/* Center Big Play/Pause Button if Paused */}
        {!isPlaying && !isBuffering && (
          <button
            type="button"
            onClick={togglePlay}
            className="self-center flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
            title="Play Video (Space)"
          >
            <Play className="h-7 w-7 sm:h-8 sm:w-8 ml-1 fill-current" />
          </button>
        )}

        {/* Bottom Bar: Timeline & Control Buttons */}
        <div className="space-y-2 pt-2">
          {/* Progress Timeline Scrub Bar */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="h-1.5 sm:h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/30 accent-primary focus:outline-none transition-all hover:h-2.5"
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls: Play/Pause, Rewind/Forward, Volume, Time */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-white/20 transition text-white hover:text-primary cursor-pointer"
                title={isPlaying ? "Pause (Space/K)" : "Play (Space/K)"}
              >
                {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-white hover:text-primary cursor-pointer"
                title="Rewind 10s (Left Arrow/J)"
              >
                <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">10s</span>
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-white hover:text-primary cursor-pointer"
                title="Forward 10s (Right Arrow/L)"
              >
                <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">10s</span>
              </button>

              {/* Volume Slider (Desktop) */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition text-white hover:text-primary cursor-pointer"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-16 cursor-pointer appearance-none rounded bg-white/30 accent-primary"
                />
              </div>

              {/* Time Display */}
              <span className="font-mono text-[11px] sm:text-xs text-white/90">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls: Speed, Mobile Landscape, Desktop Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2 relative">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold bg-white/15 hover:bg-white/25 active:bg-white/30 transition text-white cursor-pointer border border-white/10"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                {showSettings && (
                  <div className="absolute bottom-9 right-0 rounded-xl bg-neutral-900 border border-border p-1 shadow-2xl text-white space-y-0.5 z-50 min-w-[90px] backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Speed</div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleSpeedChange(rate)}
                        className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          playbackRate === rate ? "bg-primary text-primary-foreground" : "hover:bg-white/10 text-white/90"
                        }`}
                      >
                        <span>{rate}x</span>
                        {playbackRate === rate && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Landscape Toggle Button in Control Bar */}
              <button
                type="button"
                onClick={toggleMobileLandscape}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold bg-white/15 hover:bg-white/25 active:bg-white/30 transition text-white cursor-pointer border border-white/10"
                title={isLandscape ? "Exit Landscape" : "Landscape Mode"}
              >
                <Smartphone className={`h-3.5 w-3.5 ${isLandscape ? "rotate-90 text-amber-400" : ""}`} />
                <span className="hidden md:inline">{isLandscape ? "Portrait" : "Landscape"}</span>
              </button>

              {/* Fullscreen Button (Desktop & Mobile) */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/20 transition text-white hover:text-primary cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen (F / Esc)" : "Full Screen (F)"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
