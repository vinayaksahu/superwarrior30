"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AdminManualReleaseModal } from "@/components/admin/admin-manual-release-modal";
import { processMaturedCommissionsAction } from "@/server/actions/referral.actions";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  IndianRupee,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  User,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface CommissionRecordItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  orderStatus: string;
  buyerName: string;
  buyerEmail: string;
  courseTitle: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
  beneficiaryCode: string | null;
  beneficiaryAvailable: number;
  level: number;
  ratePercentage: number;
  commissionAmount: number;
  status: string;
  availableAt: Date | null;
  clearedAt: Date | null;
  clearedReason: string | null;
  clearedByName: string | null;
  isMatured: boolean | null;
  daysRemaining: number;
  createdAt: Date;
}

interface AdminCommissionClearanceClientProps {
  metrics: {
    totalCount: number;
    totalAmount: number;
    pendingCount: number;
    pendingAmount: number;
    readyCount: number;
    readyAmount: number;
    availableCount: number;
    availableAmount: number;
    reversedCount: number;
    reversedAmount: number;
  };
  records: CommissionRecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFilter: string;
  search: string;
}

export function AdminCommissionClearanceClient({
  metrics,
  records,
  total,
  page,
  pageSize,
  totalPages,
  currentFilter,
  search,
}: AdminCommissionClearanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isClearing, startClearing] = useTransition();

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", "1");
    router.push(`/admin/referrals/clearance?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("search", searchInput.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/admin/referrals/clearance?${params.toString()}`);
  };

  const handleBatchClear = () => {
    startClearing(async () => {
      try {
        const res = await processMaturedCommissionsAction();
        if (res.success) {
          if (res.clearedCount > 0) {
            toast.success(res.message);
          } else {
            toast.info("All matured commissions are already cleared.");
          }
          router.refresh();
        } else {
          toast.error(res.message || "Clearance failed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error running clearance";
        toast.error(msg);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Batch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Commission Clearance</h1>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Financial Ledger
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage holding periods, automatic milestone clearances, and SUPER_ADMIN early releases
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/referrals"
            className="inline-flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            ← Affiliate Overview
          </Link>

          <button
            type="button"
            onClick={handleBatchClear}
            disabled={isClearing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isClearing ? "animate-spin" : ""}`} />
            {isClearing ? "Clearing Matured..." : "Process Matured Clearance"}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending / In Holding */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Holding</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-500">
            {formatCurrency(metrics.pendingAmount)}
          </p>
          <p className="text-xs text-muted-foreground">{metrics.pendingCount} commissions in holding period</p>
        </div>

        {/* Ready to Clear */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ready to Clear</span>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold text-sky-500">
            {formatCurrency(metrics.readyAmount)}
          </p>
          <p className="text-xs text-muted-foreground">{metrics.readyCount} matured commissions</p>
        </div>

        {/* Available Balance */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Cleared & Available</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(metrics.availableAmount)}
          </p>
          <p className="text-xs text-muted-foreground">{metrics.availableCount} ready for payout withdrawal</p>
        </div>

        {/* Total Earned Volume */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Commission Volume</span>
            <IndianRupee className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(metrics.totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground">{metrics.totalCount} lifetime records generated</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/60 p-1">
            {[
              { key: "all", label: "All Commissions", count: metrics.totalCount },
              { key: "pending", label: "In Holding", count: metrics.pendingCount },
              { key: "ready", label: "Ready to Clear", count: metrics.readyCount },
              { key: "available", label: "Available", count: metrics.availableCount },
              { key: "reversed", label: "Reversed / Cancelled", count: metrics.reversedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentFilter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    currentFilter === tab.key
                      ? "bg-primary/10 text-primary font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student, referrer, order #..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex h-9 w-64 rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Beneficiary (Referrer)</th>
                <th className="py-3 px-4">Buyer (Student)</th>
                <th className="py-3 px-4">Order & Course</th>
                <th className="py-3 px-4">Level / Rate</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Holding Status / Clear Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium text-foreground">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No commission records match your filter criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    {/* Referrer */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-foreground">{r.beneficiaryName}</div>
                        <div className="text-[11px] text-muted-foreground">{r.beneficiaryEmail}</div>
                        {r.beneficiaryCode && (
                          <span className="inline-block mt-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                            Code: {r.beneficiaryCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Buyer */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-foreground">{r.buyerName}</div>
                        <div className="text-[11px] text-muted-foreground">{r.buyerEmail}</div>
                      </div>
                    </td>

                    {/* Order & Course */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-semibold text-foreground">#{r.orderNumber}</span>
                        <div className="max-w-xs truncate text-[11px] text-muted-foreground" title={r.courseTitle}>
                          {r.courseTitle}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Order total: {formatCurrency(r.orderAmount)}
                        </div>
                      </div>
                    </td>

                    {/* Level & Rate */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                        Level {r.level} ({r.ratePercentage}%)
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-foreground text-sm">
                        {formatCurrency(r.commissionAmount)}
                      </div>
                    </td>

                    {/* Holding / Clearance Status */}
                    <td className="py-3.5 px-4">
                      <div>
                        {r.status === "PENDING" ? (
                          r.daysRemaining > 0 ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                {r.daysRemaining} {r.daysRemaining === 1 ? "day" : "days"} left
                              </span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Clears {r.availableAt ? formatDate(r.availableAt) : "soon"}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                              <Sparkles className="h-3 w-3" />
                              Ready for clearance
                            </span>
                          )
                        ) : r.status === "AVAILABLE" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Cleared to Wallet
                            </span>
                            {r.clearedAt && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                on {formatDate(r.clearedAt)}
                                {r.clearedByName && ` by ${r.clearedByName}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                            <Ban className="h-3 w-3" />
                            {r.status}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "AVAILABLE"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : r.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {r.status === "PENDING" ? (
                        <AdminManualReleaseModal commission={r} />
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              Showing page <strong className="text-foreground">{page}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong> ({total} records)
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/referrals/clearance?filter=${currentFilter}&search=${search}&page=${page - 1}`}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/referrals/clearance?filter=${currentFilter}&search=${search}&page=${page + 1}`}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
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
