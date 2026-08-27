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
    reason: "DISPLACED" | "ADMIN_LOGOUT" | "REVOKED" | "BLOCKED" | "DEACTIVATED" | null;
    countdown: number;
  }>({
    isOpen: false,
    reason: null,
    countdown: 5,
  });

  const isCheckingRef = useRef(false);

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/courses") ||
    PUBLIC_AND_AUTH_PATHS.some((p) => pathname.startsWith(p));

  const handleSignoutAndRedirect = useCallback(() => {
    const r = modalState.reason ? `?reason=${modalState.reason.toLowerCase()}` : "";
    window.location.href = `/api/auth/signout${r}`;
  }, [modalState.reason]);

  const checkSessionStatus = useCallback(async () => {
    if (modalState.isOpen || isCheckingRef.current || isPublicPage) return;

    try {
      isCheckingRef.current = true;
      const res = await fetch("/api/auth/session-status", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.authenticated === false && data.reason) {
        setModalState({
          isOpen: true,
          reason: data.reason,
          countdown: 5,
        });
      }
    } catch {
      // Ignore network errors
    } finally {
      isCheckingRef.current = false;
    }
  }, [isPublicPage, modalState.isOpen]);

  // Periodic heartbeat polling and window focus listeners
  useEffect(() => {
    if (modalState.isOpen) return;

    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 4000);

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
    };
  }, [checkSessionStatus, modalState.isOpen]);

  // Reliable countdown timer when modal opens
  useEffect(() => {
    if (!modalState.isOpen) return;

    const timer = setInterval(() => {
      setModalState((prev) => {
        if (prev.countdown <= 1) {
          clearInterval(timer);
          const r = prev.reason ? `?reason=${prev.reason.toLowerCase()}` : "";
          window.location.href = `/api/auth/signout${r}`;
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modalState.isOpen]);

  if (!modalState.isOpen) return null;

  const isDisplaced = modalState.reason === "DISPLACED";
  const isAdminLogout = modalState.reason === "ADMIN_LOGOUT" || modalState.reason === "REVOKED";
  const isBlocked = modalState.reason === "BLOCKED";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Icon Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive shadow-lg">
          {isAdminLogout ? (
            <ShieldAlert className="h-8 w-8 text-destructive animate-pulse" />
          ) : isDisplaced ? (
            <Smartphone className="h-8 w-8 animate-pulse" />
          ) : isBlocked ? (
            <ShieldAlert className="h-8 w-8 text-destructive animate-bounce" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          )}
        </div>

        {/* Title and Description in English */}
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight text-foreground">
            {isAdminLogout
              ? "Session Terminated by Admin"
              : isDisplaced
              ? "Logged In on Another Device"
              : isBlocked
              ? "Account Security Lock"
              : "Session Terminated"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            {isAdminLogout
              ? "Your active session has been terminated by the administrator. You have been safely logged out. Please log in again to continue."
              : isDisplaced
              ? "You have been logged in from another device. For security purposes, only 1 active device session is permitted at a time. Your session on this device has been terminated."
              : isBlocked
              ? "Your account has been locked due to exceeding the allowed device limit. Please contact the administrator for assistance."
              : "Your session has ended. Please log in again to continue."}
          </p>
        </div>

        {/* Countdown Badge */}
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 py-2.5 px-4 text-xs font-semibold text-muted-foreground border border-border">
          <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
          <span>
            Redirecting to login in{" "}
            <strong className="text-destructive font-black tabular-nums">
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
