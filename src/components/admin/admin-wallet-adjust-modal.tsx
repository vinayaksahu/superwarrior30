"use client";

import { useState, useTransition } from "react";
import { adminAdjustWalletAction } from "@/server/actions/wallet.actions";
import { formatCurrency } from "@/lib/utils";
import { Settings2, Loader2, X, PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";

interface AdminWalletAdjustModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    availableBalance: number;
  };
}

export function AdminWalletAdjustModal({ user }: AdminWalletAdjustModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid positive adjustment amount");
      return;
    }

    if (type === "DEBIT" && numAmount > user.availableBalance) {
      toast.error(`Cannot debit more than available balance of ${formatCurrency(user.availableBalance)}`);
      return;
    }

    if (reason.trim().length < 5) {
      toast.error("Please enter a detailed reason for the audit ledger (min 5 characters)");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminAdjustWalletAction({
          userId: user.id,
          type,
          amount: numAmount,
          reason: reason.trim(),
        });

        if (res.success) {
          toast.success(res.message);
          setIsOpen(false);
          setAmount("");
          setReason("");
        } else {
          toast.error(res.message || "Adjustment failed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error adjusting balance";
        toast.error(msg);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Adjust
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Manual Wallet Adjustment</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs space-y-1">
              <span className="text-muted-foreground">Target Student:</span>
              <p className="font-bold text-foreground">
                {user.name} ({user.email})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Current Available Balance:{" "}
                <span className="font-extrabold text-primary">
                  {formatCurrency(user.availableBalance)}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("CREDIT")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    type === "CREDIT"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  Credit Balance (+)
                </button>

                <button
                  type="button"
                  onClick={() => setType("DEBIT")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    type === "DEBIT"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <MinusCircle className="h-4 w-4" />
                  Debit Balance (-)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Adjustment Amount (₹ INR) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Audit Reason / Note <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for manual balance adjustment (recorded in ledger and audit logs)"
                  required
                  className="flex w-full rounded-lg border border-input bg-background p-2.5 text-xs ring-offset-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-input px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
