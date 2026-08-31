"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, ShieldAlert, Mail, RefreshCw, Lock, Sparkles } from "lucide-react";

interface MaintenanceScreenProps {
  siteName?: string;
  supportEmail?: string;
}

export function MaintenanceScreen({
  siteName = "Super Warrior 30",
  supportEmail = "support@superwarrior30.com",
}: MaintenanceScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        {/* Brand Logo & Maintenance Icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo"
              className="h-16 w-16 rounded-2xl object-contain border border-amber-500/30 bg-card p-1 shadow-xl"
            />
            <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg">
              <Wrench className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-black text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5" /> Scheduled Maintenance
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {siteName} is Updating
            </h1>
          </div>
        </div>

        {/* Informative Card */}
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-5 text-left">
          <p className="text-sm text-muted-foreground leading-relaxed text-center sm:text-left">
            We are currently performing essential infrastructure upgrades, database performance optimizations, and feature enhancements to give you a smoother learning experience.
          </p>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Sparkles className="h-3.5 w-3.5" /> System Status
              </span>
              <span className="text-muted-foreground font-mono">
                Auto-refresh in {secondsLeft}s
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              All student records, course progress, and affiliate balances remain completely safe and will be accessible as soon as maintenance concludes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Page
            </button>

            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-all text-center"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Contact Support
              </a>
            )}
          </div>
        </div>

        {/* Footer with discreet Admin Login */}
        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <Lock className="h-3 w-3" /> Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
