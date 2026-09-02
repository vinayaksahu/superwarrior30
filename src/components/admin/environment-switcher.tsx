"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  switchEnvironmentAction,
  toggleStaffTestingAction,
  switchStaffEnvironmentAction,
} from "@/server/actions/environment.actions";
import type { AppEnvironment } from "@/lib/env-context";
import {
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentSwitcherProps {
  currentEnvironment: AppEnvironment;
  isSuperAdmin: boolean;
  isStaffAdmin?: boolean;
  staffTestingAllowed?: boolean;
  initialVisibilityScope?: import("@/lib/env-context").TestVisibilityScope;
}

export function EnvironmentSwitcher({
  currentEnvironment,
  isSuperAdmin,
  isStaffAdmin = false,
  staffTestingAllowed = false,
  initialVisibilityScope = "ADMINS_ONLY",
}: EnvironmentSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [targetEnv, setTargetEnv] = useState<AppEnvironment | null>(null);
  const [allowStaffTesting, setAllowStaffTesting] = useState(staffTestingAllowed);
  const [staffTestingActive, setStaffTestingActive] = useState(staffTestingAllowed);
  const [visibilityScope, setVisibilityScope] = useState<import("@/lib/env-context").TestVisibilityScope>(
    initialVisibilityScope
  );
  const [error, setError] = useState<string | null>(null);

  const isLive = currentEnvironment === "LIVE";

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setShowModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [showModal, isPending]);

  // ==========================================
  // 1. STAFF ADMIN / SUBADMIN INTERACTION
  // ==========================================
  if (isStaffAdmin && !isSuperAdmin) {
    // Staff Admin can toggle their own session between LIVE and TEST
    const handleStaffSwitch = (env: AppEnvironment) => {
      startTransition(async () => {
        const res = await switchStaffEnvironmentAction(env);
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isLive ? (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">LIVE PRODUCTION</span>
              <span className="sm:hidden font-bold">LIVE</span>
              <button
                type="button"
                onClick={() => {
                  setTargetEnv("TEST");
                  setError(null);
                  setShowModal(true);
                }}
                disabled={isPending}
                className="ml-1 flex items-center gap-1 rounded bg-emerald-900/60 px-1.5 sm:px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/80 transition-colors cursor-pointer border border-emerald-700/50"
              >
                <FlaskConical className="h-3 w-3" />
                <span className="hidden sm:inline">Enter Testing Mode</span>
                <span className="sm:hidden">Test</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/40 bg-amber-950/50 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80"></span>
                <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500"></span>
              </span>
              <span className="hidden sm:inline">⚠️ TESTING MODE</span>
              <span className="sm:hidden">TEST</span>
              <button
                type="button"
                onClick={() => {
                  setTargetEnv("LIVE");
                  setError(null);
                  setShowModal(true);
                }}
                disabled={isPending}
                className="ml-1 flex items-center gap-1 rounded bg-amber-500 px-1.5 sm:px-2 py-0.5 text-[10px] font-extrabold text-black hover:bg-amber-400 transition-colors cursor-pointer shadow"
              >
                <ShieldCheck className="h-3 w-3" />
                <span className="hidden sm:inline">Return to Live</span>
                <span className="sm:hidden">Live</span>
              </button>
            </div>
          )}
        </div>

        {/* Staff Confirmation Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <button
                onClick={() => !isPending && setShowModal(false)}
                className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "rounded-full p-3 shrink-0",
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
                      ? "Switch to Testing Mode?"
                      : "Return to Live Production?"}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {targetEnv === "TEST" ? (
                      <>
                        Your staff session will switch to the{" "}
                        <strong className="text-amber-400 font-semibold">TEST database</strong>.
                        All actions will affect test data only.
                      </>
                    ) : (
                      <>
                        Your staff session will return to the{" "}
                        <strong className="text-emerald-400 font-semibold">
                          LIVE Production database
                        </strong>
                        .
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
                      onClick={() => targetEnv && handleStaffSwitch(targetEnv)}
                      disabled={isPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer shadow",
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

  // ==========================================
  // 2. SUPER ADMIN MASTER CONTROL
  // ==========================================
  const handleOpenModal = (env: AppEnvironment) => {
    setTargetEnv(env);
    setError(null);
    setShowModal(true);
  };

  const handleConfirmSwitch = () => {
    if (!targetEnv) return;

    startTransition(async () => {
      setError(null);
      const res = await switchEnvironmentAction(
        targetEnv,
        targetEnv === "TEST" ? allowStaffTesting : false,
        targetEnv === "TEST" ? visibilityScope : undefined
      );
      if (res.success) {
        setStaffTestingActive(Boolean(res.staffTestingActive));
        setShowModal(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to switch environment.");
      }
    });
  };

  const handleToggleStaffTesting = (enabled: boolean) => {
    startTransition(async () => {
      const res = await toggleStaffTestingAction(enabled);
      if (res.success) {
        setStaffTestingActive(res.staffTestingActive);
        setAllowStaffTesting(res.staffTestingActive);
        router.refresh();
      }
    });
  };

  const handleToggleVisibilityScope = (newScope: import("@/lib/env-context").TestVisibilityScope) => {
    startTransition(async () => {
      const { setTestVisibilityScopeAction } = await import("@/server/actions/environment.actions");
      const res = await setTestVisibilityScopeAction(newScope);
      if (res.success && res.scope) {
        setVisibilityScope(res.scope);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isLive ? (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">LIVE PRODUCTION</span>
            <span className="sm:hidden font-bold">LIVE</span>
            <button
              type="button"
              onClick={() => handleOpenModal("TEST")}
              disabled={isPending}
              className="ml-1 flex items-center gap-1 rounded bg-emerald-900/60 px-1.5 sm:px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/80 transition-colors cursor-pointer border border-emerald-700/50"
            >
              <FlaskConical className="h-3 w-3" />
              <span className="hidden sm:inline">Enter Testing Mode</span>
              <span className="sm:hidden">Test</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/40 bg-amber-950/50 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500"></span>
            </span>
            <span className="hidden sm:inline">⚠️ TESTING MODE</span>
            <span className="sm:hidden">TEST</span>

            {/* Quick Visibility Scope Switcher for Super Admin - hidden on small mobile to avoid header overflow */}
            <button
              type="button"
              onClick={() =>
                handleToggleVisibilityScope(
                  visibilityScope === "ADMINS_ONLY" ? "ADMINS_AND_HOMEPAGE" : "ADMINS_ONLY"
                )
              }
              disabled={isPending}
              title={
                visibilityScope === "ADMINS_AND_HOMEPAGE"
                  ? "Visibility: Admins + Homepage (Click to change to Admins Only)"
                  : "Visibility: Admins Only (Click to change to Admins + Homepage)"
              }
              className={cn(
                "hidden md:flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer border",
                visibilityScope === "ADMINS_AND_HOMEPAGE"
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30"
                  : "bg-black/40 border-amber-800/50 text-amber-400/80 hover:bg-black/60"
              )}
            >
              <span>
                Scope: {visibilityScope === "ADMINS_AND_HOMEPAGE" ? "Admins + Home" : "Admins Only"}
              </span>
            </button>

            {/* Quick Staff Testing Permission Toggle for Super Admin - hidden on mobile/tablet to avoid overflow */}
            <button
              type="button"
              onClick={() => handleToggleStaffTesting(!staffTestingActive)}
              disabled={isPending}
              title={
                staffTestingActive
                  ? "Staff Testing Permission is ENABLED (Click to disable for staff)"
                  : "Staff Testing Permission is DISABLED (Click to enable for staff)"
              }
              className={cn(
                "hidden lg:flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer border",
                staffTestingActive
                  ? "bg-amber-900/80 border-amber-600 text-amber-200 hover:bg-amber-800"
                  : "bg-black/40 border-amber-800/50 text-amber-400/80 hover:bg-black/60"
              )}
            >
              <Users className="h-3 w-3" />
              <span>Staff: {staffTestingActive ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal("LIVE")}
              disabled={isPending}
              className="ml-1 flex items-center gap-1 rounded bg-amber-500 px-1.5 sm:px-2 py-0.5 text-[10px] font-extrabold text-black hover:bg-amber-400 transition-colors cursor-pointer shadow"
            >
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden sm:inline">Return to Live</span>
              <span className="sm:hidden">Live</span>
            </button>
          </div>
        )}
      </div>

      {/* Super Admin Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <button
              onClick={() => !isPending && setShowModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "rounded-full p-3 shrink-0",
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

              <div className="flex-1 space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  {targetEnv === "TEST"
                    ? "Switch to Testing Mode?"
                    : "Return to Live Production?"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {targetEnv === "TEST" ? (
                    <>
                      Your Super Admin session will switch to the{" "}
                      <strong className="text-amber-400 font-semibold">TEST database</strong>.
                      All changes made in this mode affect{" "}
                      <strong className="text-foreground">TEST DATA ONLY</strong>.
                      Production data remains isolated and untouched.
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

                {/* Scope & Staff Settings when entering TEST mode */}
                {targetEnv === "TEST" && (
                  <div className="space-y-3 pt-1">
                    {/* Setting 1: Testing Mode Visibility Scope */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2.5">
                      <p className="text-xs font-bold text-amber-200">
                        Testing Mode Visibility Scope:
                      </p>
                      <div className="grid gap-2">
                        <label
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all",
                            visibilityScope === "ADMINS_ONLY"
                              ? "border-amber-500 bg-amber-500/10"
                              : "border-border bg-background hover:bg-accent/40"
                          )}
                        >
                          <input
                            type="radio"
                            name="modalVisibilityScope"
                            value="ADMINS_ONLY"
                            checked={visibilityScope === "ADMINS_ONLY"}
                            onChange={() => setVisibilityScope("ADMINS_ONLY")}
                            className="mt-0.5 h-3.5 w-3.5 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">
                              Option 1: Admins Only
                            </span>
                            <p className="text-[11px] text-muted-foreground leading-normal">
                              Testing data is visible <strong>only inside the Admin Panel</strong>. Public homepage continues showing Live Production data only.
                            </p>
                          </div>
                        </label>

                        <label
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all",
                            visibilityScope === "ADMINS_AND_HOMEPAGE"
                              ? "border-amber-500 bg-amber-500/10"
                              : "border-border bg-background hover:bg-accent/40"
                          )}
                        >
                          <input
                            type="radio"
                            name="modalVisibilityScope"
                            value="ADMINS_AND_HOMEPAGE"
                            checked={visibilityScope === "ADMINS_AND_HOMEPAGE"}
                            onChange={() => setVisibilityScope("ADMINS_AND_HOMEPAGE")}
                            className="mt-0.5 h-3.5 w-3.5 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">
                              Option 2: Admins + Homepage
                            </span>
                            <p className="text-[11px] text-muted-foreground leading-normal">
                              Testing data can be viewed by admins and the <strong>homepage testing preview</strong> with a visible testing banner.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Setting 2: Staff Admin Access */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowStaffTesting}
                          onChange={(e) => setAllowStaffTesting(e.target.checked)}
                          disabled={isPending}
                          className="mt-0.5 h-4 w-4 rounded border-amber-500 text-amber-500 focus:ring-amber-400 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-amber-200">
                            Enable Testing Mode for Staff Admins as well?
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {allowStaffTesting ? (
                              <span className="text-amber-300">
                                ✓ Staff admins can also switch between Test and Live modes.
                              </span>
                            ) : (
                              <span>
                                Only Super Admin will be in Testing Mode. Staff admins remain locked to Live Production.
                              </span>
                            )}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

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
                      "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer shadow",
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
export function TestingModeBanner({
  isSuperAdmin,
  isStaffAdmin = false,
}: {
  isSuperAdmin: boolean;
  isStaffAdmin?: boolean;
}) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span className="font-extrabold text-amber-300 uppercase tracking-wider">
          ⚠️ TESTING MODE ACTIVE:
        </span>
        <span className="font-medium text-amber-100">
          {isSuperAdmin
            ? "All changes are being made to the TEST database. Production client data is protected."
            : "Operating in Testing Mode authorized by Super Admin. Client data is protected."}
        </span>
      </div>
      <div className="text-[11px] text-amber-400/90 font-mono hidden md:block">
        DATABASE: TEST_DATABASE_URL
      </div>
    </div>
  );
}
