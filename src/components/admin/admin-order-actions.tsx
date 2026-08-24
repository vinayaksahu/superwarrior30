"use client";

import { useState, useTransition } from "react";
import {
  approveManualOrderPaymentAction,
  rejectManualOrderPaymentAction,
  adminRefundOrderAction,
} from "@/server/actions/order.actions";
import { CheckCircle2, XCircle, RotateCcw, Loader2, Copy, Check } from "lucide-react";
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

  const handleApprove = () => {
    const promptMsg = manualPaymentRef
      ? `Approve payment for Order #${orderNumber} (UTR: ${manualPaymentRef})?\nThis will grant student instant access & distribute affiliate commissions.`
      : `Mark Order #${orderNumber} as PAID and grant course access?`;

    if (!confirm(promptMsg)) return;

    startTransition(async () => {
      try {
        const res = await approveManualOrderPaymentAction(orderId);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message || "Failed to approve payment");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error approving payment";
        toast.error(msg);
      }
    });
  };

  const handleReject = () => {
    const reason = prompt(`Reason for rejecting Order #${orderNumber}:`, "Invalid or unverified UTR reference number");
    if (reason === null) return;

    startTransition(async () => {
      try {
        const res = await rejectManualOrderPaymentAction(orderId, reason);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message || "Failed to reject order");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error rejecting order";
        toast.error(msg);
      }
    });
  };

  const handleRefund = () => {
    if (!confirm(`Refund order "${orderNumber}" and REVOKE course access?`)) return;

    startTransition(async () => {
      try {
        const res = await adminRefundOrderAction(orderId);
        if (res.success) {
          toast.success("Order refunded and access revoked.");
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
    <div className="flex items-center justify-end gap-2">
      {manualPaymentRef && (
        <button
          type="button"
          onClick={() => copyRef(manualPaymentRef)}
          className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground hover:bg-muted"
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
            onClick={handleApprove}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
            title="Approve payment, unlock course & credit commissions"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Approve Payment
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleReject}
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
          onClick={handleRefund}
          className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/25 disabled:opacity-50 transition-colors cursor-pointer"
          title="Refund order and revoke course enrollment"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Refund
        </button>
      )}
    </div>
  );
}
