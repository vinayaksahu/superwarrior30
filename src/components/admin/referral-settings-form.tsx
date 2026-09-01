"use client";

import { useState, useTransition } from "react";
import { saveReferralSettingsAction } from "@/server/actions/referral.actions";
import { Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2, ShieldAlert, Clock, IndianRupee, Tag, Sparkles, Info, Users } from "lucide-react";
import { toast } from "sonner";

interface ReferralLevelItem {
  id?: string;
  level: number;
  commissionPercentage: number;
  isEnabled: boolean;
  requiresDirectReferralQualification: boolean;
  directReferralsRequired: number;
}

interface ReferralSettingsFormProps {
  initialEnabled: boolean;
  initialHoldingPeriodDays?: number;
  initialMinWithdrawalAmount?: number;
  initialReferralDiscountPercentage?: number;
  initialIsReferralDiscountEnabled?: boolean;
  initialLevels: Array<{
    id?: string;
    level: number;
    commissionPercentage: number;
    isEnabled: boolean;
    requiresDirectReferralQualification?: boolean;
    directReferralsRequired?: number;
  }>;
}

export function ReferralSettingsForm({
  initialEnabled,
  initialHoldingPeriodDays = 7,
  initialMinWithdrawalAmount = 500,
  initialReferralDiscountPercentage = 10,
  initialIsReferralDiscountEnabled = true,
  initialLevels,
}: ReferralSettingsFormProps) {
  const [isReferralEnabled, setIsReferralEnabled] = useState(initialEnabled);
  const [holdingPeriodDays, setHoldingPeriodDays] = useState(initialHoldingPeriodDays);
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(initialMinWithdrawalAmount);
  const [referralDiscountPercentage, setReferralDiscountPercentage] = useState(initialReferralDiscountPercentage);
  const [isReferralDiscountEnabled, setIsReferralDiscountEnabled] = useState(initialIsReferralDiscountEnabled);
  const [levels, setLevels] = useState<ReferralLevelItem[]>(
    initialLevels.length > 0
      ? initialLevels.map((l) => ({
          id: l.id,
          level: l.level,
          commissionPercentage: l.commissionPercentage,
          isEnabled: l.isEnabled,
          requiresDirectReferralQualification: Boolean(l.requiresDirectReferralQualification),
          directReferralsRequired: Number(l.directReferralsRequired) || 0,
        }))
      : [
          { level: 1, commissionPercentage: 10, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
          { level: 2, commissionPercentage: 5, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
          { level: 3, commissionPercentage: 3, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
        ]
  );
  const [isPending, startTransition] = useTransition();

  const handleAddLevel = () => {
    const nextLevelNumber = levels.length > 0 ? Math.max(...levels.map((l) => l.level)) + 1 : 1;
    setLevels([
      ...levels,
      {
        level: nextLevelNumber,
        commissionPercentage: 2,
        isEnabled: true,
        requiresDirectReferralQualification: false,
        directReferralsRequired: 0,
      },
    ]);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      toast.error("You must have at least one level configured.");
      return;
    }
    const updated = levels.filter((_, i) => i !== index);
    const reindexed = updated.map((l, i) => ({ ...l, level: i + 1 }));
    setLevels(reindexed);
  };

  const handleLevelChange = (
    index: number,
    field: "commissionPercentage" | "isEnabled" | "requiresDirectReferralQualification" | "directReferralsRequired",
    value: number | boolean
  ) => {
    const updated = [...levels];
    if (field === "commissionPercentage") {
      updated[index].commissionPercentage = Math.max(0, Math.min(100, Number(value)));
    } else if (field === "isEnabled") {
      updated[index].isEnabled = Boolean(value);
    } else if (field === "requiresDirectReferralQualification") {
      updated[index].requiresDirectReferralQualification = Boolean(value);
    } else if (field === "directReferralsRequired") {
      updated[index].directReferralsRequired = Math.max(0, Math.min(1000000, Math.floor(Number(value) || 0)));
    }
    setLevels(updated);
  };

  const totalCommission = levels
    .filter((l) => l.isEnabled)
    .reduce((sum, l) => sum + l.commissionPercentage, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalCommission > 100) {
      toast.error("Total enabled commission cannot exceed 100%");
      return;
    }

    if (holdingPeriodDays < 0 || holdingPeriodDays > 365) {
      toast.error("Holding period days must be between 0 and 365 days");
      return;
    }

    if (minWithdrawalAmount < 50 || minWithdrawalAmount > 100000) {
      toast.error("Minimum withdrawal amount must be between ₹50 and ₹1,00,000");
      return;
    }

    if (referralDiscountPercentage < 0 || referralDiscountPercentage > 100) {
      toast.error("Referral discount percentage must be between 0% and 100%");
      return;
    }

    startTransition(async () => {
      try {
        const res = await saveReferralSettingsAction({
          isReferralEnabled,
          holdingPeriodDays,
          minWithdrawalAmount,
          referralDiscountPercentage,
          isReferralDiscountEnabled,
          levels,
        });

        if (res.success) {
          toast.success("Affiliate program & referral discount settings saved successfully!");
        } else {
          toast.error(res.message || "Failed to save settings");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error saving settings";
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Global Toggle Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Affiliate Program Status</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enable or disable multi-level affiliate commission generation system-wide
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isReferralEnabled}
              onChange={(e) => setIsReferralEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        {!isReferralEnabled && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              The affiliate program is currently disabled. No new affiliate commissions will be generated on course purchases.
            </span>
          </div>
        )}
      </div>

      {/* Referral Discount Coupon Configuration */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Referral Discount Coupon Settings
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure the instant discount given to students when they register or checkout using an affiliate referral code
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isReferralDiscountEnabled}
              onChange={(e) => setIsReferralDiscountEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Discount % Input */}
          <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Referral Discount Percentage (%)
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={referralDiscountPercentage}
                onChange={(e) => setReferralDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-10 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Students who enter a referral code on <strong>/register</strong> or <strong>/checkout</strong> get this instant discount (e.g. 5%, 6%, 10%, 20%).
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">Active Status Summary</span>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isReferralDiscountEnabled
                  ? `Students will receive a ${referralDiscountPercentage}% discount on course checkout when referred.`
                  : "Referral discount is currently disabled for incoming students."}
              </p>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 text-xs font-bold text-primary border border-primary/20">
              <CheckCircle2 className="h-4 w-4" />
              <span>{referralDiscountPercentage}% Discount Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Clearance & Payout Rules */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Clearance & Payout Policy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure holding maturity windows and student withdrawal limits
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Holding Days */}
          <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Commission Holding Period
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={holdingPeriodDays}
                onChange={(e) => setHoldingPeriodDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-3 pr-14 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                Days
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              New commissions stay in <strong>Pending Balance</strong> for {holdingPeriodDays} days before automatically moving to <strong>Available Balance</strong>.
            </p>
          </div>

          {/* Min Withdrawal Amount */}
          <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
                Minimum Payout Threshold
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₹
              </span>
              <input
                type="number"
                min="50"
                max="100000"
                step="50"
                value={minWithdrawalAmount}
                onChange={(e) => setMinWithdrawalAmount(Math.max(50, parseFloat(e.target.value) || 50))}
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Students must have at least <strong>₹{minWithdrawalAmount}</strong> in Available Balance to request a bank / UPI withdrawal.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Level Config Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Commission Tiers & Levels</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure dynamic payout percentages and optional direct referral qualification requirements for each tier
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddLevel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Tier (Level {levels.length + 1})
          </button>
        </div>

        {/* Info banner explaining direct referrals */}
        <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Direct Referrals:</strong> Direct referrals are users personally referred by a member (depth 1). Indirect/network members and deeper downline tiers are not counted towards qualification. If qualification is disabled, any active member receives commission at that level without restriction.
          </span>
        </div>

        {/* Levels list */}
        <div className="space-y-3">
          {levels.map((lvl, index) => (
            <div
              key={lvl.level}
              className={`flex flex-col gap-4 rounded-xl border p-4 transition-colors lg:flex-row lg:items-center lg:justify-between ${
                lvl.isEnabled
                  ? "border-border/80 bg-background/60"
                  : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              {/* Level Badge & Label */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary font-mono">
                  L{lvl.level}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Level {lvl.level}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {lvl.level === 1
                        ? "(Direct Referrer)"
                        : lvl.level === 2
                        ? "(Grandparent)"
                        : `(${lvl.level} Steps Up)`}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Payout on referred student purchases
                  </p>
                </div>
              </div>

              {/* Direct Referral Qualification Control */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={!lvl.isEnabled}
                    checked={Boolean(lvl.requiresDirectReferralQualification)}
                    onChange={(e) =>
                      handleLevelChange(index, "requiresDirectReferralQualification", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                  />
                  <span>Require Direct Referral Qualification:</span>
                </label>

                {lvl.requiresDirectReferralQualification ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      disabled={!lvl.isEnabled}
                      value={lvl.directReferralsRequired ?? 0}
                      onChange={(e) =>
                        handleLevelChange(index, "directReferralsRequired", Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      title="Minimum number of personally referred members required to earn commission at this level."
                      className="flex h-8 w-18 rounded-md border border-input bg-background px-2 text-center text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">
                      direct referrals
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/40">
                    Not Required
                  </span>
                )}
              </div>

              {/* Commission % & Actions */}
              <div className="flex items-center justify-between gap-4 lg:justify-end">
                {/* Commission % Input */}
                <div className="flex items-center gap-1.5">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={!lvl.isEnabled}
                      value={lvl.commissionPercentage}
                      onChange={(e) =>
                        handleLevelChange(index, "commissionPercentage", Number(e.target.value))
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-7 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* Level Toggle */}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lvl.isEnabled}
                    onChange={(e) =>
                      handleLevelChange(index, "isEnabled", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>Enabled</span>
                </label>

                {/* Remove button */}
                <button
                  type="button"
                  disabled={levels.length <= 1}
                  onClick={() => handleRemoveLevel(index)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 cursor-pointer"
                  title="Remove Level"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total Commission summary */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-semibold text-foreground">Total Configured Commission:</span>
            <p className="text-xs text-muted-foreground">
              Sum of payouts across all active upline levels per sale
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-xl font-extrabold ${
                totalCommission > 50 ? "text-amber-500" : "text-primary"
              }`}
            >
              {totalCommission.toFixed(1)}%
            </span>
            {totalCommission > 50 && (
              <p className="text-[11px] text-amber-500 flex items-center gap-1 justify-end">
                <ShieldAlert className="h-3 w-3" />
                High commission payout
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "Saving..." : "Save Referral Configuration"}
        </button>
      </div>
    </form>
  );
}
