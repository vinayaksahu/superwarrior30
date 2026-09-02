"use client";

import { useState, useTransition, useEffect } from "react";
import { requestWithdrawalAction } from "@/server/actions/wallet.actions";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownToLine, Loader2, X, AlertCircle, Building2, Smartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface WithdrawalModalProps {
  availableBalance: number;
  isOpen: boolean;
  onClose: () => void;
}

export function WithdrawalRequestModal({
  availableBalance,
  isOpen,
  onClose,
}: WithdrawalModalProps) {
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<"upi" | "bank_transfer">("upi");
  const [amount, setAmount] = useState<string>("");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 500) {
      toast.error("Minimum withdrawal amount is ₹500");
      return;
    }

    if (numAmount > availableBalance) {
      toast.error(`Amount exceeds your available balance of ${formatCurrency(availableBalance)}`);
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestWithdrawalAction({
          amount: numAmount,
          paymentMethod: method,
          upiId: method === "upi" ? upiId : undefined,
          accountHolderName: method === "bank_transfer" ? accountHolderName : undefined,
          accountNumber: method === "bank_transfer" ? accountNumber : undefined,
          ifscCode: method === "bank_transfer" ? ifscCode : undefined,
          bankName: method === "bank_transfer" ? bankName : undefined,
        });

        if (res.success) {
          toast.success(res.message || "Withdrawal request submitted!");
          onClose();
        } else {
          toast.error(res.message || "Failed to submit withdrawal request");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error submitting request";
        toast.error(msg);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto cursor-pointer"
      onClick={() => !isPending && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">Request Payout Withdrawal</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Available balance notice */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Available to Withdraw</span>
              <p className="text-xl font-extrabold text-primary">{formatCurrency(availableBalance)}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              Min ₹500
            </span>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Withdrawal Amount (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="500"
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (min 500)"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Payout method selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Payout Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("upi")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                  method === "upi"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                UPI Transfer
              </button>

              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                  method === "bank_transfer"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Bank Transfer
              </button>
            </div>
          </div>

          {/* UPI details */}
          {method === "upi" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">UPI ID / VPA</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Full name on account"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Bank account number"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    required
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-background p-3 border border-border text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Funds will be transferred to your registered account within 24-48 business hours.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || availableBalance < 500}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
              {isPending ? "Submitting..." : "Submit Payout Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
