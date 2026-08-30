"use client";

import { useState } from "react";
import {
  Sparkles,
  Settings2,
  ListFilter,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Search,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BrokerOfferSettings } from "@/lib/broker/config";
import {
  updateBrokerAdminSettingsAction,
  adminVerifyMemberIdAction,
  adminReleaseCashbackPayoutAction,
} from "@/server/actions/broker.actions";
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
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: any;
    createdAt: Date;
    paidAt: Date | null;
  };
  verifiedBy?: { id: string; email: string; name: string | null } | null;
  paidBy?: { id: string; email: string; name: string | null } | null;
}

interface AdminBrokerOffersClientProps {
  initialSettings: BrokerOfferSettings;
  claimsData: {
    claims: ClaimItem[];
    totalCount: number;
    page: number;
    totalPages: number;
  };
}

export function AdminBrokerOffersClient({
  initialSettings,
  claimsData,
}: AdminBrokerOffersClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SETTINGS" | "CLAIMS">("SETTINGS");

  // Settings State
  const [settings, setSettings] = useState<BrokerOfferSettings>(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Claims Filter State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isUpdatingClaim, setIsUpdatingClaim] = useState(false);

  // Modal State for Reject / Payout
  const [rejectModalClaim, setRejectModalClaim] = useState<ClaimItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [payoutModalClaim, setPayoutModalClaim] = useState<ClaimItem | null>(null);
  const [payoutTxRef, setPayoutTxRef] = useState("");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent saving Instant Discount Mode without active auto-verification
    if (settings.mode === "INSTANT_DISCOUNT" && !settings.isAutoVerificationActive) {
      toast.error(
        "Cannot enable Instant Discount Mode: Automatic verification must be configured and active. Please enable Auto-Verification or switch to Cashback Mode."
      );
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await updateBrokerAdminSettingsAction(settings);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleApproveMemberId = async (claim: ClaimItem) => {
    if (
      !confirm(
        `Approve Member ID '${claim.brokerMemberId}' for ${claim.user.email}? This will make ₹${claim.calculatedAmount} cashback AVAILABLE for the student to claim.`
      )
    ) {
      return;
    }

    setIsUpdatingClaim(true);
    try {
      const res = await adminVerifyMemberIdAction({
        claimId: claim.id,
        action: "APPROVE",
      });
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve claim.");
    } finally {
      setIsUpdatingClaim(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalClaim) return;

    setIsUpdatingClaim(true);
    try {
      const res = await adminVerifyMemberIdAction({
        claimId: rejectModalClaim.id,
        action: "REJECT",
        rejectionReason: rejectionReason.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setRejectModalClaim(null);
        setRejectionReason("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reject claim.");
    } finally {
      setIsUpdatingClaim(false);
    }
  };

  const handleConfirmReleasePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalClaim || !payoutTxRef.trim()) {
      toast.error("Please enter the UTR or Transaction Reference ID.");
      return;
    }

    setIsUpdatingClaim(true);
    try {
      const res = await adminReleaseCashbackPayoutAction({
        claimId: payoutModalClaim.id,
        payoutTxRef: payoutTxRef.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setPayoutModalClaim(null);
        setPayoutTxRef("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to release payout.");
    } finally {
      setIsUpdatingClaim(false);
    }
  };

  // Filter claims locally based on criteria
  const filteredClaims = claimsData.claims.filter((c) => {
    if (statusFilter !== "ALL" && c.cashbackStatus !== statusFilter) return false;
    if (modeFilter !== "ALL" && c.mode !== modeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchMember = c.brokerMemberId.toLowerCase().includes(q);
      const matchEmail = c.user.email.toLowerCase().includes(q);
      const matchName = (c.user.name || "").toLowerCase().includes(q);
      const matchOrder = c.order.orderNumber.toLowerCase().includes(q);
      if (!matchMember && !matchEmail && !matchName && !matchOrder) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Broker Offer Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure Cashback Mode vs Instant Discount Mode and manage verification &amp; payouts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl bg-card border border-border p-1">
          <button
            type="button"
            onClick={() => setActiveTab("SETTINGS")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "SETTINGS"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Offer Settings &amp; Modes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CLAIMS")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "CLAIMS"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            Claims &amp; Cashback Ledger ({claimsData.totalCount})
          </button>
        </div>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === "SETTINGS" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* Mode Selector Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Broker Offer Mode</h2>
                <p className="text-xs text-muted-foreground">
                  Select how student discounts and broker rewards are applied.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <span>Offer Enabled</span>
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Cashback Mode */}
              <div
                onClick={() => setSettings({ ...settings, mode: "CASHBACK" })}
                className={`relative rounded-2xl border p-5 cursor-pointer transition-all ${
                  settings.mode === "CASHBACK"
                    ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500"
                    : "border-border bg-background/50 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-400">
                    Mode 1
                  </span>
                  {settings.mode === "CASHBACK" && (
                    <CheckCircle2 className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">CASHBACK MODE</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Does <strong>NOT</strong> require verification before payment.
                </p>
                <div className="mt-3 rounded-xl bg-background/80 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/40">
                  <p className="text-foreground font-semibold">Lifecycle Flow:</p>
                  <p>1. User submits Member ID at checkout.</p>
                  <p>2. User pays full amount (₹4,999) via Razorpay.</p>
                  <p>3. Broker verification = PENDING.</p>
                  <p>4. Admin verifies Member ID &rarr; Status = AVAILABLE.</p>
                  <p>5. User clicks &quot;Claim Cashback&quot; with UPI/Bank info.</p>
                  <p>6. Admin releases payment &rarr; Status = PAID.</p>
                </div>
              </div>

              {/* Option 2: Instant Discount Mode */}
              <div
                onClick={() => {
                  if (!settings.isAutoVerificationActive) {
                    toast.warning(
                      "To enable Instant Discount Mode, you must also enable and configure Automatic Verification below."
                    );
                  }
                  setSettings({ ...settings, mode: "INSTANT_DISCOUNT" });
                }}
                className={`relative rounded-2xl border p-5 cursor-pointer transition-all ${
                  settings.mode === "INSTANT_DISCOUNT"
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-background/50 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                    Mode 2
                  </span>
                  {settings.mode === "INSTANT_DISCOUNT" && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">INSTANT DISCOUNT MODE</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Automated server verification <strong>required</strong> before Razorpay order creation.
                </p>
                <div className="mt-3 rounded-xl bg-background/80 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/40">
                  <p className="text-foreground font-semibold">Lifecycle Flow:</p>
                  <p>1. User enters Member ID at checkout.</p>
                  <p>2. Server strictly auto-verifies Member ID.</p>
                  <p>3. If VERIFIED: 40% discount applied server-side.</p>
                  <p>4. Razorpay order created with discounted amount (₹2,999.40).</p>
                  <p>5. Instant access unlocked upon payment.</p>
                </div>
              </div>
            </div>

            {settings.mode === "INSTANT_DISCOUNT" && !settings.isAutoVerificationActive && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Instant Discount cannot be enabled yet:</p>
                  <p className="mt-0.5">
                    Automatic verification is currently inactive. You must configure and activate Auto-Verification below before activating Instant Discount Mode.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Partner & Offer Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
              Broker Partner &amp; Offer Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Partner Broker Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.brokerName}
                  onChange={(e) => setSettings({ ...settings, brokerName: e.target.value })}
                  placeholder="e.g. Exness, Delta Exchange"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Offer Percentage (%) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={settings.offerPercentage}
                  onChange={(e) =>
                    setSettings({ ...settings, offerPercentage: parseFloat(e.target.value) || 40 })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Affiliate Partner Signup URL *
                </label>
                <input
                  type="url"
                  required
                  value={settings.brokerPartnerUrl}
                  onChange={(e) => setSettings({ ...settings, brokerPartnerUrl: e.target.value })}
                  placeholder="https://one.exness-track.com/a/..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Displayed on checkout page for students who do not yet have an account.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Custom Student Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={settings.customInstructions || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, customInstructions: e.target.value })
                  }
                  placeholder="Create your partner account using our link, complete KYC and deposit..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Automatic Verification Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Automatic Server Verification
                </h2>
                <p className="text-xs text-muted-foreground">
                  Required for Instant Discount Mode. Verifies Member IDs server-side.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <span className={settings.isAutoVerificationActive ? "text-emerald-400" : "text-muted-foreground"}>
                  {settings.isAutoVerificationActive ? "Auto-Verify Active" : "Auto-Verify Inactive"}
                </span>
                <input
                  type="checkbox"
                  checked={settings.isAutoVerificationActive}
                  onChange={(e) =>
                    setSettings({ ...settings, isAutoVerificationActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Verification Provider / Adapter
                </label>
                <select
                  value={settings.autoVerificationProvider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoVerificationProvider: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="INTERNAL_ADAPTER">Internal Structured Adapter (Fast &amp; Safe)</option>
                  <option value="API_WEBHOOK">Custom Broker Webhook / API</option>
                </select>
              </div>

              {settings.autoVerificationProvider === "API_WEBHOOK" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={settings.autoVerificationEndpoint || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, autoVerificationEndpoint: e.target.value })
                      }
                      placeholder="https://api.partner.com/verify-member"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      API Bearer Key / Secret (Optional)
                    </label>
                    <input
                      type="password"
                      value={settings.autoVerificationApiKey || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, autoVerificationApiKey: e.target.value })
                      }
                      placeholder="Secret API key"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Broker Settings...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Broker Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CLAIMS & CASHBACK LEDGER */}
      {activeTab === "CLAIMS" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search Member ID, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="AVAILABLE">Available for Claim</option>
                <option value="CLAIM_REQUESTED">Claim Requested (Payout Pending)</option>
                <option value="PAID">Paid Out</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Mode Filter */}
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="CASHBACK">Cashback Mode</option>
                <option value="INSTANT_DISCOUNT">Instant Discount</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Student / Order</th>
                  <th className="px-4 py-3.5">Broker &amp; Member ID</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Payout Details</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No broker offer records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => {
                    const isPending = claim.cashbackStatus === "PENDING_VERIFICATION";
                    const isAvailable = claim.cashbackStatus === "AVAILABLE";
                    const isClaimed = claim.cashbackStatus === "CLAIM_REQUESTED";
                    const isPaid = claim.cashbackStatus === "PAID";
                    const isRejected = claim.cashbackStatus === "REJECTED";

                    return (
                      <tr key={claim.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-foreground">{claim.user.name || "Student"}</p>
                          <p className="text-[11px] text-muted-foreground">{claim.user.email}</p>
                          <p className="text-[10px] text-primary mt-0.5">
                            Order #{claim.order.orderNumber}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-foreground text-xs">
                            {claim.brokerMemberId}
                          </span>
                          <p className="text-[10px] text-muted-foreground">{claim.brokerName}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {claim.mode}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-bold text-foreground">
                            {formatCurrency(claim.calculatedAmount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {claim.offerPercentage}% of {formatCurrency(claim.coursePrice)}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/20">
                              <Clock className="h-3 w-3" /> Pending Verification
                            </span>
                          )}
                          {isAvailable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Available to Claim
                            </span>
                          )}
                          {isClaimed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-400 border border-sky-500/20">
                              <Loader2 className="h-3 w-3 animate-spin" /> Payout Requested
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                              <ShieldCheck className="h-3 w-3" /> Paid
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold text-destructive border border-destructive/20">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                          {claim.mode === "INSTANT_DISCOUNT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20">
                              <Check className="h-3 w-3" /> Instant Discount
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {claim.payoutDetails ? (
                            <div className="space-y-0.5 text-[11px]">
                              {claim.payoutDetails.method === "UPI" ? (
                                <p className="font-mono text-foreground font-semibold">
                                  UPI: {claim.payoutDetails.upiId}
                                </p>
                              ) : (
                                <>
                                  <p className="font-mono text-foreground font-semibold">
                                    Acc: {claim.payoutDetails.accountNumber}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    IFSC: {claim.payoutDetails.ifsc}
                                  </p>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                          {claim.payoutTxRef && (
                            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                              TxRef: {claim.payoutTxRef}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Actions for PENDING verification in Cashback Mode */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isUpdatingClaim}
                                  onClick={() => handleApproveMemberId(claim)}
                                  className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                                >
                                  Approve ID
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdatingClaim}
                                  onClick={() => setRejectModalClaim(claim)}
                                  className="rounded-lg bg-destructive/15 border border-destructive/30 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/25 transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Release payout button */}
                            {(isClaimed || isAvailable) && (
                              <button
                                type="button"
                                disabled={isUpdatingClaim}
                                onClick={() => setPayoutModalClaim(claim)}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
                              >
                                <Send className="h-3 w-3" />
                                Release Payout
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Reject Broker Member ID Verification
            </h3>
            <p className="text-xs text-muted-foreground">
              Member ID <strong>{rejectModalClaim.brokerMemberId}</strong> for student {rejectModalClaim.user.email}.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Rejection Reason (Visible to Student)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Member ID is not registered under our affiliate link or account is not activated."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-destructive focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRejectModalClaim(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClaim}
                  className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Payout Modal */}
      {payoutModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Release Cashback Payout
            </h3>
            <p className="text-xs text-muted-foreground">
              Transfer <strong>{formatCurrency(payoutModalClaim.calculatedAmount)}</strong> to {payoutModalClaim.user.name || payoutModalClaim.user.email}.
            </p>

            {payoutModalClaim.payoutDetails && (
              <div className="rounded-xl bg-background/80 p-3.5 text-xs border border-border/50 space-y-1">
                <p className="font-bold text-foreground">Student Payout Destination:</p>
                {payoutModalClaim.payoutDetails.method === "UPI" ? (
                  <p className="font-mono text-emerald-400 font-semibold">
                    UPI ID: {payoutModalClaim.payoutDetails.upiId}
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-foreground">
                      Account: {payoutModalClaim.payoutDetails.accountNumber}
                    </p>
                    <p className="font-mono text-foreground">
                      IFSC: {payoutModalClaim.payoutDetails.ifsc}
                    </p>
                    <p className="text-muted-foreground">
                      Name: {payoutModalClaim.payoutDetails.accountName}
                    </p>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleConfirmReleasePayout} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Transaction Reference / UTR Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 423984712093 / UPI Ref ID"
                  value={payoutTxRef}
                  onChange={(e) => setPayoutTxRef(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPayoutModalClaim(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClaim}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Confirm Payout Released
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
