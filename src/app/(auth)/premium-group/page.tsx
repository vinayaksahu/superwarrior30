import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { getBrokerSettings } from "@/lib/broker/config";
import { getCurrentUser } from "@/server/dal/auth";
import { Sparkles, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Premium Community | Super Warrior 30",
  description: "Sign up for free and get access to the Super Warrior 30 Premium Telegram Community.",
};

export default async function PremiumGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // If student is already logged in, immediately redirect to dashboard join community
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/dashboard/join-community");
  }

  const brokerSettings = await getBrokerSettings();
  const referralDiscountPercentage = Number(brokerSettings.referralDiscountPercentage) || 10;
  const referralDiscountType = brokerSettings.referralDiscountType || "PERCENTAGE";
  const referralDiscountValue =
    brokerSettings.referralDiscountValue !== undefined
      ? Number(brokerSettings.referralDiscountValue)
      : referralDiscountPercentage;
  const isReferralDiscountEnabled = brokerSettings.isReferralDiscountEnabled !== false;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center flex flex-col items-center">
        <BrandLogo href="/" size="lg" />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400 mt-2">
          <Users className="h-3.5 w-3.5" />
          <span>Premium Telegram Access</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground pt-1">
          Join Premium Community
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Create your free student account, complete verification, and get direct entry to our exclusive Telegram group & live market analysis.
        </p>
      </div>

      {/* 3-Step Community Access Guide */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-card p-4 text-xs shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span>3 Simple Steps To Join</span>
          </div>
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
            Free Access
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-[11px]">
          <div className="flex items-start gap-2.5 rounded-lg bg-card/70 border border-border/60 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">
              1
            </span>
            <div>
              <p className="font-bold text-foreground">Free Sign Up</p>
              <p className="text-muted-foreground">
                Register your account below with your name and email.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-card/70 border border-border/60 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">
              2
            </span>
            <div>
              <p className="font-bold text-foreground">Verify & Open Broker Account</p>
              <p className="text-muted-foreground">
                In your dashboard, click Join Community, choose your broker, and submit your Telegram ID.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-card/70 border border-border/60 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-black text-emerald-400">
              3
            </span>
            <div>
              <p className="font-bold text-emerald-400">Get Telegram Access 🚀</p>
              <p className="text-muted-foreground">
                Once approved, you will be instantly added to the VIP Telegram community!
              </p>
            </div>
          </div>
        </div>
      </div>

      <RegisterForm
        searchParams={searchParams}
        referralDiscountPercentage={referralDiscountPercentage}
        referralDiscountType={referralDiscountType}
        referralDiscountValue={referralDiscountValue}
        isReferralDiscountEnabled={isReferralDiscountEnabled}
        redirectTo="/dashboard/join-community"
        submitButtonText="Create Free Account & Join Community"
      />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login?redirectTo=/dashboard/join-community"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Log in to Join Community
        </Link>
      </p>
    </div>
  );
}
