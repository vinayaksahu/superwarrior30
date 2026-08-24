"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/server/actions/auth.actions";
import { Loader2, Lock, CheckCircle } from "lucide-react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-4">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
        <h3 className="text-sm font-bold text-foreground">Password Reset Complete</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {state.message}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.message && !state.success && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-foreground">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
        {state?.errors?.password && (
          <p className="text-[11px] text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Re-type your password"
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
        {state?.errors?.confirmPassword && (
          <p className="text-[11px] text-destructive">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          "Save New Password"
        )}
      </button>
    </form>
  );
}
