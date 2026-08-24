import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAuditLogsAction } from "@/server/actions/admin.actions";
import { requireAdmin } from "@/server/dal/auth";
import { ScrollText, Search, ShieldAlert, Clock, User, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Audit Logs",
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const action = params.action || "all";
  const search = params.search || "";

  const data = await getAdminAuditLogsAction({
    page,
    action,
    search,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Audit & Security Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable event log of all administrative actions, financial modifications, and course mutations
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Security Event Stream</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} recorded administrative events
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <form className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                placeholder="Search actor or entity..."
                defaultValue={search}
                className="flex h-9 w-60 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
              />
            </form>
          </div>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No audit log entries match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity Target</th>
                  <th className="px-4 py-3 font-medium">Audit Details (JSON)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{log.actorEmail}</p>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                      {log.entityType} <span className="text-muted-foreground">#{log.entityId.slice(-6)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                      {log.newValues ? JSON.stringify(log.newValues) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Link
                  href={`/admin/audit-logs?page=${data.page - 1}${search ? `&search=${search}` : ""}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/audit-logs?page=${data.page + 1}${search ? `&search=${search}` : ""}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
