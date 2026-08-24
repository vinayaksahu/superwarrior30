import type { Metadata } from "next";
import Link from "next/link";
import { getAdminReferralDashboardAction } from "@/server/actions/referral.actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { Settings, Users, GitBranch, IndianRupee, Clock, Search, Trophy, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Referral Program Management",
};

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; level?: string; status?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const level = params.level || "all";
  const status = params.status || "all";
  const search = params.search || "";

  const data = await getAdminReferralDashboardAction({
    page,
    level,
    status,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Referral Program</h1>
          <p className="text-sm text-muted-foreground">
            Overview of referral tree network growth, payouts, and multi-tier commission logs
          </p>
        </div>

        <Link
          href="/admin/referrals/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Settings className="h-4 w-4" />
          Configure Tiers & Rates
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Referred Students</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {data.metrics.totalReferredStudents}
          </p>
          <p className="text-xs text-muted-foreground">Active student network ties</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Commissions</span>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.totalCommissionsAmount)}
          </p>
          <p className="text-xs text-muted-foreground">Generated from paid orders</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.pendingCommissionsAmount)}
          </p>
          <p className="text-xs text-muted-foreground">Under holding period</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Balance</span>
            <GitBranch className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.availableCommissionsAmount)}
          </p>
          <p className="text-xs text-muted-foreground">Ready for student withdrawal</p>
        </div>
      </div>

      {/* Level Breakdown & Top Referrers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tier Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Payout by Referral Level
          </h2>

          {data.metrics.levelBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No commission events recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.metrics.levelBreakdown.map((l) => (
                <div
                  key={l.level}
                  className="flex items-center justify-between rounded-xl bg-muted/20 p-3 text-xs"
                >
                  <span className="font-semibold text-foreground">
                    Level {l.level} ({l.count} payouts)
                  </span>
                  <span className="font-bold text-primary">
                    {formatCurrency(l.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Referrers Leaderboard
          </h2>

          {data.topReferrers.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No student referral activity yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Referral Code</th>
                    <th className="pb-2 font-medium">Network Size</th>
                    <th className="pb-2 text-right font-medium">Total Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.topReferrers.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/10">
                      <td className="py-3 font-medium text-foreground">
                        {ref.name}
                        <span className="block text-[10px] text-muted-foreground">{ref.email}</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-primary">
                        {ref.referralCode}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {ref.referralCount} Direct
                      </td>
                      <td className="py-3 text-right font-bold text-foreground">
                        {formatCurrency(ref.totalEarned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Commission Audit Log Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Commission Transaction Logs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical immutable records with locked commission percentages at order time
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <form className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                placeholder="Search beneficiary or order..."
                defaultValue={search}
                className="flex h-9 w-60 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
              />
            </form>

            <div className="flex gap-1.5">
              {["all", "PENDING", "AVAILABLE", "CANCELLED"].map((s) => (
                <Link
                  key={s}
                  href={`/admin/referrals?status=${s}${level !== "all" ? `&level=${level}` : ""}${
                    search ? `&search=${search}` : ""
                  }`}
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

        {data.records.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No commission records match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Beneficiary</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Rate Applied</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.records.data.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {rec.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{rec.beneficiaryName}</p>
                      <p className="text-[10px] text-muted-foreground">{rec.beneficiaryEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      Level {rec.level}
                    </td>
                    <td className="px-4 py-3 font-semibold text-muted-foreground">
                      {rec.ratePercentage}%
                    </td>
                    <td className="px-4 py-3 font-extrabold text-foreground">
                      {formatCurrency(rec.commissionAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === "AVAILABLE"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : rec.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {rec.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(rec.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.records.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Page {data.records.page} of {data.records.totalPages}
            </span>
            <div className="flex gap-2">
              {data.records.page > 1 && (
                <Link
                  href={`/admin/referrals?page=${data.records.page - 1}&status=${status}&level=${level}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.records.page < data.records.totalPages && (
                <Link
                  href={`/admin/referrals?page=${data.records.page + 1}&status=${status}&level=${level}`}
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
