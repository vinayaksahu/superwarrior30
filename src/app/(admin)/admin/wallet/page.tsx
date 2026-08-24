import type { Metadata } from "next";
import Link from "next/link";
import { getAdminWalletsAction } from "@/server/actions/wallet.actions";
import { AdminWalletAdjustModal } from "@/components/admin/admin-wallet-adjust-modal";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { Wallet, IndianRupee, Clock, ArrowDownToLine, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Wallets Management",
};

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const data = await getAdminWalletsAction({
    page,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Wallets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          System-wide affiliate balance liability, pending commissions, and manual ledger adjustments
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Available</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.totals.availableBalance)}
          </p>
          <p className="text-xs text-muted-foreground">Affiliate cash liability</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-500">
            {formatCurrency(data.totals.pendingBalance)}
          </p>
          <p className="text-xs text-muted-foreground">Under clearance holding</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned</span>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.totals.totalEarned)}
          </p>
          <p className="text-xs text-muted-foreground">Lifetime student affiliate commissions</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Withdrawn</span>
            <ArrowDownToLine className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.totals.totalWithdrawn)}
          </p>
          <p className="text-xs text-muted-foreground">Disbursed to date</p>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Student Accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} registered student wallets
            </p>
          </div>

          <form className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              type="text"
              placeholder="Search name, email or code..."
              defaultValue={search}
              className="flex h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
            />
          </form>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No student wallets match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Referral Code</th>
                  <th className="px-4 py-3 font-medium text-right">Available Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Pending Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Total Earned</th>
                  <th className="px-4 py-3 font-medium text-right">Total Withdrawn</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{w.userName}</p>
                      <p className="text-[10px] text-muted-foreground">{w.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {w.referralCode}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-foreground text-sm">
                      {formatCurrency(w.availableBalance)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-500">
                      {formatCurrency(w.pendingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(w.totalEarned)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      {formatCurrency(w.totalWithdrawn)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminWalletAdjustModal
                        user={{
                          id: w.userId,
                          name: w.userName,
                          email: w.userEmail,
                          availableBalance: w.availableBalance,
                        }}
                      />
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
                  href={`/admin/wallet?page=${data.page - 1}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/wallet?page=${data.page + 1}`}
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
