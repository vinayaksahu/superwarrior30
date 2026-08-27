"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction } from "@/server/actions/auth.actions";
import type { ActionState } from "@/types";
import { AlertCircle } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    loginAction,
    null
  );
  const [urlNotice, setUrlNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "displaced") {
        setUrlNotice(
          "Aapka account dusre device me login hua tha, isliye is device se session logout ho gaya hai."
        );
      } else if (reason === "revoked") {
        setUrlNotice(
          "Aapka session admin dwara revoke kar diya gaya hai. Dubara login karein."
        );
      } else if (reason === "blocked") {
        setUrlNotice(
          "Security limit exceed hone ki wajah se account lock kiya gaya hai. Admin se sampark karein."
        );
      }
    }
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {urlNotice && !state?.message && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{urlNotice}</span>
          </div>
        )}

        {state?.message && !state.success && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.message}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {state?.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}
