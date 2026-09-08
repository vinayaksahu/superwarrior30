"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  loginAction,
  verifyLoginOtpAction,
  resendLoginOtpAction,
  verifyMfaLoginAction,
} from "@/server/actions/auth.actions";
import type { ActionState } from "@/types";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Key,
} from "lucide-react";

interface LoginFormProps {
  portal?: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
}

export function LoginForm({ portal = "STUDENT" }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    loginAction,
    null
  );

  const [urlNotice, setUrlNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Authentication Flow Step State
  const [step, setStep] = useState<"CREDENTIALS" | "OTP" | "MFA">("CREDENTIALS");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [isVerifyingOtp, startVerifyTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  // TOTP MFA Step State
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isUsingRecoveryCode, setIsUsingRecoveryCode] = useState(false);
  const [isVerifyingMfa, startVerifyMfaTransition] = useTransition();

  // Handle URL notifications (displaced session, etc.)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "displaced") {
        setUrlNotice(
          "Your account was logged in from another device. This session has been terminated."
        );
      } else if (reason === "admin_logout" || reason === "revoked") {
        setUrlNotice(
          "Your session was terminated by the administrator. Please log in again."
        );
      } else if (reason === "blocked") {
        setUrlNotice(
          "Your account has been locked due to security limits. Please contact support."
        );
      }
    }
  }, []);

  // When loginAction succeeds with requiresMfa or requiresOtp, transition step
  useEffect(() => {
    if (state?.success && state?.data && typeof state.data === "object") {
      const data = state.data as {
        requiresOtp?: boolean;
        pendingToken?: string;
        emailMasked?: string;
        cooldownSeconds?: number;
        requiresMfa?: boolean;
        challengeToken?: string;
      };

      if (data.requiresMfa && data.challengeToken) {
        setMfaChallengeToken(data.challengeToken);
        setMfaError(null);
        setStep("MFA");
      } else if (data.requiresOtp && data.pendingToken) {
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
      const result = await verifyLoginOtpAction(pendingToken, cleanOtp);
      if (result.success) {
        if (result.data?.requiresMfa && result.data?.challengeToken) {
          setMfaChallengeToken(result.data.challengeToken);
          setMfaError(null);
          setStep("MFA");
        } else if (result.data?.destination) {
          router.push(result.data.destination);
        }
      } else {
        setOtpError(result.message || "Invalid verification code. Please try again.");
      }
    });
  };

  // Handle MFA Verification Submission
  const handleVerifyMfa = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mfaChallengeToken) return;

    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      setMfaError("Please enter your verification code or recovery code.");
      return;
    }

    setMfaError(null);
    startVerifyMfaTransition(async () => {
      const result = await verifyMfaLoginAction(mfaChallengeToken, cleanCode);
      if (result.success && result.data?.destination) {
        router.push(result.data.destination);
      } else {
        setMfaError(result.message || "Invalid two-factor authentication code.");
      }
    });
  };

  // Handle Resend OTP
  const handleResendOtp = () => {
    if (!pendingToken || cooldownSeconds > 0 || isResending) return;

    setOtpError(null);
    startResendTransition(async () => {
      const result = await resendLoginOtpAction(pendingToken);
      if (result.success) {
        setCooldownSeconds(result.data?.cooldownSeconds || 60);
        setOtpSuccessMessage(result.message || "A new verification code has been sent.");
      } else {
        setOtpError(result.message || "Could not resend verification code. Please try again.");
      }
    });
  };

  // ----------------------------------------------------
  // VIEW: STEP 2 - OTP VERIFICATION
  // ----------------------------------------------------
  if (step === "OTP") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-bold text-foreground">Two-Step Verification</h2>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
          <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-foreground">
              Verification code sent
            </p>
            <p className="text-muted-foreground">
              We sent a 6-digit verification code to{" "}
              <strong className="text-foreground">{emailMasked}</strong>.
            </p>
          </div>
        </div>

        {otpSuccessMessage && !otpError && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {otpError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{otpError}</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2 text-center">
            <label
              htmlFor="otpCode"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Enter 6-Digit Code
            </label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={otpValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpValue(val);
                if (val.length === 6) {
                  // Auto submit when 6 digits are reached
                  setTimeout(() => {
                    if (pendingToken) {
                      setOtpError(null);
                      startVerifyTransition(async () => {
                        const res = await verifyLoginOtpAction(pendingToken, val);
                        if (res.success && res.data?.destination) {
                          router.push(res.data.destination);
                        } else {
                          setOtpError(res.message || "Invalid verification code.");
                        }
                      });
                    }
                  }, 100);
                }
              }}
              placeholder="••••••"
              className="flex h-14 w-full rounded-xl border-2 border-primary/40 bg-background text-center text-2xl font-bold tracking-[10px] font-mono text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <p className="text-[11px] text-muted-foreground">
              Code is valid for 5 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp || otpValue.length !== 6}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </button>
        </form>

        {/* Resend Code & Back Buttons */}
        <div className="pt-2 border-t border-border flex flex-col items-center gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Didn&apos;t receive the email?</span>
            {cooldownSeconds > 0 ? (
              <span className="font-semibold text-foreground">
                Resend in {cooldownSeconds}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Sending...
                  </>
                ) : (
                  "Resend Code"
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("CREDENTIALS");
              setOtpValue("");
              setOtpError(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: STEP 3 - TOTP MFA / RECOVERY CODE VERIFICATION
  // ----------------------------------------------------
  if (step === "MFA") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-bold text-foreground">Two-Factor Authentication</h2>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
          <Key className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-foreground">
              {isUsingRecoveryCode ? "Emergency Recovery Code" : "Authenticator App Required"}
            </p>
            <p className="text-muted-foreground">
              {isUsingRecoveryCode
                ? "Enter one of your single-use recovery codes (e.g. ABCDE-12345)."
                : "Enter the 6-digit security code generated by your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password)."}
            </p>
          </div>
        </div>

        {mfaError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{mfaError}</span>
          </div>
        )}

        <form onSubmit={handleVerifyMfa} className="space-y-4">
          <div className="space-y-2 text-center">
            <label
              htmlFor="mfaCode"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {isUsingRecoveryCode ? "Recovery Code" : "Enter 6-Digit Code"}
            </label>
            <input
              id="mfaCode"
              type="text"
              autoComplete="one-time-code"
              maxLength={isUsingRecoveryCode ? 16 : 6}
              autoFocus
              value={mfaCode}
              onChange={(e) => {
                const val = isUsingRecoveryCode
                  ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                  : e.target.value.replace(/\D/g, "").slice(0, 6);
                setMfaCode(val);
                if (!isUsingRecoveryCode && val.length === 6) {
                  // Auto-submit when 6 digits are reached
                  setTimeout(() => {
                    if (mfaChallengeToken) {
                      setMfaError(null);
                      startVerifyMfaTransition(async () => {
                        const res = await verifyMfaLoginAction(mfaChallengeToken, val);
                        if (res.success && res.data?.destination) {
                          router.push(res.data.destination);
                        } else {
                          setMfaError(res.message || "Invalid two-factor code.");
                        }
                      });
                    }
                  }, 100);
                }
              }}
              placeholder={isUsingRecoveryCode ? "XXXXX-XXXXX" : "••••••"}
              className={`flex h-14 w-full rounded-xl border-2 border-primary/40 bg-background text-center ${
                isUsingRecoveryCode
                  ? "text-lg font-mono tracking-widest"
                  : "text-2xl font-bold tracking-[10px] font-mono"
              } text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30`}
            />
            <p className="text-[11px] text-muted-foreground">
              {isUsingRecoveryCode
                ? "Recovery codes are single-use and will be consumed immediately."
                : "Codes refresh every 30 seconds."}
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isVerifyingMfa ||
              (isUsingRecoveryCode ? mfaCode.trim().length < 8 : mfaCode.length !== 6)
            }
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {isVerifyingMfa ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </button>
        </form>

        {/* Toggle between TOTP & Recovery Code + Back Button */}
        <div className="pt-2 border-t border-border flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsUsingRecoveryCode(!isUsingRecoveryCode);
              setMfaCode("");
              setMfaError(null);
            }}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            {isUsingRecoveryCode
              ? "Use 6-digit authenticator code instead"
              : "Lost authenticator access? Use emergency recovery code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("CREDENTIALS");
              setMfaCode("");
              setMfaError(null);
              setMfaChallengeToken(null);
              setIsUsingRecoveryCode(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: STEP 1 - EMAIL & PASSWORD CREDENTIALS
  // ----------------------------------------------------
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="loginPortal" value={portal} />
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {urlNotice && !state?.message && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{urlNotice}</span>
          </div>
        )}

        {state?.message && !state.success && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {(() => {
              const text = state.message;
              const urlRegex = /(https?:\/\/[^\s]+|\/(?:adminlogin|superadminlogin|login|forgot-password))/g;
              const parts = text.split(urlRegex);

              return (
                <div className="space-y-2">
                  <p>
                    {parts.map((part, i) => {
                      if (part.match(urlRegex)) {
                        const href = part.startsWith("http") ? new URL(part).pathname : part;
                        return (
                          <Link
                            key={i}
                            href={href}
                            className="inline-flex items-center gap-1 font-black underline underline-offset-4 text-primary hover:text-primary/80 transition-colors cursor-pointer ml-1"
                          >
                            {part}
                          </Link>
                        );
                      }
                      return part;
                    })}
                  </p>
                </div>
              );
            })()}
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : portal === "SUPER_ADMIN" ? (
            "Sign In to Super Admin"
          ) : portal === "ADMIN" ? (
            "Sign In to Admin Portal"
          ) : (
            "Sign In"
          )}
        </button>
      </div>
    </form>
  );
}
