"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, QrCode as QrIcon } from "lucide-react";

interface DynamicQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

export function DynamicQrCode({
  value,
  size = 180,
  className = "",
  alt = "QR Code",
  margin = 1,
  darkColor = "#000000",
  lightColor = "#ffffff",
}: DynamicQrCodeProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!value || !value.trim()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Generate SVG string (vector, razor-sharp on all screens, zero external requests)
    QRCode.toString(value.trim(), {
      type: "svg",
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("QRCode SVG generation error, falling back to data URL:", err);
        // Fallback to dataURL
        QRCode.toDataURL(value.trim(), {
          margin,
          width: size,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        })
          .then((url) => {
            if (isMounted) {
              setDataUrl(url);
              setLoading(false);
            }
          })
          .catch((dataErr) => {
            console.error("QRCode fallback failed:", dataErr);
            if (isMounted) {
              setError("Failed to render QR");
              setLoading(false);
            }
          });
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, margin, darkColor, lightColor]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-white rounded-lg border border-border/40 ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || (!svgContent && !dataUrl)) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted/20 rounded-lg p-3 text-center border border-dashed border-border ${className}`}
        style={{ width: size, height: size }}
      >
        <QrIcon className="h-8 w-8 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground font-mono break-all px-1">
          {value ? value.slice(0, 10) + "..." : "No Address"}
        </span>
      </div>
    );
  }

  if (svgContent) {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg bg-white object-contain ${className}`}
    />
  );
}
