import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import {
  getBrokerAdminSettingsAction,
  listBrokerClaimsAction,
} from "@/server/actions/broker.actions";
import { AdminBrokerOffersClient } from "@/components/admin/admin-broker-offers-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broker Offers & Cashback Modes | Admin",
};

export default async function AdminBrokerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; mode?: string; search?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const status = params.status || "ALL";
  const mode = params.mode || "ALL";
  const search = params.search || "";

  const [settings, claimsData] = await Promise.all([
    getBrokerAdminSettingsAction(),
    listBrokerClaimsAction({
      page,
      status,
      mode,
      search,
      limit: 50,
    }),
  ]);

  return (
    <AdminBrokerOffersClient
      initialSettings={settings}
      claimsData={claimsData as any}
    />
  );
}
