import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "Log In | Rahul Trade Warrior Academy",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center flex flex-col items-center">
        <BrandLogo href="/" size="lg" />
        <h1 className="text-2xl font-black tracking-tight text-foreground pt-2">Welcome Back</h1>
        <p className="text-xs text-muted-foreground">
          Enter your credentials to access your student dashboard
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
