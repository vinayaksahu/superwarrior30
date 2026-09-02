"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchEnvironmentAction } from "@/server/actions/environment.actions";
import type { AppEnvironment } from "@/lib/env-context";
import {
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentSwitcherProps {
  currentEnvironment: AppEnvironment;
  isSuperAdmin: boolean;
}

export function EnvironmentSwitcher({
  currentEnvironment,
  isSuperAdmin,
}: EnvironmentSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [targetEnv, setTargetEnv] = useState<AppEnvironment | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return null;
  }

  const isLive = currentEnvironment === "LIVE";

  const handleOpenModal = (env: AppEnvironment) => {
    setTargetEnv(env);
    setError(null);
    setShowModal(true);
  };

  const handleConfirmSwitch = () => {
    if (!targetEnv) return;

    startTransition(async () => {
      setError(null);
      const res = await switchEnvironmentAction(targetEnv);
      if (res.success) {
        setShowModal(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to switch environment.");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isLive ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>LIVE PRODUCTION</span>
            <button
              type="button"
              onClick={() => handleOpenModal("TEST")}
              disabled={isPending}
              className="ml-1.5 flex items-center gap-1 rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/80 transition-colors cursor-pointer border border-emerald-700/50"
            >
              <FlaskConical className="h-3 w-3" />
              <span>Enter Testing Mode</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            </span>
            <span>⚠️ TESTING MODE</span>
            <button
              type="button"
              onClick={() => handleOpenModal("LIVE")}
              disabled={isPending}
              className="ml-1.5 flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-black hover:bg-amber-400 transition-colors cursor-pointer shadow"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Return to Live</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <button
              onClick={() => !isPending && setShowModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "rounded-full p-3",
                  targetEnv === "TEST"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                )}
              >
                {targetEnv === "TEST" ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-base font-bold text-foreground">
                  {targetEnv === "TEST"
                    ? "Enter Testing Mode?"
                    : "Return to Live Production?"}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {targetEnv === "TEST" ? (
                    <>
                      Your Super Admin session will switch to the{" "}
                      <strong className="text-amber-400 font-semibold">TEST database</strong>.
                      All changes made while in this mode affect{" "}
                      <strong className="text-foreground">TEST DATA ONLY</strong>.
                      Production data will remain untouched and protected.
                    </>
                  ) : (
                    <>
                      Your session will reconnect to the{" "}
                      <strong className="text-emerald-400 font-semibold">
                        LIVE Production database
                      </strong>
                      . All client and student data is live.
                    </>
                  )}
                </p>

                {error && (
                  <div className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isPending}
                    className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSwitch}
                    disabled={isPending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-black transition-all cursor-pointer shadow",
                      targetEnv === "TEST"
                        ? "bg-amber-500 hover:bg-amber-400 text-black"
                        : "bg-emerald-500 hover:bg-emerald-400 text-black"
                    )}
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {targetEnv === "TEST" ? "Enter Testing Mode" : "Return to Live"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Persistent high-visibility banner rendered when TEST MODE is active
 */
export function TestingModeBanner({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  if (!isSuperAdmin) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span className="font-extrabold text-amber-300 uppercase tracking-wider">
          ⚠️ TESTING MODE ACTIVE:
        </span>
        <span className="font-medium text-amber-100">
          All changes are being made to the TEST database. Production client data is protected.
        </span>
      </div>
      <div className="text-[11px] text-amber-400/90 font-mono hidden md:block">
        DATABASE: TEST_DATABASE_URL
      </div>
    </div>
  );
}
