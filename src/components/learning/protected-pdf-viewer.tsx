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
} from "lucide-react";

interface ProtectedPdfViewerProps {
  pdfUrl: string;
  title: string;
}

export function ProtectedPdfViewer({ pdfUrl, title }: ProtectedPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF with self-hosted local pdf.min.js engine
  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const win = window as any;

        // Ensure pdfjsLib is loaded from local /pdf.min.js
        if (!win.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src="/pdf.min.js"]');
            if (existingScript) {
              existingScript.addEventListener("load", () => resolve());
              existingScript.addEventListener("error", () => reject(new Error("Failed to load PDF engine")));
              return;
            }

            const script = document.createElement("script");
            script.src = "/pdf.min.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF viewer engine"));
            document.head.appendChild(script);
          });
        }

        if (win.pdfjsLib) {
          win.pdfjsLib.GlobalWorkerOptions = win.pdfjsLib.GlobalWorkerOptions || {};
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }

        if (isCancelled) return;

        // Fetch PDF as ArrayBuffer directly from same-origin secure route
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error("Could not fetch document stream");

        const arrayBuffer = await response.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);

        const loadingTask = win.pdfjsLib.getDocument({
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
          setError("Failed to render document. Please try refreshing.");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Render current page onto Canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Auto-scale based on mobile screen width
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const fitScale = Math.min(Math.max((containerWidth - 24) / unscaledViewport.width, 0.5), 2.5);
        const actualScale = scale * fitScale;

        const viewport = page.getViewport({ scale: actualScale });

        // Handle Retina/High-DPI screens for crisp sharp text
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Canvas render error:", err);
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
    const handleResize = () => {
      if (pdfDoc) renderPage(currentPage);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, currentPage, renderPage]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full bg-neutral-950 rounded-2xl border border-border overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Controls Bar (Mobile & Desktop Friendly) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-neutral-900 border-b border-border/80 text-xs">
        <div className="flex items-center gap-2 truncate max-w-[180px] sm:max-w-xs">
          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-bold text-foreground truncate">{title}</span>
        </div>

        {totalPages > 0 && (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Page Navigation */}
            <div className="flex items-center rounded-lg bg-black/60 border border-border px-1 py-0.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-mono text-[11px] font-bold text-amber-400">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center rounded-lg bg-black/60 border border-border px-1 py-0.5">
              <button
                type="button"
                disabled={scale <= 0.7}
                onClick={() => setScale((s) => Math.max(s - 0.2, 0.7))}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <span className="px-1.5 font-mono text-[10px] text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>

              <button
                type="button"
                disabled={scale >= 2.0}
                onClick={() => setScale((s) => Math.min(s + 0.2, 2.0))}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas PDF Page Viewer (100% Mobile & Desktop Supported) */}
      <div className="relative flex min-h-[380px] sm:min-h-[600px] max-h-[85vh] w-full items-center justify-center overflow-auto p-1.5 sm:p-6 bg-neutral-900/60">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground">
              Rendering sharp protected document...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-lg bg-white transition-opacity duration-200 ${
            loading || error ? "hidden" : "block"
          }`}
          style={{ maxWidth: "100%", height: "auto" }}
        />

        {/* Security Watermark */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded bg-black/60 px-2 py-1 text-[9px] font-mono text-white/30 backdrop-blur-sm">
          Protected • Rahul Trade Warrior Academy
        </div>
      </div>
    </div>
  );
}
