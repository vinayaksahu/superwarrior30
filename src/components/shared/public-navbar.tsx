"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";

interface PublicNavbarProps {
  isTestMode?: boolean;
}

export function PublicNavbar({ isTestMode = false }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const scrollToSection = useCallback((sectionId: string, smooth = true) => {
    let attempts = 0;
    const maxAttempts = 15;

    const tryScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryScroll, 100);
      }
    };

    tryScroll();
  }, []);

  // Handle URL hash on load or hash change, fixing any duplicate hashes like #testimonials#testimonials
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHash = () => {
      const rawHash = window.location.hash;
      if (!rawHash) return;

      // Extract target section ID cleanly (handles '#testimonials#testimonials' -> 'testimonials')
      const cleaned = rawHash.replace(/^#+/, "");
      const sectionId = cleaned.split("#")[0]?.trim();

      if (sectionId) {
        if (rawHash !== `#${sectionId}`) {
          window.history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
        }
        scrollToSection(sectionId, true);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [pathname, scrollToSection]);

  // Handle Escape key and body scroll lock for mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    setMobileOpen(false);

    const isHomePage =
      pathname === "/" ||
      (typeof window !== "undefined" &&
        (window.location.pathname === "/" || window.location.pathname === ""));

    if (isHomePage) {
      scrollToSection(sectionId, true);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/#${sectionId}`);
      }
    } else {
      router.push(`/#${sectionId}`);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    setMobileOpen(false);
    const isHomePage =
      pathname === "/" ||
      (typeof window !== "undefined" &&
        (window.location.pathname === "/" || window.location.pathname === ""));

    if (isHomePage) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      {/* Test Mode Notification Banner */}
      {isTestMode && (
        <div className="w-full bg-amber-500/20 border-b border-amber-500/40 px-3 py-1.5 text-center flex items-center justify-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400">
            ⚠️ TEST MODE ACTIVE (Admins + Homepage) — Test Environment Data
          </span>
        </div>
      )}

      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-6 min-w-0">
        <div onClick={handleLogoClick} className="cursor-pointer">
          <BrandLogo href="/" size="md" isTestMode={isTestMode} />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#courses"
            onClick={(e) => handleSectionClick(e, "courses")}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          >
            Courses
          </Link>
          <Link
            href="/#testimonials"
            onClick={(e) => handleSectionClick(e, "testimonials")}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          >
            Testimonials
          </Link>
          <Link
            href="/#about"
            onClick={(e) => handleSectionClick(e, "about")}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          >
            About
          </Link>
          <Link
            href="/#faq"
            onClick={(e) => handleSectionClick(e, "faq")}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          >
            FAQ
          </Link>
          <Link
            href="/#contact"
            onClick={(e) => handleSectionClick(e, "contact")}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          >
            Contact
          </Link>
        </nav>

        {/* Actions & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeToggle />

          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground px-2.5 py-1.5 hidden sm:inline-block"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-2.5 sm:px-4 text-xs font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 shrink-0"
          >
            Get Started
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:bg-accent md:hidden cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <Link
            href="/#courses"
            onClick={(e) => handleSectionClick(e, "courses")}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
          >
            Courses
          </Link>
          <Link
            href="/#testimonials"
            onClick={(e) => handleSectionClick(e, "testimonials")}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
          >
            Testimonials & Reviews
          </Link>
          <Link
            href="/#about"
            onClick={(e) => handleSectionClick(e, "about")}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
          >
            About Methodology
          </Link>
          <Link
            href="/#faq"
            onClick={(e) => handleSectionClick(e, "faq")}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
          >
            FAQ
          </Link>
          <Link
            href="/#contact"
            onClick={(e) => handleSectionClick(e, "contact")}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
          >
            Contact
          </Link>
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <ThemeToggle showLabel />
          </div>
        </div>
      )}
    </header>
  );
}
