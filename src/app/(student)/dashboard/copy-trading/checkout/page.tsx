import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { fetchUserCopyTradingAffiliateInfo } from "@/server/actions/copy-trading.actions";
import { getPublicPaymentMethodsAction } from "@/server/actions/payment-method.actions";
import { CopyTradingCheckoutClient } from "@/components/student/copy-trading-checkout-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cloud VPS Hosting Checkout | Super Warrior 30",
  description: "Dedicated Cloud VPS Hosting & Copy Trading Registration Gateway.",
};

export default async function CopyTradingCheckoutPage() {
  const user = await requireAuth();

  const [affiliateInfo, paymentMethods] = await Promise.all([
    fetchUserCopyTradingAffiliateInfo(user.id),
    getPublicPaymentMethodsAction(),
  ]);

  return (
    <CopyTradingCheckoutClient
      affiliateInfo={affiliateInfo}
      paymentMethods={paymentMethods}
    />
  );
}
