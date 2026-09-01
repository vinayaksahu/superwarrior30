import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ShieldAlert, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Super Admin Login | Rahul Trade Warrior Academy",
  description: "Secure authentication portal for Super Administrators",
};

export default function SuperAdminLoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center flex flex-col items-center">
        <BrandLogo href="/" size="lg" />
        
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-400 mt-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Super Admin Portal
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Super Admin Access
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Enter your Super Admin credentials to access the platform administration system.
        </p>
      </div>

      <LoginForm portal="SUPER_ADMIN" />

      <div className="rounded-xl border border-border/80 bg-card/60 p-3 text-center space-y-1">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
          <Lock className="h-3 w-3 text-amber-400" />
          Restricted access. All login attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
}
