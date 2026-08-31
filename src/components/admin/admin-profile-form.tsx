"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction } from "@/server/actions/profile.actions";
import { User, Lock, KeyRound, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ActionState } from "@/types";

interface AdminProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    createdAt: Date;
  };
}

export function AdminProfileForm({ user }: AdminProfileFormProps) {
  const [profileState, profileAction, isProfilePending] = useActionState<ActionState | null, FormData>(
    updateProfileAction,
    null
  );

  const [passwordState, passwordAction, isPasswordPending] = useActionState<ActionState | null, FormData>(
    changePasswordAction,
    null
  );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* 1. Admin Profile Information */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Admin Profile Details</h2>
              <p className="text-xs text-muted-foreground">
                Update your display name, contact phone number, and account information.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/20">
            {user.role}
          </span>
        </div>

        {profileState?.message && (
          <div
            className={`rounded-xl border p-4 text-xs font-semibold flex items-center gap-2 ${
              profileState.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {profileState.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {profileState.message}
          </div>
        )}

        <form action={profileAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-foreground">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name || ""}
                required
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-foreground">
                Admin Email (Fixed)
              </label>
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="flex h-10 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-xs font-mono text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-semibold text-foreground">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone || ""}
                placeholder="+91 98765 43210"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Account Created</label>
              <input
                type="text"
                disabled
                value={new Date(user.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                className="flex h-10 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isProfilePending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProfilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Save Profile Details
            </button>
          </div>
        </form>
      </div>

      {/* 2. Change Admin Password */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Change Admin Password</h2>
            <p className="text-xs text-muted-foreground">
              Ensure your account is using a strong password. Updating your password will revoke all other active sessions.
            </p>
          </div>
        </div>

        {passwordState?.message && (
          <div
            className={`rounded-xl border p-4 text-xs font-semibold flex items-center gap-2 ${
              passwordState.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {passwordState.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {passwordState.message}
          </div>
        )}

        <form action={passwordAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-xs font-semibold text-foreground">
              Current Password <span className="text-destructive">*</span>
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              placeholder="Enter current password"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                New Password <span className="text-destructive">*</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                Confirm New Password <span className="text-destructive">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Repeat new password"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPasswordPending}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPasswordPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Update Password &amp; Invalidate Sessions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
