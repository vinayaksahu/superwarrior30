"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface StandaloneAppRedirectProps {
  isAuthenticated: boolean;
}

export function StandaloneAppRedirect({ isAuthenticated }: StandaloneAppRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if running inside installed Android App (TWA) or standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://") ||
      new URLSearchParams(window.location.search).get("source") === "pwa";

    if (isStandalone) {
      // Skip hero page and go straight to student portal / login
      const target = isAuthenticated ? "/dashboard" : "/login";
      router.replace(target);
    }
  }, [router, isAuthenticated]);

  return null;
}
