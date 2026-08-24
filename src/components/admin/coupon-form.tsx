"use client";

import { useState, useActionState } from "react";
import { createCouponAction, updateCouponAction } from "@/server/actions/coupon.actions";
import { Loader2, ArrowLeft, Tag, Calendar, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";
import type { ActionState } from "@/types";

interface CourseOption {
  id: string;
  title: string;
  price: number;
}

interface CouponFormProps {
  coupon?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    startDate: Date;
    endDate: Date;
    usageLimit: number | null;
    perUserLimit: number;
    isActive: boolean;
    courses?: Array<{ courseId: string }>;
  };
  courses: CourseOption[];
  isEdit?: boolean;
}

export function CouponForm({ coupon, courses, isEdit = false }: CouponFormProps) {
  const [discountType, setDiscountType] = useState(coupon?.discountType || "PERCENTAGE");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    coupon?.courses?.map((c) => c.courseId) || []
  );

  const actionFn = isEdit
    ? updateCouponAction.bind(null, coupon!.id)
    : createCouponAction;

  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    actionFn,
    null
  );

  const toggleCourseSelection = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const toInputDate = (d?: Date) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  return (
    <form action={formAction} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all coupons
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
          {isPending ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
        </button>
      </div>

      {state?.message && !state.success && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive">
          {state.message}
        </div>
      )}

      {/* Basic Settings */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
          Coupon Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Coupon Code */}
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-xs font-semibold text-foreground">
              Coupon Promo Code <span className="text-destructive">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              defaultValue={coupon?.code || ""}
              placeholder="e.g. TRADER30"
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono uppercase tracking-wider ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {state?.errors?.code && (
              <p className="text-[11px] text-destructive">{state.errors.code[0]}</p>
            )}
          </div>

          {/* Discount Type */}
          <div className="space-y-1.5">
            <label htmlFor="discountType" className="text-xs font-semibold text-foreground">
              Discount Type <span className="text-destructive">*</span>
            </label>
            <select
              id="discountType"
              name="discountType"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            >
              <option value="PERCENTAGE">Percentage (%) Off</option>
              <option value="FIXED_AMOUNT">Fixed Amount (₹) Off</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Discount Value */}
          <div className="space-y-1.5">
            <label htmlFor="discountValue" className="text-xs font-semibold text-foreground">
              Discount Value ({discountType === "PERCENTAGE" ? "%" : "₹"}){" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              id="discountValue"
              name="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              max={discountType === "PERCENTAGE" ? 100 : undefined}
              defaultValue={coupon?.discountValue || 10}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
            {state?.errors?.discountValue && (
              <p className="text-[11px] text-destructive">{state.errors.discountValue[0]}</p>
            )}
          </div>

          {/* Minimum Order Amount */}
          <div className="space-y-1.5">
            <label htmlFor="minOrderAmount" className="text-xs font-semibold text-foreground">
              Minimum Order Value (₹)
            </label>
            <input
              id="minOrderAmount"
              name="minOrderAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={coupon?.minOrderAmount || 0}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>

          {/* Max Discount Amount Cap (for Percentage) */}
          <div className="space-y-1.5">
            <label htmlFor="maxDiscountAmount" className="text-xs font-semibold text-foreground">
              Maximum Discount Cap (₹)
            </label>
            <input
              id="maxDiscountAmount"
              name="maxDiscountAmount"
              type="number"
              step="0.01"
              min="0"
              disabled={discountType !== "PERCENTAGE"}
              defaultValue={coupon?.maxDiscountAmount?.toString() || ""}
              placeholder="No limit"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Validity & Usage Limits */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
          Validity & Usage Constraints
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="text-xs font-semibold text-foreground">
              Promotion Start Date <span className="text-destructive">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={toInputDate(coupon?.startDate) || toInputDate(new Date())}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-xs font-semibold text-foreground">
              Expiry Date <span className="text-destructive">*</span>
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={
                toInputDate(coupon?.endDate) ||
                toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
              }
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Global Usage Limit */}
          <div className="space-y-1.5">
            <label htmlFor="usageLimit" className="text-xs font-semibold text-foreground">
              Total Global Usage Limit
            </label>
            <input
              id="usageLimit"
              name="usageLimit"
              type="number"
              min="1"
              defaultValue={coupon?.usageLimit?.toString() || ""}
              placeholder="Unlimited"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank for unlimited total redemptions.
            </p>
          </div>

          {/* Per User Limit */}
          <div className="space-y-1.5">
            <label htmlFor="perUserLimit" className="text-xs font-semibold text-foreground">
              Max Uses Per Student
            </label>
            <input
              id="perUserLimit"
              name="perUserLimit"
              type="number"
              min="1"
              defaultValue={coupon?.perUserLimit || 1}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={coupon?.isActive !== false}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <div>
              <p className="text-xs font-semibold text-foreground">Active Coupon</p>
              <p className="text-[11px] text-muted-foreground">
                When enabled, students can apply this code during checkout.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Applicable Courses Scope */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Applicable Courses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select specific courses or leave empty to apply across all courses
            </p>
          </div>
          <span className="text-xs font-bold text-primary">
            {selectedCourseIds.length === 0
              ? "Applies to ALL Courses"
              : `${selectedCourseIds.length} Courses Selected`}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto p-1">
          {courses.map((course) => {
            const isSelected = selectedCourseIds.includes(course.id);

            return (
              <label
                key={course.id}
                onClick={() => toggleCourseSelection(course.id)}
                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/80 bg-background hover:bg-muted/30 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-xs font-medium truncate">{course.title}</span>
                </div>
                <span className="text-xs font-bold shrink-0">₹{course.price}</span>
              </label>
            );
          })}
        </div>

        {/* Hidden inputs for selected courses */}
        {selectedCourseIds.map((id) => (
          <input key={id} type="hidden" name="courseIds" value={id} />
        ))}
      </div>
    </form>
  );
}
