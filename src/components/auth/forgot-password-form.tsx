"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/server/actions/auth.actions";
import { Loader2, Mail, CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
        <h3 className="text-sm font-bold text-foreground">Instructions Dispatched</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && !state.success && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-foreground">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          "Send Reset Link"
        )}
      </button>
    </form>
  );
}
