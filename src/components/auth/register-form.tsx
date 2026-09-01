"use client";

import { useActionState, use, useState, useEffect } from "react";
import { registerAction } from "@/server/actions/auth.actions";
import type { ActionState } from "@/types";
import { Sparkles, Tag, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface RegisterFormProps {
  searchParams: Promise<{ ref?: string }>;
  referralDiscountPercentage?: number;
  isReferralDiscountEnabled?: boolean;
}

export function RegisterForm({
  searchParams,
  referralDiscountPercentage = 10,
  isReferralDiscountEnabled = true,
}: RegisterFormProps) {
  const { ref: initialRef } = use(searchParams);
  const [refCode, setRefCode] = useState(initialRef || "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    registerAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {state?.message && !state.success && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.message}
          </div>
        )}

        {/* Dynamic Referral Discount Banner */}
        {isReferralDiscountEnabled && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-3.5 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-foreground block">
                🎁 Referral Bonus: {referralDiscountPercentage}% Instant Discount
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Use a friend or mentor&apos;s referral code below to unlock an instant {referralDiscountPercentage}% discount on your course enrollment!
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium leading-none">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium leading-none"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            {state?.errors?.confirmPassword && (
              <p className="text-xs text-destructive">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="referralCode"
                className="text-sm font-medium leading-none"
              >
                Referral Code{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              {isReferralDiscountEnabled && (
                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {referralDiscountPercentage}% Discount
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase ring-offset-background placeholder:text-muted-foreground placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {refCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{referralDiscountPercentage}% OFF</span>
                </div>
              )}
            </div>
            {state?.errors?.referralCode && (
              <p className="text-xs text-destructive">
                {state.errors.referralCode[0]}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Creating account..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
