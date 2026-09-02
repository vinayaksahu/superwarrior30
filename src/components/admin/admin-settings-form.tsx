"use client";

import { useState, useActionState } from "react";
import { saveAdminSettingsAction } from "@/server/actions/admin.actions";
import { Save, Loader2, Globe, Mail, Bell, ShieldAlert, Sliders, AlertTriangle } from "lucide-react";
import type { ActionState } from "@/types";

interface AdminSettingsFormProps {
  initialSettings: {
    siteName: string;
    supportEmail: string;
    announcementBanner: string;
    isMaintenanceMode: boolean;
    testVisibilityScope?: "ADMINS_ONLY" | "ADMINS_AND_HOMEPAGE";
    isSuperAdmin?: boolean;
    currentEnvironment?: "LIVE" | "TEST";
  };
}

export function AdminSettingsForm({ initialSettings }: AdminSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    saveAdminSettingsAction,
    null
  );

  const [visibilityScope, setVisibilityScope] = useState<"ADMINS_ONLY" | "ADMINS_AND_HOMEPAGE">(
    initialSettings.testVisibilityScope || "ADMINS_ONLY"
  );

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state?.message && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold ${
            state.success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Testing Mode Visibility Scope (SUPER_ADMIN ONLY) */}
      {initialSettings.isSuperAdmin && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-500" />
              Testing Mode Visibility Scope
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Mode:</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                  initialSettings.currentEnvironment === "TEST"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {initialSettings.currentEnvironment === "TEST" ? "⚠️ TESTING MODE" : "🟢 LIVE PRODUCTION"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Configure where Testing Mode data is accessible when Super Admin enables Testing Mode. Public production visitors always receive Live data by default.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              {/* Option 1: Admins Only */}
              <label
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  visibilityScope === "ADMINS_ONLY"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border bg-background hover:bg-accent/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="testVisibilityScope"
                    value="ADMINS_ONLY"
                    checked={visibilityScope === "ADMINS_ONLY"}
                    onChange={() => setVisibilityScope("ADMINS_ONLY")}
                    className="h-4 w-4 mt-0.5 text-primary border-input focus:ring-primary"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Option 1: Admins Only</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Testing data is visible <strong>only inside the Admin Panel</strong> for authorized administrators. The public homepage continues showing <strong>LIVE PRODUCTION data only</strong>.
                    </p>
                  </div>
                </div>
              </label>

              {/* Option 2: Admins + Homepage */}
              <label
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  visibilityScope === "ADMINS_AND_HOMEPAGE"
                    ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/40 shadow-xs"
                    : "border-border bg-background hover:bg-accent/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="testVisibilityScope"
                    value="ADMINS_AND_HOMEPAGE"
                    checked={visibilityScope === "ADMINS_AND_HOMEPAGE"}
                    onChange={() => setVisibilityScope("ADMINS_AND_HOMEPAGE")}
                    className="h-4 w-4 mt-0.5 text-amber-500 border-input focus:ring-amber-500"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Option 2: Admins + Homepage</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Testing data can be viewed by authorized admins and the <strong>homepage/landing-page testing experience</strong> with a clear testing banner.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {visibilityScope === "ADMINS_AND_HOMEPAGE" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> When Testing Mode is active and scope is &quot;Admins + Homepage&quot;, the public homepage will display testing courses and testimonials with a visible preview banner. Production data remains completely isolated and untouched.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          General Platform Branding
        </h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="siteName" className="text-xs font-semibold text-foreground">
              Platform / Brand Name <span className="text-destructive">*</span>
            </label>
            <input
              id="siteName"
              name="siteName"
              type="text"
              defaultValue={initialSettings.siteName}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="supportEmail" className="text-xs font-semibold text-foreground">
              Official Support Email <span className="text-destructive">*</span>
            </label>
            <input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={initialSettings.supportEmail}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="announcementBanner" className="text-xs font-semibold text-foreground">
              Announcement Banner Text (Optional)
            </label>
            <input
              id="announcementBanner"
              name="announcementBanner"
              type="text"
              defaultValue={initialSettings.announcementBanner}
              placeholder="e.g. ⚡ Live Options Strategy Workshop Registration Open!"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          System Maintenance
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isMaintenanceMode"
            value="true"
            defaultChecked={initialSettings.isMaintenanceMode}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <div>
            <p className="text-xs font-semibold text-foreground">Maintenance Mode</p>
            <p className="text-[11px] text-muted-foreground">
              Temporarily restrict public access while system updates or database migrations take place.
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Platform Settings
        </button>
      </div>
    </form>
  );
}
