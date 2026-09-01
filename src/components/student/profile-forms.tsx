"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTheme } from "next-themes";
import { updateProfileAction, changePasswordAction } from "@/server/actions/profile.actions";
import { Loader2, Save, KeyRound, User, Lock, Sun, Moon, Laptop, Eye, EyeOff } from "lucide-react";
import type { ActionState } from "@/types";

interface ProfileFormsProps {
  initialName: string;
  initialPhone: string;
  email: string;
}

export function ProfileForms({
  initialName,
  initialPhone,
  email,
}: ProfileFormsProps) {
  const [profileState, profileFormAction, isProfilePending] = useActionState<
    ActionState | null,
    FormData
  >(updateProfileAction, null);

  const [passwordState, passwordFormAction, isPasswordPending] = useActionState<
    ActionState | null,
    FormData
  >(changePasswordAction, null);

  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Update Profile Details */}
      <form
        action={profileFormAction}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Personal Details</h3>
          </div>

          {profileState?.message && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-semibold ${
                profileState.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {profileState.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={initialName}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {profileState?.errors?.name && (
              <p className="text-[11px] text-destructive">{profileState.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-foreground">
              Email Address (Immutable)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="flex h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-xs opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-semibold text-foreground">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initialPhone}
              placeholder="+91 98765 43210"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isProfilePending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {isProfilePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </form>

      {/* 2. Change Password Form */}
      <form
        action={passwordFormAction}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <KeyRound className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Change Password</h3>
          </div>

          {passwordState?.message && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-semibold ${
                passwordState.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {passwordState.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-xs font-semibold text-foreground">
              Current Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-10 text-xs ring-offset-background"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordState?.errors?.currentPassword && (
              <p className="text-[11px] text-destructive">{passwordState.errors.currentPassword[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
              New Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                minLength={8}
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-10 text-xs ring-offset-background"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordState?.errors?.newPassword && (
              <p className="text-[11px] text-destructive">{passwordState.errors.newPassword[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
              Confirm New Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                minLength={8}
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-10 text-xs ring-offset-background"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordState?.errors?.confirmPassword && (
              <p className="text-[11px] text-destructive">{passwordState.errors.confirmPassword[0]}</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPasswordPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground shadow hover:bg-secondary/80 disabled:opacity-50 cursor-pointer"
          >
            {isPasswordPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Update Password
          </button>
        </div>
      </form>

      {/* 3. Theme & Appearance Settings Card */}
      <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-400" />
            <h3 className="text-base font-bold text-foreground">Theme & Visual Appearance</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Saved automatically across sessions
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Choose your preferred visual theme for the classroom player, dashboards, and trading materials.
        </p>

        <ThemeRadioSelector />
      </div>
    </div>
  );
}

function ThemeRadioSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme || "dark";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
      {/* Dark Theme Option */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
          currentTheme === "dark"
            ? "border-amber-400 bg-amber-400/10 shadow-sm"
            : "border-border bg-background hover:bg-muted"
        }`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-amber-400 shrink-0">
          <Moon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Dark Obsidian</p>
          <p className="text-[10px] text-muted-foreground">High contrast trading night mode</p>
        </div>
      </button>

      {/* Light Theme Option */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
          currentTheme === "light"
            ? "border-amber-400 bg-amber-400/10 shadow-sm"
            : "border-border bg-background hover:bg-muted"
        }`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-amber-500 shrink-0 shadow-sm">
          <Sun className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Light Clean</p>
          <p className="text-[10px] text-muted-foreground">Bright crisp day mode</p>
        </div>
      </button>

      {/* System Theme Option */}
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
          currentTheme === "system"
            ? "border-amber-400 bg-amber-400/10 shadow-sm"
            : "border-border bg-background hover:bg-muted"
        }`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted border border-border text-foreground shrink-0">
          <Laptop className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">System Default</p>
          <p className="text-[10px] text-muted-foreground">Matches your device preferences</p>
        </div>
      </button>
    </div>
  );
}
