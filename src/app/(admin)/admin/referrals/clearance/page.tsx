import type { Metadata } from "next";
import { getAdminCommissionClearanceAction } from "@/server/actions/referral.actions";
import { AdminCommissionClearanceClient } from "@/components/admin/admin-commission-clearance-client";
import { requireAdmin } from "@/server/dal/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commission Clearance & Release",
};

export default async function AdminCommissionClearancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: "all" | "pending" | "ready" | "available" | "reversed"; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const filter = params.filter || "all";
  const search = params.search || "";

  const data = await getAdminCommissionClearanceAction({
    page,
    filter,
    search,
  });

  return (
    <AdminCommissionClearanceClient
      metrics={data.metrics}
      records={data.records}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      totalPages={data.totalPages}
      currentFilter={filter}
      search={search}
    />
  );
}
