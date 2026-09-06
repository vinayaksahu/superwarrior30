import type { Metadata } from "next";
import { getAdminAuditLogsAction } from "@/server/actions/admin.actions";
import { requireSuperAdmin } from "@/server/dal/auth";
import { AuditLogsClient } from "@/components/admin/audit-logs-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Audit & Security Logs",
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const action = params.action || "all";
  const search = params.search || "";

  const data = await getAdminAuditLogsAction({
    page,
    pageSize: 50,
    action,
    search,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Audit & Security Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable event log of administrative actions, logins, financial modifications, IP locations, and system events
        </p>
      </div>

      <AuditLogsClient
        initialLogs={data.data}
        total={data.total}
        currentPage={data.page}
        totalPages={data.totalPages}
        searchQuery={search}
        actionFilter={action}
      />
    </div>
  );
}
