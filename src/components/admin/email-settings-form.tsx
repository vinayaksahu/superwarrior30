"use client";

import { useActionState, useState } from "react";
import {
  saveEmailSettingsAction,
  sendTestEmailAction,
  type EmailSettingsData,
} from "@/server/actions/email-settings.actions";
import type { ActionState } from "@/types";
import {
  Mail,
  ShieldCheck,
  Server,
  Lock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sliders,
  ShieldAlert,
} from "lucide-react";

interface EmailSettingsFormProps {
  initialSettings: EmailSettingsData;
}

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const [saveState, saveFormAction, isSavePending] = useActionState<ActionState | null, FormData>(
    saveEmailSettingsAction,
    null
  );

  const [testState, testFormAction, isTestPending] = useActionState<ActionState | null, FormData>(
    sendTestEmailAction,
    null
  );

  const [isOtpEnabled, setIsOtpEnabled] = useState(initialSettings.otp.isEnabled);
  const [isStaffOtpEnabled, setIsStaffOtpEnabled] = useState(initialSettings.otp.isStaffOtpEnabled);
  const [isStudentOtpEnabled, setIsStudentOtpEnabled] = useState(initialSettings.otp.isStudentOtpEnabled);
  const [isRegistrationOtpEnabled, setIsRegistrationOtpEnabled] = useState(initialSettings.otp.isRegistrationOtpEnabled);
  const [isPasswordResetOtpEnabled, setIsPasswordResetOtpEnabled] = useState(initialSettings.otp.isPasswordResetOtpEnabled);
  const [testEmailInput, setTestEmailInput] = useState("");

  const isConnected = initialSettings.smtp.connection.connected;

  return (
    <div className="space-y-8">
      {/* 1. Namecheap SMTP Mailbox Status */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Namecheap Private Email (SMTP)</h2>
              <p className="text-xs text-muted-foreground">
                Centralized production mailbox for all LMS authentication &amp; transactional emails
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                SMTP Online (SSL/TLS)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {initialSettings.smtp.hasPassword ? "SMTP Connection Failed" : "SMTP_PASSWORD Missing"}
              </span>
            )}
          </div>
        </div>

        {initialSettings.smtp.connection.error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">SMTP Connection Notice</p>
              <p>{initialSettings.smtp.connection.error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              SMTP Server Host
            </span>
            <p className="text-xs font-mono font-bold text-foreground">
              {initialSettings.smtp.host}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Port &amp; Security
            </span>
            <p className="text-xs font-mono font-bold text-foreground">
              {initialSettings.smtp.port} (SSL / TLS)
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Sender Mailbox
            </span>
            <p className="text-xs font-mono font-bold text-foreground truncate" title={initialSettings.smtp.user}>
              {initialSettings.smtp.user}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Password Security
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Encrypted in Env</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          SMTP credentials are read from server environment variables (<code>SMTP_PASSWORD</code>) and are never exposed to browser clients or committed to source control.
        </p>
      </div>

      {/* 2. Global OTP Security Policies */}
      <form action={saveFormAction} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Email OTP Security Policies</h2>
            <p className="text-xs text-muted-foreground">
              Configure two-factor email verification rules for Sub-Admins, Staff, and Students
            </p>
          </div>
        </div>

        {saveState?.message && (
          <div
            className={`rounded-xl border p-3.5 flex items-start gap-2.5 text-xs font-semibold ${
              saveState.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {saveState.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{saveState.message}</span>
          </div>
        )}

        {/* Super Admin Exemption Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground">
              Super Admin Direct Access (No OTP Required)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Super Admin (<span className="font-bold text-amber-400">vinayaksahu3@gmail.com</span> / Root Authority) <span className="font-bold text-foreground">never requires OTP for sign-in</span>. Direct credential login ensures zero system lockouts regardless of email server availability.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Role-Based &amp; Event-Based OTP Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff / Sub-Admin Login 2FA */}
            <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                id="isStaffOtpEnabled"
                name="isStaffOtpEnabled"
                checked={isStaffOtpEnabled}
                onChange={(e) => setIsStaffOtpEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="isStaffOtpEnabled" className="text-xs font-bold text-foreground cursor-pointer block">
                  Staff &amp; Sub-Admins Login (2FA)
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Require a 6-digit email OTP verification code when Sub-Admins, Support, and Staff members sign in at <code>/adminlogin</code>.
                </p>
              </div>
            </div>

            {/* Student Login 2FA */}
            <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                id="isStudentOtpEnabled"
                name="isStudentOtpEnabled"
                checked={isStudentOtpEnabled}
                onChange={(e) => setIsStudentOtpEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="isStudentOtpEnabled" className="text-xs font-bold text-foreground cursor-pointer block">
                  Student Accounts Login (2FA)
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Require a 6-digit email OTP verification code when enrolled students sign in at <code>/login</code>.
                </p>
              </div>
            </div>

            {/* Student Registration / Signup Verification */}
            <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                id="isRegistrationOtpEnabled"
                name="isRegistrationOtpEnabled"
                checked={isRegistrationOtpEnabled}
                onChange={(e) => setIsRegistrationOtpEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="isRegistrationOtpEnabled" className="text-xs font-bold text-foreground cursor-pointer block">
                  Student Registration Verification
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Require email verification via OTP before activating new student accounts or completing course registrations.
                </p>
              </div>
            </div>

            {/* Password Reset OTP */}
            <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                id="isPasswordResetOtpEnabled"
                name="isPasswordResetOtpEnabled"
                checked={isPasswordResetOtpEnabled}
                onChange={(e) => setIsPasswordResetOtpEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="isPasswordResetOtpEnabled" className="text-xs font-bold text-foreground cursor-pointer block">
                  Forgot Password Recovery OTP
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Require email OTP verification code before allowing users to reset their account passwords.
                </p>
              </div>
            </div>
          </div>

          {/* Master Email OTP Fallback Toggle */}
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 mt-2">
            <input
              type="checkbox"
              id="isEmailOtpEnabled"
              name="isEmailOtpEnabled"
              checked={isOtpEnabled}
              onChange={(e) => setIsOtpEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
            />
            <div className="space-y-0.5">
              <label htmlFor="isEmailOtpEnabled" className="text-xs font-bold text-foreground cursor-pointer">
                Global Master OTP Switch
              </label>
              <p className="text-[10px] text-muted-foreground">
                Fallback master toggle. When individual role flags are not set, this controls platform-wide 2FA.
              </p>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-2">
            Security &amp; Rate-Limiting Tuning
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* OTP Expiration */}
            <div className="space-y-1.5">
              <label htmlFor="expirationMinutes" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                OTP Expiration
              </label>
              <div className="relative">
                <input
                  id="expirationMinutes"
                  name="expirationMinutes"
                  type="number"
                  min="1"
                  max="60"
                  defaultValue={initialSettings.otp.expirationMinutes}
                  className="flex h-10 w-full rounded-xl border border-input bg-background pl-3.5 pr-14 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                  mins
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Default: 5 minutes</p>
            </div>

            {/* Resend Cooldown */}
            <div className="space-y-1.5">
              <label htmlFor="resendCooldownSeconds" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Resend Cooldown
              </label>
              <div className="relative">
                <input
                  id="resendCooldownSeconds"
                  name="resendCooldownSeconds"
                  type="number"
                  min="15"
                  max="300"
                  defaultValue={initialSettings.otp.resendCooldownSeconds}
                  className="flex h-10 w-full rounded-xl border border-input bg-background pl-3.5 pr-12 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                  sec
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Default: 60 seconds</p>
            </div>

            {/* Max Verification Attempts */}
            <div className="space-y-1.5">
              <label htmlFor="maxAttempts" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                Max Failed Attempts
              </label>
              <input
                id="maxAttempts"
                name="maxAttempts"
                type="number"
                min="1"
                max="10"
                defaultValue={initialSettings.otp.maxAttempts}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Per OTP (Locks code after limit)</p>
            </div>

            {/* Max Resends per Window */}
            <div className="space-y-1.5">
              <label htmlFor="maxResendsPerWindow" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Max Resends / 15m
              </label>
              <input
                id="maxResendsPerWindow"
                name="maxResendsPerWindow"
                type="number"
                min="1"
                max="20"
                defaultValue={initialSettings.otp.maxResendsPerWindow}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Rate limit per 15-minute window</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="submit"
            disabled={isSavePending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSavePending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Security Policies"
            )}
          </button>
        </div>
      </form>

      {/* 3. Send Live SMTP Test Email */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Send Test Email</h2>
            <p className="text-xs text-muted-foreground">
              Verify live delivery from <code>{initialSettings.smtp.user}</code> via Namecheap Private Email
            </p>
          </div>
        </div>

        {testState?.message && (
          <div
            className={`rounded-xl border p-3.5 flex items-start gap-2.5 text-xs font-semibold ${
              testState.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {testState.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{testState.message}</span>
          </div>
        )}

        <form action={testFormAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              name="toEmail"
              required
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              placeholder="e.g. your-email@gmail.com"
              className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isTestPending || !testEmailInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {isTestPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Dispatching...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Dispatch Test Email
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
