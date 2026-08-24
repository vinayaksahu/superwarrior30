"use client";

import { useActionState } from "react";
import { saveAdminSettingsAction } from "@/server/actions/admin.actions";
import { Save, Loader2, Globe, Mail, Bell, ShieldAlert } from "lucide-react";
import type { ActionState } from "@/types";

interface AdminSettingsFormProps {
  initialSettings: {
    siteName: string;
    supportEmail: string;
    announcementBanner: string;
    isMaintenanceMode: boolean;
  };
}

export function AdminSettingsForm({ initialSettings }: AdminSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    saveAdminSettingsAction,
    null
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
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Platform Settings
        </button>
      </div>
    </form>
  );
}
