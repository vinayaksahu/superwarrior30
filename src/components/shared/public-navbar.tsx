"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <BrandLogo href="/" size="md" />

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/courses"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Courses
          </Link>
          <Link
            href="/testimonials"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Testimonials
          </Link>
          <Link
            href="/about"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            About
          </Link>
          <Link
            href="/faq"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Contact
          </Link>
        </nav>

        {/* Actions & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground px-2.5 py-1.5 hidden sm:inline-block"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3.5 sm:px-4 text-xs font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          >
            Get Started
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
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
            href="/courses"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            Courses Catalog
          </Link>
          <Link
            href="/testimonials"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            Testimonials & Reviews
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            About Us
          </Link>
          <Link
            href="/faq"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
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
