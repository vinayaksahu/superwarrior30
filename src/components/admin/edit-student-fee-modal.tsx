"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminGetStudentFeeDetailsAction,
  adminUpdateStudentFeeAction,
} from "@/server/actions/admin-student.actions";
import {
  Coins,
  X,
  Loader2,
  CheckCircle2,
  IndianRupee,
  FileText,
  CreditCard,
  Edit2,
  Receipt,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface EditStudentFeeModalProps {
  studentId: string;
  studentName?: string | null;
  studentEmail: string;
  currentTotalFee: number;
  size?: "xs" | "sm" | "default";
}

interface FeeDetailsState {
  totalFeeCollected: number;
  orders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentProvider: string;
    paymentRef: string;
    paidAt: Date;
    items: { title: string; price: number }[];
  }[];
  enrolledCourses: {
    id: string;
    title: string;
    catalogPrice: number;
  }[];
}

export function EditStudentFeeModal({
  studentId,
  studentName,
  studentEmail,
  currentTotalFee,
  size = "xs",
}: EditStudentFeeModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<FeeDetailsState | null>(null);

  // Form inputs
  const [amount, setAmount] = useState<string>(String(currentTotalFee || 0));
  const [paymentMode, setPaymentMode] = useState<string>("UPI / GPay / PhonePe");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetStudentFeeDetailsAction(studentId);
      setDetails(res);
      setAmount(String(res.totalFeeCollected || 0));
      if (res.orders.length > 0 && res.orders[0].paymentRef) {
        setNotes(res.orders[0].paymentRef);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load fee details";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Please enter a valid amount (>= 0).");
      return;
    }

    startTransition(async () => {
      const res = await adminUpdateStudentFeeAction({
        studentId,
        amount: numAmount,
        paymentMode,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message);
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update fee collection.");
        toast.error(res.error || "Failed to update fee collection.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          size === "xs"
            ? "inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            : "inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
        }
        title={`Edit Course Fee Collection for ${studentName || studentEmail}`}
      >
        <Edit2 className="h-2.5 w-2.5" />
        <span>Edit Fee</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-bold text-foreground truncate">
                  Edit Course Fee Collection
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {studentName || "Student"} • {studentEmail}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Loading payment details...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}

                {/* Enrolled Courses Summary */}
                {details?.enrolledCourses && details.enrolledCourses.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Enrolled Courses & Catalog Price:
                    </span>
                    {details.enrolledCourses.map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-[11px]">
                        <span className="truncate mr-2 text-foreground font-medium">{c.title}</span>
                        <span className="font-mono text-primary font-bold">
                          {c.catalogPrice ? `₹${c.catalogPrice.toLocaleString("en-IN")}` : "Free"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Course Fee Collected Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 14999"
                      className="flex h-9 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-xs font-mono font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This amount reflects directly in Dashboard Total Revenue and Orders report.
                  </p>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Method / Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe / Paytm</option>
                    <option value="Crypto USDT (BEP20)">Crypto USDT (BEP20)</option>
                    <option value="Cash Payment">Cash Payment (Offline / In-Hand)</option>
                    <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                    <option value="Manual Admin Scholarship / Free">Scholarship / Fee Waived (₹0)</option>
                    <option value="Other Method">Other Payment Gateway / Method</option>
                  </select>
                </div>

                {/* Notes / Reference */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Reference / UTR / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. UTR: 42918291024 or Cash receipt #102"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Order History */}
                {details?.orders && details.orders.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      Recorded Order Entries:
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto rounded-lg border border-border p-2 bg-muted/10 text-[10px]">
                      {details.orders.map((o) => (
                        <div key={o.id} className="flex justify-between items-center py-0.5 border-b border-border/40 last:border-0">
                          <div>
                            <span className="font-mono text-primary font-bold">{o.orderNumber}</span>
                            <span className="text-muted-foreground ml-1.5">
                              ({new Date(o.paidAt).toLocaleDateString("en-IN")})
                            </span>
                          </div>
                          <span className="font-bold text-emerald-400">
                            {formatCurrency(o.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleClose}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Save Fee Update</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
