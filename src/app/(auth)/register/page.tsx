import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { getBrokerSettings } from "@/lib/broker/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Account | Rahul Trade Warrior Academy",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const brokerSettings = await getBrokerSettings();
  const referralDiscountPercentage = Number(brokerSettings.referralDiscountPercentage) || 10;
  const isReferralDiscountEnabled = brokerSettings.isReferralDiscountEnabled !== false;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center flex flex-col items-center">
        <BrandLogo href="/" size="lg" />
        <h1 className="text-2xl font-black tracking-tight text-foreground pt-2">Join Trade Warrior Academy</h1>
        <p className="text-xs text-muted-foreground">
          Start your professional trading & affiliate journey today
        </p>
      </div>
      <RegisterForm
        searchParams={searchParams}
        referralDiscountPercentage={referralDiscountPercentage}
        isReferralDiscountEnabled={isReferralDiscountEnabled}
      />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
