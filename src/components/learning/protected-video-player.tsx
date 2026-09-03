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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      videoRef.current.play();
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
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
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
          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
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
      onContextMenu={(e) => e.preventDefault()}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black select-none shadow-2xl"
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

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/30 p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Bar: Title & DRM Badge */}
        <div className="flex items-center justify-between text-white/90">
          <span className="text-xs font-bold tracking-tight truncate max-w-md">{title}</span>
          <span className="inline-flex items-center gap-1 rounded bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] text-amber-400 font-bold">
            <ShieldCheck className="h-3 w-3" />
            DRM Protected
          </span>
        </div>

        {/* Center Big Play Button if Paused */}
        {!isPlaying && !isBuffering && (
          <button
            type="button"
            onClick={togglePlay}
            className="self-center flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-2xl hover:scale-105 transition-all cursor-pointer"
          >
            <Play className="h-7 w-7 ml-1" />
          </button>
        )}

        {/* Bottom Bar: Timeline & Controls */}
        <div className="space-y-2 pt-2">
          {/* Progress Timeline */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/30 accent-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button type="button" onClick={togglePlay} className="p-1 hover:text-primary">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-1 hover:text-primary flex items-center gap-0.5 text-[10px]"
                title="Rewind 10s"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                10s
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-1 hover:text-primary flex items-center gap-0.5 text-[10px]"
                title="Forward 10s"
              >
                <RotateCw className="h-3.5 w-3.5" />
                10s
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={toggleMute} className="p-1 hover:text-primary">
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
              <span className="font-mono text-[11px] text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 relative">
              {/* Speed Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded px-2 py-1 text-[11px] font-bold bg-white/10 hover:bg-white/20"
                >
                  {playbackRate}x
                </button>

                {showSettings && (
                  <div className="absolute bottom-8 right-0 rounded-xl bg-card border border-border p-1 shadow-2xl text-foreground space-y-0.5 z-40">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleSpeedChange(rate)}
                        className={`block w-full text-left px-3 py-1 rounded text-xs font-bold ${
                          playbackRate === rate ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button type="button" onClick={toggleFullscreen} className="p-1 hover:text-primary">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
