"use client";

import { useState } from "react";
import { WithdrawalRequestModal } from "@/components/student/withdrawal-request-modal";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  IndianRupee,
  Clock,
  ArrowDownToLine,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface StudentWalletClientProps {
  wallet: {
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
  };
  activeWithdrawals: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
    createdAt: Date;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
  }>;
  totalTransactions: number;
  page: number;
  totalPages: number;
}

export function StudentWalletClient({
  wallet,
  activeWithdrawals,
  transactions,
  totalTransactions,
  page,
  totalPages,
}: StudentWalletClientProps) {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header & Payout CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wallet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor earnings from referral commissions and request bank payouts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWithdrawModalOpen(true)}
          disabled={wallet.availableBalance < 500}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <ArrowDownToLine className="h-4 w-4" />
          Request Payout
        </button>
      </div>

      {/* Balance Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance */}
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-card to-primary/5 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Available Balance
            </span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(wallet.availableBalance)}
          </p>
          <p className="text-xs text-muted-foreground">Ready for instant withdrawal</p>
        </div>

        {/* Pending Balance */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Balance</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-500">
            {formatCurrency(wallet.pendingBalance)}
          </p>
          <p className="text-xs text-muted-foreground">Under clearance holding period</p>
        </div>

        {/* Total Earned */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(wallet.totalEarned)}
          </p>
          <p className="text-xs text-muted-foreground">Cumulative lifetime earnings</p>
        </div>

        {/* Total Withdrawn */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Withdrawn</span>
            <ArrowDownToLine className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(wallet.totalWithdrawn)}
          </p>
          <p className="text-xs text-muted-foreground">Disbursed to your accounts</p>
        </div>
      </div>

      {/* Active Withdrawal Banner */}
      {activeWithdrawals.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Active Withdrawal Request in Progress</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-500 uppercase">
              {activeWithdrawals[0].status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your request to withdraw <strong>{formatCurrency(activeWithdrawals[0].amount)}</strong> via{" "}
            <span className="capitalize">{activeWithdrawals[0].paymentMethod.replace("_", " ")}</span> is
            being processed by our financial desk.
          </p>
        </div>
      )}

      {/* Transaction Ledger Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Financial Ledger</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete auditable ledger of all commission credits, withdrawals, and adjustments
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {totalTransactions} Total Records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <IndianRupee className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No transactions recorded yet</p>
            <p>Commissions from referred student purchases and payouts will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="font-semibold text-foreground">
                            {tx.type.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium max-w-xs truncate">
                        {tx.description || "System transaction"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : tx.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {tx.status.toLowerCase()}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold text-sm ${
                          isCredit ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {isCredit ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/wallet?page=${page - 1}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/wallet?page=${page + 1}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Request Modal */}
      <WithdrawalRequestModal
        availableBalance={wallet.availableBalance}
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
      />
    </div>
  );
}
