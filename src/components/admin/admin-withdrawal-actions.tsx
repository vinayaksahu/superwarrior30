"use client";

import { useState, useTransition } from "react";
import { processAdminWithdrawalAction } from "@/server/actions/wallet.actions";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface AdminWithdrawalActionsProps {
  withdrawal: {
    id: string;
    userName: string;
    userEmail: string;
    amount: number;
    paymentMethod: string;
    paymentDetails: Record<string, unknown>;
    status: string;
    adminNote: string | null;
    transactionRef: string | null;
  };
}

export function AdminWithdrawalActions({ withdrawal }: AdminWithdrawalActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState<"approve" | "complete" | "reject" | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const handleProcess = (action: "approve" | "complete" | "reject") => {
    startTransition(async () => {
      try {
        const res = await processAdminWithdrawalAction({
          withdrawalId: withdrawal.id,
          action,
          adminNote: adminNote.trim() || undefined,
          transactionRef: transactionRef.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message);
          setShowProcessModal(null);
        } else {
          toast.error(res.message || "Failed to process withdrawal");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error processing withdrawal";
        toast.error(msg);
      }
    });
  };

  const isCompletedOrRejected =
    withdrawal.status === "COMPLETED" || withdrawal.status === "REJECTED";

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {/* View Details Button */}
        <button
          type="button"
          onClick={() => setShowDetailsModal(true)}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
          title="View Payment Coordinates"
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </button>

        {!isCompletedOrRejected && (
          <>
            {withdrawal.status === "PENDING" && (
              <button
                type="button"
                onClick={() => setShowProcessModal("approve")}
                className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-500 hover:bg-sky-500/20"
              >
                Approve
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowProcessModal("complete")}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20"
            >
              <Check className="h-3.5 w-3.5" />
              Mark Paid
            </button>

            <button
              type="button"
              onClick={() => setShowProcessModal("reject")}
              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Payout Coordinates</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold text-foreground">
                  {withdrawal.userName} ({withdrawal.userEmail})
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-primary text-sm">
                  {formatCurrency(withdrawal.amount)}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-semibold text-foreground uppercase">
                  {withdrawal.paymentMethod.replace("_", " ")}
                </span>
              </div>

              {/* Payment Details breakdown */}
              {withdrawal.paymentMethod === "upi" ? (
                <div className="rounded-xl border border-border bg-background p-3 space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    UPI ID
                  </span>
                  <span className="font-mono font-bold text-foreground select-all">
                    {String(withdrawal.paymentDetails.upiId || "N/A")}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Account Holder
                    </span>
                    <span className="font-semibold text-foreground select-all">
                      {String(withdrawal.paymentDetails.accountHolderName || "N/A")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Account Number
                    </span>
                    <span className="font-mono font-bold text-foreground select-all">
                      {String(withdrawal.paymentDetails.accountNumber || "N/A")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">
                        IFSC Code
                      </span>
                      <span className="font-mono font-bold text-primary select-all">
                        {String(withdrawal.paymentDetails.ifscCode || "N/A")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">
                        Bank
                      </span>
                      <span className="font-semibold text-foreground">
                        {String(withdrawal.paymentDetails.bankName || "N/A")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {withdrawal.transactionRef && (
                <div className="flex justify-between border-t border-border/40 pt-2">
                  <span className="text-muted-foreground">Ref / UTR:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    {withdrawal.transactionRef}
                  </span>
                </div>
              )}

              {withdrawal.adminNote && (
                <div className="border-t border-border/40 pt-2">
                  <span className="text-muted-foreground block text-[10px]">Admin Note:</span>
                  <span className="text-foreground">{withdrawal.adminNote}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground capitalize">
                {showProcessModal === "complete"
                  ? "Mark Withdrawal Paid"
                  : showProcessModal === "reject"
                  ? "Reject Withdrawal & Refund Balance"
                  : "Approve Withdrawal"}
              </h3>
              <button
                onClick={() => setShowProcessModal(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {showProcessModal === "complete"
                ? `Confirm bank disbursement of ${formatCurrency(
                    withdrawal.amount
                  )} to ${withdrawal.userName}.`
                : showProcessModal === "reject"
                ? `Rejecting this request will automatically restore ${formatCurrency(
                    withdrawal.amount
                  )} back to the student's available wallet balance.`
                : `Approve withdrawal of ${formatCurrency(withdrawal.amount)} for processing.`}
            </p>

            <div className="space-y-3">
              {showProcessModal === "complete" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Bank UTR / Transaction Reference ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UTR1234567890"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Admin Note {showProcessModal === "reject" && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    showProcessModal === "reject"
                      ? "Reason for rejection (e.g. Incorrect bank account number)"
                      : "Optional internal note"
                  }
                  required={showProcessModal === "reject"}
                  className="flex w-full rounded-lg border border-input bg-background p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProcessModal(null)}
                className="rounded-lg border border-input px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isPending ||
                  (showProcessModal === "complete" && !transactionRef.trim()) ||
                  (showProcessModal === "reject" && !adminNote.trim())
                }
                onClick={() => handleProcess(showProcessModal)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow disabled:opacity-50 ${
                  showProcessModal === "reject"
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
