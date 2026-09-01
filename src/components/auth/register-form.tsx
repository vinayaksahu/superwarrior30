"use client";

import { useActionState, use, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registerAction,
  verifyRegistrationOtpAction,
  resendRegistrationOtpAction,
} from "@/server/actions/auth.actions";
import type { ActionState } from "@/types";
import {
  Sparkles,
  Tag,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  Loader2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

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
  const router = useRouter();
  const { ref: initialRef } = use(searchParams);
  const [refCode, setRefCode] = useState(initialRef || "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification Step State
  const [step, setStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [isVerifyingOtp, startVerifyTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    registerAction,
    null
  );

  // Transition to OTP step when registration requires OTP
  useEffect(() => {
    if (state?.success && state?.data && typeof state.data === "object") {
      const data = state.data as {
        requiresOtp?: boolean;
        pendingToken?: string;
        emailMasked?: string;
        cooldownSeconds?: number;
      };

      if (data.requiresOtp && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setEmailMasked(data.emailMasked || "");
        setCooldownSeconds(data.cooldownSeconds || 60);
        setOtpError(null);
        setOtpSuccessMessage(state.message || "Verification code sent to your email.");
        setStep("OTP");
      }
    }
  }, [state]);

  // Resend Countdown Timer
  useEffect(() => {
    if (step !== "OTP" || cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, cooldownSeconds]);

  // Handle OTP Submission
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingToken) return;

    const cleanOtp = otpValue.replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpError(null);
    startVerifyTransition(async () => {
      const result = await verifyRegistrationOtpAction(pendingToken, cleanOtp);
      if (result.success && result.data?.destination) {
        router.push(result.data.destination);
      } else {
        setOtpError(result.message || "Invalid verification code. Please try again.");
      }
    });
  };

  // Handle Resend OTP
  const handleResendOtp = () => {
    if (!pendingToken || cooldownSeconds > 0 || isResending) return;

    setOtpError(null);
    startResendTransition(async () => {
      const result = await resendRegistrationOtpAction(pendingToken);
      if (result.success) {
        setCooldownSeconds(result.data?.cooldownSeconds || 60);
        setOtpSuccessMessage(result.message || "A new verification code has been sent.");
      } else {
        setOtpError(result.message || "Could not resend verification code. Please try again.");
      }
    });
  };

  // ----------------------------------------------------
  // STEP 2: REGISTRATION OTP VERIFICATION VIEW
  // ----------------------------------------------------
  if (step === "OTP") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-bold text-foreground">Verify Your Email Address</h2>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
          <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground">
              We dispatched a 6-digit verification code to:
            </p>
            <p className="font-mono font-bold text-primary text-sm">{emailMasked}</p>
            <p className="text-[11px] text-muted-foreground">
              Please enter the code below to complete your registration.
            </p>
          </div>
        </div>

        {otpSuccessMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {otpError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{otpError}</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="reg-otp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center">
              Enter 6-Digit Verification Code
            </label>
            <input
              id="reg-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={otpValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setOtpValue(val);
                if (val.length === 6) {
                  // Auto-submit on 6th digit
                  setTimeout(() => {
                    const btn = document.getElementById("reg-otp-submit-btn");
                    if (btn) btn.click();
                  }, 50);
                }
              }}
              placeholder="••••••"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] h-14 rounded-xl border-2 border-input bg-background font-bold focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <button
            id="reg-otp-submit-btn"
            type="submit"
            disabled={otpValue.length !== 6 || isVerifyingOtp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying Code...
              </>
            ) : (
              "Verify & Complete Registration"
            )}
          </button>
        </form>

        <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("DETAILS");
              setOtpError(null);
            }}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Details
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={cooldownSeconds > 0 || isResending}
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
            {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend Code"}
          </button>
        </div>
      </div>
    );
  }

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
