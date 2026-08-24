import type { Metadata } from "next";
import { getStudentReferralDashboardAction } from "@/server/actions/referral.actions";
import { ReferralLinkCard } from "@/components/student/referral-link-card";
import { ReferralNetworkTree } from "@/components/student/referral-network-tree";
import { formatCurrency } from "@/lib/utils";
import { Users, IndianRupee, Clock, GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referrals & Network",
};

export default async function StudentReferralsPage() {
  const data = await getStudentReferralDashboardAction();

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Referrals & Network
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Share your referral invitation link and earn multi-tier commissions as your network grows
        </p>
      </div>

      {/* Referral Link & Social Share Card */}
      <ReferralLinkCard
        referralCode={data.referralCode}
        referralLink={data.referralLink}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Direct Referrals
          </span>
          <p className="text-2xl font-extrabold text-foreground">
            {data.stats.directReferrals}
          </p>
          <span className="text-[11px] text-muted-foreground">Tier 1 students</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Total Network
          </span>
          <p className="text-2xl font-extrabold text-foreground">
            {data.stats.totalNetworkStudents}
          </p>
          <span className="text-[11px] text-muted-foreground">All downline tiers</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Total Earned
          </span>
          <p className="text-2xl font-extrabold text-primary">
            {formatCurrency(data.stats.totalEarned)}
          </p>
          <span className="text-[11px] text-muted-foreground">Lifetime commissions</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Pending Balance
          </span>
          <p className="text-2xl font-extrabold text-amber-500">
            {formatCurrency(data.stats.pendingBalance)}
          </p>
          <span className="text-[11px] text-muted-foreground">Processing payouts</span>
        </div>
      </div>

      {/* Visual Referral Tree */}
      <ReferralNetworkTree
        network={data.network}
        levelBreakdown={data.stats.levelBreakdown}
      />

      {/* Commission Earnings History */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            Referral Earnings History
          </h3>
          <span className="text-xs text-muted-foreground">
            {data.earningsHistory.length} Transactions
          </span>
        </div>

        {data.earningsHistory.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No commissions earned yet. Commissions will appear here automatically when referred students purchase courses.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-2 font-medium">Order Ref</th>
                  <th className="pb-2 font-medium">Tier Level</th>
                  <th className="pb-2 font-medium">Commission Rate</th>
                  <th className="pb-2 font-medium">Earned Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.earningsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="py-3 font-mono font-medium text-foreground">
                      {item.orderRef}
                    </td>
                    <td className="py-3 font-bold text-primary">
                      Level {item.level}
                    </td>
                    <td className="py-3 font-semibold text-muted-foreground">
                      {item.ratePercentage}%
                    </td>
                    <td className="py-3 font-extrabold text-foreground">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "AVAILABLE"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : item.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
