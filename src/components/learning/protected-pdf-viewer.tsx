"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  FileText,
  RotateCcw,
} from "lucide-react";

let pdfEngineLoadingPromise: Promise<any> | null = null;
const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.5;
const DEFAULT_SCALE = 1.0;

function setWorkerSrc(pdfjsLib: any, useCdn = false) {
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = useCdn ? PDFJS_WORKER_CDN_URL : "/pdf.worker.min.js";
  }
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = typeof window !== "undefined" ? (window as any) : null;
    if (win?.pdfjsLib) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).loaded || (existing as any).readyState === "complete" || (existing as any).readyState === "loaded") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      // Safety timeout in case load event already fired before listener was attached
      setTimeout(() => {
        if (win?.pdfjsLib) resolve();
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      (script as any).loaded = true;
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function loadPdfEngine(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Cannot load PDF on server"));
  const win = window as any;
  if (win.pdfjsLib) {
    setWorkerSrc(win.pdfjsLib);
    return Promise.resolve(win.pdfjsLib);
  }

  if (!pdfEngineLoadingPromise) {
    pdfEngineLoadingPromise = (async () => {
      try {
        // Attempt 1: Load local self-hosted script
        try {
          await injectScript("/pdf.min.js");
          if (win.pdfjsLib) {
            setWorkerSrc(win.pdfjsLib, false);
            return win.pdfjsLib;
          }
        } catch (localErr) {
          console.warn("Local PDF engine load failed, trying CDN fallback:", localErr);
        }

        // Attempt 2: Load from trusted Cloudflare CDN (whitelisted in CSP)
        await injectScript(PDFJS_CDN_URL);
        if (win.pdfjsLib) {
          setWorkerSrc(win.pdfjsLib, true);
          return win.pdfjsLib;
        }

        throw new Error("PDF viewer engine could not be initialized");
      } catch (err) {
        // Reset promise on failure so retry button can re-attempt
        pdfEngineLoadingPromise = null;
        throw err;
      }
    })();
  }

  return pdfEngineLoadingPromise;
}

interface ProtectedPdfViewerProps {
  pdfUrl: string;
  title: string;
  maxPages?: number;
  className?: string;
  viewportHeightClass?: string;
}

export function ProtectedPdfViewer({
  pdfUrl,
  title,
  maxPages,
  className,
  viewportHeightClass,
}: ProtectedPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTaskRef = useRef<any>(null);

  // Multi-touch pinch zoom & double-tap refs
  const isPinchingRef = useRef<boolean>(false);
  const initialPinchDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(DEFAULT_SCALE);
  const initialPinchCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const currentDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentTargetScaleRef = useRef<number>(DEFAULT_SCALE);
  const pendingScrollTargetRef = useRef<{ left: number; top: number } | null>(null);

  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [docNumPages, setDocNumPages] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(DEFAULT_SCALE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Real-time visual feedback during 2-finger pinch
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [livePercent, setLivePercent] = useState<number>(100);

  // Load PDF with self-hosted local pdf.min.js engine
  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const pdfjsLib = await loadPdfEngine();

        if (!pdfjsLib) {
          throw new Error("PDF viewer engine not ready");
        }

        setWorkerSrc(pdfjsLib);

        if (isCancelled) return;

        // Fetch PDF as ArrayBuffer directly from same-origin secure route
        const response = await fetch(pdfUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Could not load document stream (HTTP ${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
        });
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(doc);
          setDocNumPages(doc.numPages);
          const effectiveTotal =
            maxPages && maxPages > 0 ? Math.min(doc.numPages, maxPages) : doc.numPages;
          setTotalPages(effectiveTotal);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("PDF render error:", err);
          const msg = err instanceof Error ? err.message : "Failed to render document";
          setError(msg);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, retryCount, maxPages]);

  // Clean up in-flight render task on unmount
  useEffect(() => {
    return () => {
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Render current page onto Canvas preserving exact aspect ratio
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous in-flight render task if user rapidly switches pages or zoom
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore cancel error
        }
        currentRenderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Determine container width for responsive fit
        const rawWidth =
          scrollAreaRef.current?.clientWidth ||
          containerRef.current?.clientWidth ||
          (typeof window !== "undefined" ? window.innerWidth : 360);
        const containerWidth = rawWidth > 0 ? rawWidth : 360;
        const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
        const sidePadding = isMobile ? 12 : 32;
        const availableWidth = Math.max(containerWidth - sidePadding, 220);

        // Get unscaled natural PDF page dimensions (scale = 1.0)
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Natural readable max width (up to 880px on desktop, full available width on mobile)
        const basePageWidth = isMobile ? availableWidth : Math.min(availableWidth, 880);

        // Proportional scale calculation: scale = targetWidth / originalWidth
        const baseScale = basePageWidth / unscaledViewport.width;
        const finalPdfScale = baseScale * scale;

        const viewport = page.getViewport({ scale: finalPdfScale });

        // Handle Retina/High-DPI screens for super-crisp sharp vector text
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);

        // Explicit CSS width & height match EXACT viewport to guarantee 100% distortion-free aspect ratio
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;
        canvas.style.maxWidth = "none";
        canvas.style.maxHeight = "none";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;

        // Once the crisp high-res render completes, clear temporary pinch CSS transform
        if (canvasWrapperRef.current && !isPinchingRef.current) {
          canvasWrapperRef.current.style.transform = "none";
          canvasWrapperRef.current.style.transformOrigin = "center top";
        }

        // Maintain focal scroll position after zooming
        if (pendingScrollTargetRef.current && scrollAreaRef.current) {
          scrollAreaRef.current.scrollLeft = pendingScrollTargetRef.current.left;
          scrollAreaRef.current.scrollTop = pendingScrollTargetRef.current.top;
          pendingScrollTargetRef.current = null;
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Canvas render error:", err);
        }
      }
    },
    [pdfDoc, scale]
  );

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

  // Handle window resize for dynamic responsive fit
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdfDoc) renderPage(currentPage);
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [pdfDoc, currentPage, renderPage]);

  // 2-Finger Pinch-to-Zoom, Double-Tap, and Trackpad Gestures on Mobile & Touch devices
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2 fingers detected: Start Pinch Gesture
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (dist < 10) return;

        isPinchingRef.current = true;
        initialPinchDistRef.current = dist;
        initialScaleRef.current = scale;
        currentTargetScaleRef.current = scale;

        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        initialPinchCenterRef.current = { x: cx, y: cy };
        currentDeltaRef.current = { x: 0, y: 0 };
        initialScrollRef.current = {
          left: scrollEl.scrollLeft,
          top: scrollEl.scrollTop,
        };

        if (canvasWrapperRef.current) {
          const rect = canvasWrapperRef.current.getBoundingClientRect();
          const originX = cx - rect.left;
          const originY = cy - rect.top;
          canvasWrapperRef.current.style.transformOrigin = `${originX}px ${originY}px`;
          canvasWrapperRef.current.style.transition = "none";
        }

        setIsPinching(true);
        setLivePercent(Math.round(scale * 100));
      } else if (e.touches.length === 1) {
        // 1 finger touch: detect quick double-tap to zoom in/reset
        const now = Date.now();
        const touch = e.touches[0];
        const timeDiff = now - lastTapTimeRef.current;
        const distDiff = Math.hypot(
          touch.clientX - lastTapPosRef.current.x,
          touch.clientY - lastTapPosRef.current.y
        );

        if (timeDiff < 300 && distDiff < 25) {
          // Double-tap triggered
          e.preventDefault();
          lastTapTimeRef.current = 0;
          const targetScale = scale > 1.2 ? DEFAULT_SCALE : 2.0;

          if (targetScale > scale) {
            const containerRect = scrollEl.getBoundingClientRect();
            const k = targetScale / scale;
            const focalX = scrollEl.scrollLeft + (touch.clientX - containerRect.left);
            const focalY = scrollEl.scrollTop + (touch.clientY - containerRect.top);
            const newScrollLeft = focalX * k - (touch.clientX - containerRect.left);
            const newScrollTop = focalY * k - (touch.clientY - containerRect.top);
            pendingScrollTargetRef.current = {
              left: Math.max(0, newScrollLeft),
              top: Math.max(0, newScrollTop),
            };
          }
          setScale(targetScale);
        } else {
          lastTapTimeRef.current = now;
          lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPinchingRef.current || e.touches.length !== 2) return;

      // Block browser native page zoom / pull-to-refresh
      e.preventDefault();

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const ratio = dist / initialPinchDistRef.current;

      const newScale = Math.min(
        Math.max(initialScaleRef.current * ratio, MIN_SCALE),
        MAX_SCALE
      );
      currentTargetScaleRef.current = newScale;

      const visualFactor = newScale / initialScaleRef.current;
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const deltaX = cx - initialPinchCenterRef.current.x;
      const deltaY = cy - initialPinchCenterRef.current.y;
      currentDeltaRef.current = { x: deltaX, y: deltaY };

      // High-performance GPU-accelerated real-time visual transform
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0px) scale(${visualFactor})`;
      }

      setLivePercent(Math.round(newScale * 100));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isPinchingRef.current) return;
      if (e.touches.length >= 2) return; // Wait until fingers lift

      isPinchingRef.current = false;
      setIsPinching(false);

      const finalScale = parseFloat(currentTargetScaleRef.current.toFixed(2));
      const clampedFinalScale = Math.min(Math.max(finalScale, MIN_SCALE), MAX_SCALE);

      const containerRect = scrollEl.getBoundingClientRect();
      const k = clampedFinalScale / initialScaleRef.current;
      const focalContentX =
        initialScrollRef.current.left +
        (initialPinchCenterRef.current.x - containerRect.left);
      const focalContentY =
        initialScrollRef.current.top +
        (initialPinchCenterRef.current.y - containerRect.top);

      const newScrollLeft =
        focalContentX * k -
        (initialPinchCenterRef.current.x - containerRect.left + currentDeltaRef.current.x);
      const newScrollTop =
        focalContentY * k -
        (initialPinchCenterRef.current.y - containerRect.top + currentDeltaRef.current.y);

      pendingScrollTargetRef.current = {
        left: Math.max(0, newScrollLeft),
        top: Math.max(0, newScrollTop),
      };

      if (Math.abs(clampedFinalScale - scale) >= 0.04) {
        setScale(clampedFinalScale);
      } else {
        // Minor pinch change, reset transform cleanly
        if (canvasWrapperRef.current) {
          canvasWrapperRef.current.style.transform = "none";
          canvasWrapperRef.current.style.transformOrigin = "center top";
        }
      }
    };

    // Trackpad pinch on laptops & Ctrl+Mouse Wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        setScale((prev) => {
          const next = parseFloat(
            Math.min(Math.max(prev + zoomDelta, MIN_SCALE), MAX_SCALE).toFixed(2)
          );
          return next;
        });
      }
    };

    scrollEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    scrollEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", handleTouchEnd, { passive: true });
    scrollEl.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    scrollEl.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollEl.removeEventListener("touchstart", handleTouchStart);
      scrollEl.removeEventListener("touchmove", handleTouchMove);
      scrollEl.removeEventListener("touchend", handleTouchEnd);
      scrollEl.removeEventListener("touchcancel", handleTouchEnd);
      scrollEl.removeEventListener("wheel", handleWheel);
    };
  }, [scale]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const maxAllowed = totalPages > 0 ? totalPages : 1;
      const target = Math.max(1, Math.min(newPage, maxAllowed));
      setCurrentPage(target);
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.style.transform = "none";
        canvasWrapperRef.current.style.transformOrigin = "center top";
      }
    },
    [totalPages]
  );

  // Keyboard navigation for page flipping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft" && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, handlePageChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col w-full bg-neutral-950 rounded-2xl border border-border overflow-hidden select-none shadow-2xl",
        className
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Sticky Top Controls Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-neutral-900/95 backdrop-blur-md border-b border-border/80 text-xs">
        <div className="flex items-center gap-2 truncate max-w-[150px] sm:max-w-xs">
          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-bold text-foreground truncate">{title}</span>
        </div>

        {totalPages > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Page Navigation */}
            <div className="flex items-center rounded-lg bg-black/70 border border-border px-1 py-0.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                title="Previous Page (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-mono text-[11px] font-bold text-amber-400">
                {currentPage} / {totalPages}
                {maxPages && docNumPages > maxPages ? (
                  <span className="ml-1 text-[9px] text-amber-500/80 font-normal">
                    (Preview)
                  </span>
                ) : null}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                title="Next Page (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Proportional Zoom Controls */}
            <div className="flex items-center rounded-lg bg-black/70 border border-border px-1 py-0.5">
              <button
                type="button"
                disabled={scale <= MIN_SCALE}
                onClick={() =>
                  setScale((s) => Math.max(parseFloat((s - 0.2).toFixed(2)), MIN_SCALE))
                }
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setScale(DEFAULT_SCALE)}
                className="px-1.5 font-mono text-[10px] font-semibold text-muted-foreground hover:text-amber-400 cursor-pointer transition-colors"
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                disabled={scale >= MAX_SCALE}
                onClick={() =>
                  setScale((s) => Math.min(parseFloat((s + 0.2).toFixed(2)), MAX_SCALE))
                }
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 
        Scrollable PDF Viewport:
        - Top-aligned & Centered without negative flexbox clipping on zoom
        - Full 2-finger multi-touch pinch to zoom on mobile & tablets
        - Double tap to zoom in / reset
        - Hardware-accelerated smooth 60fps pan & pinch
      */}
      <div
        ref={scrollAreaRef}
        className={cn(
          "relative overflow-y-auto overflow-x-auto w-full p-2 sm:p-4 bg-neutral-900/60 touch-pan-x touch-pan-y overscroll-contain",
          viewportHeightClass || "h-[75vh] min-h-[460px] max-h-[860px]"
        )}
      >
        {/* Floating Live Zoom Badge during 2-Finger Pinch */}
        {isPinching && (
          <div className="pointer-events-none fixed sm:absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-black/85 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/40 shadow-2xl backdrop-blur-md transition-all">
            <ZoomIn className="h-3.5 w-3.5 animate-pulse" />
            <span>{livePercent}%</span>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center my-auto min-w-full">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground">
              Rendering sharp protected document...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center my-auto min-w-full">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 text-destructive mb-1">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              PDF load nahi ho pa raha. Retry karein.
            </p>
            {error && (
              <p className="text-xs text-muted-foreground max-w-sm">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        <div
          className={`relative min-w-full w-max flex flex-col items-center m-auto pb-8 ${
            loading || error ? "hidden" : "flex"
          }`}
        >
          <div
            ref={canvasWrapperRef}
            className="relative will-change-transform origin-top select-none"
          >
            <canvas
              ref={canvasRef}
              className="shadow-2xl rounded-lg bg-white block border border-neutral-800"
            />
          </div>
        </div>

        {/* Security Watermark */}
        <div className="pointer-events-none sticky bottom-3 right-3 ml-auto z-10 w-fit rounded bg-black/60 px-2 py-1 text-[9px] font-mono text-white/30 backdrop-blur-sm">
          Protected • Rahul Trade Warrior Academy
        </div>
      </div>
    </div>
  );
}
