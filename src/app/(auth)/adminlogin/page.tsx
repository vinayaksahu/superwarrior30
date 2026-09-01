import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Shield, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin & Staff Login | Rahul Trade Warrior Academy",
  description: "Authentication portal for Academy Administrators and Staff",
};

export default function AdminLoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center flex flex-col items-center">
        <BrandLogo href="/" size="lg" />
        
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary mt-2">
          <Shield className="h-3.5 w-3.5" />
          Admin &amp; Staff Portal
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Admin Portal Access
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Enter your authorized staff credentials to access the administration dashboard.
        </p>
      </div>

      <LoginForm portal="ADMIN" />

      <div className="rounded-xl border border-border/80 bg-card/60 p-3 text-center space-y-1">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
          <Lock className="h-3 w-3 text-primary" />
          Restricted to authorized academy staff and administrators.
        </p>
      </div>
    </div>
  );
}
