"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionTag, setVersionTag] = useState<string>("1.0.1");
  const [dismissed, setDismissed] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  // Apply update and reload
  const handleUpdate = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
    }
    // Hard refresh to pull fresh deployed scripts
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  // Periodic version checker against /api/app-version
  const checkServerVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.version) {
        setVersionTag(data.version);
        const storedVersion = localStorage.getItem("sw30_app_version");
        if (storedVersion && storedVersion !== data.version) {
          setUpdateAvailable(true);
        } else if (!storedVersion) {
          localStorage.setItem("sw30_app_version", data.version);
        }
      }
    } catch {
      // Ignore network errors during offline
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshHandler: () => void;

    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // 1. If an update is already waiting, prompt immediately
          if (registration.waiting) {
            waitingWorkerRef.current = registration.waiting;
            setUpdateAvailable(true);
          }

          // 2. Listen for new service worker installation
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content is available; please refresh.
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
              }
            });
          });

          // 3. Periodically check for updates (every 10 minutes)
          const intervalId = setInterval(() => {
            registration.update().catch(() => {});
            checkServerVersion();
          }, 10 * 60 * 1000);

          // 4. Also check whenever app becomes visible/focused
          const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
              registration.update().catch(() => {});
              checkServerVersion();
            }
          };
          document.addEventListener("visibilitychange", onVisibilityChange);

          return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisibilityChange);
          };
        })
        .catch((error) => {
          console.error("PWA Service Worker registration failed:", error);
        });
    };

    // Auto-reload on controller change (after skipWaiting)
    refreshHandler = () => {
      // Controller changed, new SW took over
    };
    navigator.serviceWorker.addEventListener("controllerchange", refreshHandler);

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    // Initial check of server version
    checkServerVersion();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("load", registerSW);
        navigator.serviceWorker.removeEventListener("controllerchange", refreshHandler);
      }
    };
  }, [checkServerVersion]);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-xl p-4 shadow-2xl shadow-primary/20 text-card-foreground">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/20 p-2 text-primary shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">Naya Update Available!</h4>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                v{versionTag}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Super Warrior 30 / Trade Warrior Academy me naye updates aur improvements ready hain. Turant reload karke update karein!
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Update Now
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Baad me
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            aria-label="Close update alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
