"use client";

import { useState, useTransition } from "react";
import { manualReleaseCommissionAction } from "@/server/actions/referral.actions";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, Loader2, X, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AdminManualReleaseModalProps {
  commission: {
    id: string;
    orderNumber: string;
    beneficiaryName: string;
    beneficiaryEmail: string;
    commissionAmount: number;
    daysRemaining: number;
    availableAt: Date | null;
  };
}

export function AdminManualReleaseModal({ commission }: AdminManualReleaseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await manualReleaseCommissionAction(
          commission.id,
          reason.trim() || undefined
        );

        if (res.success) {
          toast.success(res.message);
          setIsOpen(false);
          setReason("");
        } else {
          toast.error(res.message || "Failed to release commission");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error releasing commission";
        toast.error(msg);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        title="Release commission immediately to available balance"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Release Now
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Early Commission Release</h3>
                  <p className="text-xs text-muted-foreground">SUPER_ADMIN Action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beneficiary:</span>
                <span className="font-semibold text-foreground">
                  {commission.beneficiaryName} ({commission.beneficiaryEmail})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Ref:</span>
                <span className="font-mono font-medium text-foreground">#{commission.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(commission.commissionAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holding Period:</span>
                <span className="text-amber-500 font-medium">
                  {commission.daysRemaining > 0 ? `${commission.daysRemaining} days remaining` : "Holding completed"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <p>
                Releasing this commission will immediately move{" "}
                <strong className="text-foreground">{formatCurrency(commission.commissionAmount)}</strong> from the
                student&apos;s pending balance into their available balance for withdrawal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRelease} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Early Release (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g., Verified buyer payment, manual approval"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Confirm & Release
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
