"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogOut, Smartphone, AlertTriangle } from "lucide-react";

const PUBLIC_AND_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/faq",
  "/contact",
  "/about",
  "/api",
];

export function SessionGuard() {
  const pathname = usePathname();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    reason: "DISPLACED" | "REVOKED" | "BLOCKED" | "DEACTIVATED" | null;
    countdown: number;
  }>({
    isOpen: false,
    reason: null,
    countdown: 5,
  });

  const isCheckingRef = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/courses") ||
    PUBLIC_AND_AUTH_PATHS.some((p) => pathname.startsWith(p));

  const handleSignoutAndRedirect = useCallback(() => {
    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    const r = modalState.reason ? `?reason=${modalState.reason.toLowerCase()}` : "";
    window.location.href = `/api/auth/signout${r}`;
  }, [modalState.reason]);

  const checkSessionStatus = useCallback(async () => {
    // Don't run check if modal is already open or currently checking
    if (modalState.isOpen || isCheckingRef.current) return;
    // Skip checking on purely public or auth pages
    if (isPublicPage) return;

    try {
      isCheckingRef.current = true;
      const res = await fetch("/api/auth/session-status", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.authenticated === false && data.reason) {
        // Detected terminated/displaced session!
        setModalState({
          isOpen: true,
          reason: data.reason,
          countdown: 5,
        });

        // Start 5-second countdown timer to auto-redirect
        let count = 5;
        countdownIntervalRef.current = setInterval(() => {
          count -= 1;
          setModalState((prev) => ({ ...prev, countdown: count }));
          if (count <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            const r = data.reason ? `?reason=${data.reason.toLowerCase()}` : "";
            window.location.href = `/api/auth/signout${r}`;
          }
        }, 1000);
      }
    } catch {
      // Ignore network errors
    } finally {
      isCheckingRef.current = false;
    }
  }, [isPublicPage, modalState.isOpen]);

  useEffect(() => {
    // Initial check on mount and when navigating routes
    checkSessionStatus();

    // Check periodically every 5 seconds
    const interval = setInterval(checkSessionStatus, 5000);

    // Check immediately when user focuses the tab or unlocks phone
    const handleFocus = () => checkSessionStatus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionStatus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [checkSessionStatus]);

  if (!modalState.isOpen) return null;

  const isDisplaced = modalState.reason === "DISPLACED";
  const isBlocked = modalState.reason === "BLOCKED";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Icon Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive shadow-lg">
          {isDisplaced ? (
            <Smartphone className="h-8 w-8 animate-pulse" />
          ) : isBlocked ? (
            <ShieldAlert className="h-8 w-8 text-destructive animate-bounce" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          )}
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight text-foreground">
            {isDisplaced
              ? "Logged In on Another Device"
              : isBlocked
              ? "Account Security Lock"
              : "Session Expired / Terminated"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            {isDisplaced
              ? "Aapka account dusre device me login ho gaya hai. Security rules ke mutabik 1 time me sirf 1 device par login allowed hai. Is device se aapka session logout kar diya gaya hai."
              : isBlocked
              ? "Aapka account security limit exceed hone ki wajah se block kar diya gaya hai. Please administrator se contact karein."
              : "Aapka session admin dwara revoke kar diya gaya hai. Please dubara login karein."}
          </p>
        </div>

        {/* Countdown Badge */}
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 py-2.5 px-4 text-xs font-semibold text-muted-foreground border border-border">
          <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
          <span>
            Redirecting to login in{" "}
            <strong className="text-destructive font-black">
              {modalState.countdown}s
            </strong>
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSignoutAndRedirect}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Log In Again Now
        </button>
      </div>
    </div>
  );
}
