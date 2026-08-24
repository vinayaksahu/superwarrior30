import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import { getSystemPaymentMethodsAction } from "@/server/actions/payment-method.actions";
import { PaymentMethodsClient } from "@/components/admin/payment-methods-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deposit Payment Methods | Super Warrior 30 Admin",
};

export default async function AdminPaymentMethodsPage() {
  await requireAdmin();
  const methods = await getSystemPaymentMethodsAction(true);

  return <PaymentMethodsClient initialMethods={methods} />;
}
