import type { Metadata } from "next";
import Link from "next/link";
import { getAdminWithdrawalsAction } from "@/server/actions/wallet.actions";
import { AdminWithdrawalActions } from "@/components/admin/admin-withdrawal-actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { ArrowDownToLine, Clock, CheckCircle2, Search, IndianRupee } from "lucide-react";

export const metadata: Metadata = {
  title: "Withdrawals Management",
};

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "all";
  const search = params.search || "";

  const data = await getAdminWithdrawalsAction({
    page,
    status,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Withdrawal Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review, approve, and disburse affiliate referral earnings to student bank accounts & UPI
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-500">
            {formatCurrency(data.metrics.pendingAmount)}
          </p>
          <p className="text-xs text-muted-foreground">{data.metrics.pendingCount} requests awaiting clearance</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Disbursed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.totalPaidOut)}
          </p>
          <p className="text-xs text-muted-foreground">Completed payout lifetime volume</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Volume</span>
            <IndianRupee className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.pendingAmount + data.metrics.totalPaidOut)}
          </p>
          <p className="text-xs text-muted-foreground">All requested payout capital</p>
        </div>
      </div>

      {/* Filterable Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Withdrawal Queue</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} requests found
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <form className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                placeholder="Search student or UTR ref..."
                defaultValue={search}
                className="flex h-9 w-60 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
              />
            </form>

            <div className="flex gap-1.5">
              {["all", "PENDING", "APPROVED", "COMPLETED", "REJECTED"].map((s) => (
                <Link
                  key={s}
                  href={`/admin/withdrawals?status=${s}${search ? `&search=${search}` : ""}`}
                  className={`inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                    status === s
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-input bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No withdrawal requests match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requested At</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{w.userName}</p>
                      <p className="text-[10px] text-muted-foreground">{w.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-foreground text-sm">
                      {formatCurrency(w.amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold uppercase text-primary">
                      {w.paymentMethod.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          w.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : w.status === "APPROVED"
                            ? "bg-sky-500/10 text-sky-500 border-sky-500/20"
                            : w.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {w.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminWithdrawalActions withdrawal={w} />
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
                  href={`/admin/withdrawals?page=${data.page - 1}&status=${status}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/withdrawals?page=${data.page + 1}&status=${status}`}
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
