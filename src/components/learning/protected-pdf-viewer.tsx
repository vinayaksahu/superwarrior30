"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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

function setWorkerSrc(pdfjsLib: any) {
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }
}

function loadPdfEngine(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Cannot load PDF on server"));
  const win = window as any;
  if (win.pdfjsLib) {
    setWorkerSrc(win.pdfjsLib);
    return Promise.resolve(win.pdfjsLib);
  }

  if (!pdfEngineLoadingPromise) {
    pdfEngineLoadingPromise = new Promise<any>((resolve, reject) => {
      if (win.pdfjsLib) {
        setWorkerSrc(win.pdfjsLib);
        resolve(win.pdfjsLib);
        return;
      }
      const existing = document.querySelector('script[src="/pdf.min.js"]') as HTMLScriptElement | null;
      if (existing) {
        if (win.pdfjsLib) {
          setWorkerSrc(win.pdfjsLib);
          resolve(win.pdfjsLib);
          return;
        }
        existing.addEventListener("load", () => {
          setWorkerSrc(win.pdfjsLib);
          resolve(win.pdfjsLib);
        });
        existing.addEventListener("error", () => reject(new Error("Failed to load PDF viewer script")));
        return;
      }

      const script = document.createElement("script");
      script.src = "/pdf.min.js";
      script.async = true;
      script.onload = () => {
        setWorkerSrc(win.pdfjsLib);
        resolve(win.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Failed to load PDF viewer engine"));
      document.head.appendChild(script);
    });
  }

  return pdfEngineLoadingPromise;
}

interface ProtectedPdfViewerProps {
  pdfUrl: string;
  title: string;
}

export function ProtectedPdfViewer({ pdfUrl, title }: ProtectedPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

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
          setTotalPages(doc.numPages);
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
  }, [pdfUrl, retryCount]);

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
        const containerWidth =
          scrollAreaRef.current?.clientWidth ||
          containerRef.current?.clientWidth ||
          window.innerWidth;
        const isMobile = window.innerWidth < 640;
        const sidePadding = isMobile ? 16 : 48;
        const availableWidth = Math.max(containerWidth - sidePadding, 280);

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

  const handlePageChange = useCallback(
    (newPage: number) => {
      const target = Math.max(1, Math.min(newPage, totalPages));
      setCurrentPage(target);
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
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
      className="flex flex-col w-full bg-neutral-950 rounded-2xl border border-border overflow-hidden select-none shadow-2xl"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Sticky Top Controls Toolbar (Clean & Accessible) */}
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
                disabled={scale <= 0.6}
                onClick={() =>
                  setScale((s) => Math.max(parseFloat((s - 0.15).toFixed(2)), 0.5))
                }
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setScale(1.0)}
                className="px-1.5 font-mono text-[10px] font-semibold text-muted-foreground hover:text-amber-400 cursor-pointer transition-colors"
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                disabled={scale >= 2.2}
                onClick={() =>
                  setScale((s) => Math.min(parseFloat((s + 0.15).toFixed(2)), 2.2))
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
        - Top-aligned (items-start): PDF starts at top with zero negative-space clipping
        - Centered horizontally (justify-center)
        - Scrollable vertically & horizontally (overflow-y-auto, overflow-x-auto)
        - Flexible height adapting to screen with comfortable desktop bounds
      */}
      <div
        ref={scrollAreaRef}
        className="relative flex justify-center items-start overflow-y-auto overflow-x-auto w-full h-[75vh] min-h-[460px] max-h-[860px] p-2 sm:p-6 bg-neutral-900/60"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center my-auto">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground">
              Rendering sharp protected document...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center my-auto">
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

        <div className={`relative flex flex-col items-center pb-8 ${loading || error ? "hidden" : "flex"}`}>
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-lg bg-white block border border-neutral-800"
          />
        </div>

        {/* Security Watermark */}
        <div className="pointer-events-none fixed sm:absolute bottom-3 right-3 z-10 rounded bg-black/60 px-2 py-1 text-[9px] font-mono text-white/30 backdrop-blur-sm">
          Protected • Rahul Trade Warrior Academy
        </div>
      </div>
    </div>
  );
}
