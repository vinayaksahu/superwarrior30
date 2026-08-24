import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Link href="/" className="inline-block">
          <span className="text-2xl font-bold text-primary">SW30</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter a secure password for your Super Warrior 30 account
        </p>
      </div>

      {!token ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-destructive">Invalid or Missing Token</h3>
          <p className="text-xs text-muted-foreground">
            The password reset link appears incomplete or corrupted. Please request a fresh reset link.
          </p>
          <div className="pt-2">
            <Link
              href="/forgot-password"
              className="inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              Request New Link
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ResetPasswordForm token={token} />
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
