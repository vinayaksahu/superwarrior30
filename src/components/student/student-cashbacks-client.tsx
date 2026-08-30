"use client";

import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Landmark,
  Smartphone,
  ShieldCheck,
  Check,
  Loader2,
  BadgeAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { claimCashbackAction } from "@/server/actions/broker.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ClaimItem {
  id: string;
  brokerName: string;
  brokerMemberId: string;
  mode: "CASHBACK" | "INSTANT_DISCOUNT";
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: Date | null;
  rejectionReason: string | null;
  coursePrice: number;
  offerPercentage: number;
  calculatedAmount: number;
  cashbackStatus: "NOT_APPLICABLE" | "PENDING_VERIFICATION" | "AVAILABLE" | "CLAIM_REQUESTED" | "PAID" | "REJECTED";
  payoutDetails: any;
  claimedAt: Date | null;
  paidAt: Date | null;
  payoutTxRef: string | null;
  createdAt: Date;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: any;
    items: Array<{ itemTitle: string }>;
  };
}

interface StudentCashbacksClientProps {
  claims: ClaimItem[];
  userEmail: string;
  userName: string | null;
}

export function StudentCashbacksClient({
  claims,
  userEmail,
  userName,
}: StudentCashbacksClientProps) {
  const router = useRouter();
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountName, setAccountName] = useState(userName || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Aggregate stats
  const availableAmount = claims
    .filter((c) => c.cashbackStatus === "AVAILABLE")
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  const pendingAmount = claims
    .filter((c) => c.cashbackStatus === "PENDING_VERIFICATION")
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  const processingAmount = claims
    .filter((c) => c.cashbackStatus === "CLAIM_REQUESTED")
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  const totalPaidAmount = claims
    .filter((c) => c.cashbackStatus === "PAID")
    .reduce((sum, c) => sum + c.calculatedAmount, 0);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    if (payoutMethod === "UPI" && !upiId.trim()) {
      toast.error("Please enter a valid UPI ID (e.g. mobile@upi).");
      return;
    }

    if (payoutMethod === "BANK") {
      if (!accountNumber.trim() || !ifsc.trim()) {
        toast.error("Please enter complete bank account details.");
        return;
      }
    }

    setIsSubmittingClaim(true);

    try {
      const res = await claimCashbackAction({
        claimId: selectedClaim.id,
        payoutDetails: {
          method: payoutMethod,
          upiId: payoutMethod === "UPI" ? upiId.trim() : undefined,
          accountName: accountName.trim() || undefined,
          accountNumber: payoutMethod === "BANK" ? accountNumber.trim() : undefined,
          ifsc: payoutMethod === "BANK" ? ifsc.trim().toUpperCase() : undefined,
          bankName: payoutMethod === "BANK" ? bankName.trim() : undefined,
        },
      });

      if (res.success) {
        toast.success(res.message);
        setSelectedClaim(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit claim.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Partner Broker Cashbacks
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
          Track your Broker Member ID submissions, claim verified cashbacks, and view payout receipts.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
            Available to Claim
          </span>
          <p className="text-2xl font-black text-emerald-400">
            {formatCurrency(availableAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">Admin approved</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            Pending Verification
          </span>
          <p className="text-2xl font-black text-amber-400">
            {formatCurrency(pendingAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">Under admin review</p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
            Processing Payout
          </span>
          <p className="text-2xl font-black text-sky-400">
            {formatCurrency(processingAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">Payout requested</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Paid Out
          </span>
          <p className="text-2xl font-black text-foreground">
            {formatCurrency(totalPaidAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">Transferred to account</p>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">Your Broker Offer Records</h2>

        {claims.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No Broker Claims Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When you submit your Partner Broker Member ID during course checkout, your cashback claims and discount details will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => {
              const isAvailable = claim.cashbackStatus === "AVAILABLE";
              const isPending = claim.cashbackStatus === "PENDING_VERIFICATION";
              const isProcessing = claim.cashbackStatus === "CLAIM_REQUESTED";
              const isPaid = claim.cashbackStatus === "PAID";
              const isRejected = claim.cashbackStatus === "REJECTED";
              const isInstant = claim.mode === "INSTANT_DISCOUNT";

              return (
                <div
                  key={claim.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-foreground text-sm">
                          {claim.brokerName} Partner Offer
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                          {claim.offerPercentage}% {isInstant ? "Instant Discount" : "Cashback"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Member ID: <strong className="font-mono text-foreground">{claim.brokerMemberId}</strong> &middot; Order #{claim.order?.orderNumber || "—"}
                      </p>
                    </div>

                    <div>
                      {isAvailable && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approved &middot; Available to Claim
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          Pending Admin Verification
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-xs font-bold text-sky-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Claim Requested &middot; Processing Payout
                        </span>
                      )}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Paid Out
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 border border-destructive/30 px-3 py-1 text-xs font-bold text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Verification Rejected
                        </span>
                      )}
                      {isInstant && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-bold text-primary">
                          <Check className="h-3.5 w-3.5" />
                          Discount Applied at Checkout
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Course Amount: <strong>{formatCurrency(claim.coursePrice)}</strong>
                      </p>
                      <p className="text-sm font-extrabold text-foreground">
                        {isInstant ? "Discount Value" : "Cashback Amount"}:{" "}
                        <span className="text-primary text-base">
                          {formatCurrency(claim.calculatedAmount)}
                        </span>
                      </p>
                      {claim.rejectionReason && (
                        <p className="text-xs text-destructive font-medium mt-1">
                          Reason: {claim.rejectionReason}
                        </p>
                      )}
                      {isPaid && claim.payoutTxRef && (
                        <p className="text-xs text-emerald-400 font-mono font-semibold mt-1">
                          Payout Ref / UTR: {claim.payoutTxRef}
                        </p>
                      )}
                    </div>

                    {isAvailable && (
                      <button
                        type="button"
                        onClick={() => setSelectedClaim(claim)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Claim {formatCurrency(claim.calculatedAmount)} Cashback
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Payout Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Claim Cashback Payout
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Amount: <strong className="text-emerald-400">{formatCurrency(selectedClaim.calculatedAmount)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Select Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("UPI")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                      payoutMethod === "UPI"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    UPI / VPA (Instant)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                      payoutMethod === "BANK"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Landmark className="h-4 w-4" />
                    Bank Transfer (NEFT/IMPS)
                  </button>
                </div>
              </div>

              {payoutMethod === "UPI" ? (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    UPI ID (Virtual Payment Address) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@oksbi / 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Your cashback will be transferred directly to this UPI address.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Account holder name"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Bank Account No."
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SBIN0001234"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono uppercase text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India, HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingClaim ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Submitting Payout Request...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Submit Cashback Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
