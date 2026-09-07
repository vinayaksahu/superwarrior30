"use client";

import { useState, useTransition } from "react";
import {
  ShieldAlert,
  Save,
  X,
  Loader2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AcademyRiskRules,
  DEFAULT_ACADEMY_RISK_RULES,
} from "@/types/risk-manager";
import { saveAcademyRiskRulesAction } from "@/server/actions/risk-manager.actions";

interface AdminRiskRulesModalProps {
  initialRules: AcademyRiskRules;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newRules: AcademyRiskRules) => void;
}

export function AdminRiskRulesModal({
  initialRules,
  isOpen,
  onClose,
  onSaved,
}: AdminRiskRulesModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<AcademyRiskRules>(initialRules);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await saveAcademyRiskRulesAction(formData);
        if (res.success) {
          toast.success("🛡️ Academy risk rules updated successfully!");
          onSaved?.(formData);
          onClose();
        } else {
          toast.error(res.error || "Failed to update risk rules");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error saving rules");
      }
    });
  };

  const handleResetToDefault = () => {
    if (confirm("Reset all risk rules to default academy settings?")) {
      setFormData(DEFAULT_ACADEMY_RISK_RULES);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Academy Risk Management Rules
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure global discipline limits, LL rule, and max trades per day for all students.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Consecutive Losses (LL Rule) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🛑 Max Consecutive Losses (LL Rule)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.maxConsecutiveLosses}
                onChange={(e) =>
                  setFormData({ ...formData, maxConsecutiveLosses: Number(e.target.value) })
                }
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <p className="text-[10px] text-muted-foreground">
                e.g. 2 consecutive losses → trade close / stop trading for the day.
              </p>
            </div>

            {/* Max Trades Per Day */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🎯 Max Trades Allowed / Day</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxTradesPerDay}
                onChange={(e) =>
                  setFormData({ ...formData, maxTradesPerDay: Number(e.target.value) })
                }
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <p className="text-[10px] text-muted-foreground">
                Daily trade cap (e.g. 3 trades per day max).
              </p>
            </div>

            {/* Min Risk Reward Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>⚖️ Min Risk-Reward Ratio (1:X)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.minRiskRewardRatio}
                onChange={(e) =>
                  setFormData({ ...formData, minRiskRewardRatio: Number(e.target.value) })
                }
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <p className="text-[10px] text-muted-foreground">
                e.g. 3 = Minimum 1:3 RRR enforced.
              </p>
            </div>

            {/* Mandatory Break After Loss */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>⏱️ Mandatory Break After Loss (Mins)</span>
              </label>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={formData.revengeBreakMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, revengeBreakMinutes: Number(e.target.value) })
                }
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <p className="text-[10px] text-muted-foreground">
                Cool-down period after a loss to prevent revenge trading.
              </p>
            </div>

            {/* Default Risk Per Trade % */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Recommended Risk % / Trade
              </label>
              <input
                type="number"
                min="0.5"
                max="15"
                step="0.5"
                value={formData.defaultRiskPercent}
                onChange={(e) =>
                  setFormData({ ...formData, defaultRiskPercent: Number(e.target.value) })
                }
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <p className="text-[10px] text-muted-foreground">Default recommended risk percentage (e.g. 4%).</p>
            </div>
          </div>

          {/* Rule Descriptions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Rule Text Customization (Shown to Students)
            </h4>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground">
                LL Rule Text
              </label>
              <input
                type="text"
                value={formData.llRuleText}
                onChange={(e) => setFormData({ ...formData, llRuleText: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground">
                No Revenge Rule Text
              </label>
              <input
                type="text"
                value={formData.noRevengeText}
                onChange={(e) => setFormData({ ...formData, noRevengeText: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 text-xs font-black shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Risk Rules</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
