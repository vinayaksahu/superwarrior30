"use client";

import { useState, useTransition } from "react";
import {
  approveManualOrderPaymentAction,
  rejectManualOrderPaymentAction,
  adminRefundOrderAction,
} from "@/server/actions/order.actions";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  X,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface AdminOrderActionsProps {
  orderId: string;
  status: string;
  orderNumber: string;
  manualPaymentRef?: string | null;
}

export function AdminOrderActions({
  orderId,
  status,
  orderNumber,
  manualPaymentRef,
}: AdminOrderActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Custom Modal States
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("Invalid or unverified UTR reference number");

  const executeApprove = () => {
    startTransition(async () => {
      try {
        const res = await approveManualOrderPaymentAction(orderId);
        if (res.success) {
          toast.success(res.message);
          setIsApproveOpen(false);
        } else {
          toast.error(res.message || "Failed to approve payment");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error approving payment";
        toast.error(msg);
      }
    });
  };

  const executeReject = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await rejectManualOrderPaymentAction(orderId, rejectReason);
        if (res.success) {
          toast.success(res.message);
          setIsRejectOpen(false);
        } else {
          toast.error(res.message || "Failed to reject order");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error rejecting order";
        toast.error(msg);
      }
    });
  };

  const executeRefund = () => {
    startTransition(async () => {
      try {
        const res = await adminRefundOrderAction(orderId);
        if (res.success) {
          toast.success("Order refunded and access revoked.");
          setIsRefundOpen(false);
        } else {
          toast.error(res.message || "Failed to refund order");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error refunding order";
        toast.error(msg);
      }
    });
  };

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("UTR copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {manualPaymentRef && (
          <button
            type="button"
            onClick={() => copyRef(manualPaymentRef)}
            className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground hover:bg-muted cursor-pointer"
            title="Copy UTR / Reference ID"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
            UTR: {manualPaymentRef}
          </button>
        )}

        {status === "PENDING" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsApproveOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
              title="Approve payment, unlock course & credit commissions"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve Payment
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsRejectOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-50 transition-colors cursor-pointer"
              title="Reject unverified order"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        )}

        {status === "PAID" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsRefundOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/25 disabled:opacity-50 transition-colors cursor-pointer"
            title="Refund order and revoke course enrollment"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refund
          </button>
        )}
      </div>

      {/* 1. APPROVE PAYMENT MODAL */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Approve Order Payment</h3>
                <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-background/80 p-3.5 text-xs border border-border/50">
              {manualPaymentRef && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Submitted UTR:</span>
                  <span className="font-mono font-bold text-foreground text-sm">{manualPaymentRef}</span>
                </div>
              )}
              <p className="text-muted-foreground text-[11px] pt-1">
                Approving this payment will instantly:
              </p>
              <ul className="list-disc list-inside text-foreground text-[11px] space-y-0.5">
                <li>Grant lifetime course access in student&apos;s dashboard</li>
                <li>Calculate & credit affiliate referral commissions to uplines</li>
                <li>Mark order as officially <strong>PAID</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={executeApprove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black shadow hover:bg-emerald-400 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECT ORDER MODAL */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Reject Order Payment</h3>
                <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>
              </div>
            </div>

            <form onSubmit={executeReject} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Rejection Reason
                </label>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. REFUND ORDER MODAL */}
      {isRefundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Refund Order & Revoke Access</h3>
                <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed bg-background/80 p-3.5 rounded-xl border border-border/50">
              Refunding this order will immediately <strong>revoke the student&apos;s course access</strong> and reverse any referral commission credited to uplines.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRefundOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={executeRefund}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-purple-500 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
