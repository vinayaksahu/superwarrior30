"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleCouponStatusAction, deleteCouponAction } from "@/server/actions/coupon.actions";
import { Edit, Trash2, Loader2, Power } from "lucide-react";
import { toast } from "sonner";

interface CouponTableActionsProps {
  couponId: string;
  code: string;
  isActive: boolean;
  redemptionsCount: number;
}

export function CouponTableActions({
  couponId,
  code,
  isActive,
  redemptionsCount,
}: CouponTableActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const res = await toggleCouponStatusAction(couponId, !isActive);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message || "Failed to update status");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error";
        toast.error(msg);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to ${redemptionsCount > 0 ? "deactivate" : "delete"} coupon "${code}"?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteCouponAction(couponId);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message || "Failed to delete coupon");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error";
        toast.error(msg);
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Toggle Active Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
          isActive
            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            : "bg-muted text-muted-foreground hover:bg-accent"
        }`}
        title={isActive ? "Deactivate Coupon" : "Activate Coupon"}
      >
        <Power className="h-3 w-3" />
        {isActive ? "Active" : "Disabled"}
      </button>

      {/* Edit Link */}
      <Link
        href={`/admin/coupons/${couponId}`}
        className="rounded-md border border-input p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Edit Coupon"
      >
        <Edit className="h-3.5 w-3.5" />
      </Link>

      {/* Delete Button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        title="Delete / Archive Coupon"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
