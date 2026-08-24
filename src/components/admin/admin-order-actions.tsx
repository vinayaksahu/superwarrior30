"use client";

import { useTransition } from "react";
import {
  adminCancelOrderAction,
  adminRefundOrderAction,
  mockConfirmPaymentAction,
} from "@/server/actions/order.actions";
import { CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AdminOrderActionsProps {
  orderId: string;
  status: string;
  orderNumber: string;
}

export function AdminOrderActions({
  orderId,
  status,
  orderNumber,
}: AdminOrderActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirmPaid = () => {
    if (!confirm(`Mark order "${orderNumber}" as PAID and unlock enrollment?`)) return;

    startTransition(async () => {
      try {
        const res = await mockConfirmPaymentAction(orderId);
        if (res.success) {
          toast.success("Order marked as PAID and user enrolled!");
        } else {
          toast.error(res.message || "Failed to update order");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error confirming payment";
        toast.error(msg);
      }
    });
  };

  const handleCancel = () => {
    if (!confirm(`Cancel order "${orderNumber}"?`)) return;

    startTransition(async () => {
      try {
        const res = await adminCancelOrderAction(orderId);
        if (res.success) {
          toast.success("Order cancelled");
        } else {
          toast.error(res.message || "Failed to cancel order");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error cancelling order";
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

  return (
    <div className="flex items-center justify-end gap-1.5">
      {status === "PENDING" && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmPaid}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50"
            title="Confirm payment and enroll student"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Mark Paid
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
            title="Cancel pending order"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        </>
      )}

      {status === "PAID" && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleRefund}
          className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
          title="Refund order and revoke course enrollment"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Refund
        </button>
      )}
    </div>
  );
}
