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
  Image as ImageIcon,
  BookOpen,
  Calendar,
  Layers,
  X,
  Building2,
  Tag,
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

interface CourseOption {
  id: string;
  title: string;
  price: number;
  status: string;
}

interface ClaimItem {
  id: string;
  brokerName: string;
  brokerMemberId: string;
  proofUrl?: string | null;
  mode: "CASHBACK" | "INSTANT_DISCOUNT";
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: Date | null;
  rejectionReason: string | null;
  coursePrice: number;
  offerPercentage: number;
  calculatedAmount: number;
  cashbackStatus:
    | "NOT_APPLICABLE"
    | "PENDING_VERIFICATION"
    | "AVAILABLE"
    | "CLAIM_REQUESTED"
    | "PAID"
    | "REJECTED";
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
    items?: { itemTitle: string }[];
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
  courses?: CourseOption[];
}

export function AdminBrokerOffersClient({
  initialSettings,
  claimsData,
  courses = [],
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

  // Modal State for Reject / Payout / Proof
  const [rejectModalClaim, setRejectModalClaim] = useState<ClaimItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [payoutModalClaim, setPayoutModalClaim] = useState<ClaimItem | null>(null);
  const [payoutTxRef, setPayoutTxRef] = useState("");

  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSavingSettings(true);
    try {
      const res = await updateBrokerAdminSettingsAction(settings);
      if (res.success) {
        toast.success(res.message || "Broker Offer and Stacking Settings updated successfully!");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update settings.");
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

  // Toggle course selection for eligibleCourseIds
  const toggleCourseSelection = (courseId: string) => {
    const current = settings.eligibleCourseIds || [];
    const next = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    setSettings({ ...settings, eligibleCourseIds: next });
  };

  // Safe claims array extraction
  const claimsList: ClaimItem[] = Array.isArray(claimsData?.claims)
    ? claimsData.claims
    : Array.isArray(claimsData)
    ? (claimsData as any)
    : [];

  const totalClaimsCount: number = claimsData?.totalCount ?? claimsList.length;

  // Filter claims locally based on criteria
  const filteredClaims = claimsList.filter((c) => {
    if (statusFilter !== "ALL" && c.cashbackStatus !== statusFilter) return false;
    if (modeFilter !== "ALL" && c.mode !== modeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchMember = (c.brokerMemberId || "").toLowerCase().includes(q);
      const matchEmail = (c.user?.email || "").toLowerCase().includes(q);
      const matchName = ((c.user?.name) || "").toLowerCase().includes(q);
      const matchOrder = ((c.order?.orderNumber) || "").toLowerCase().includes(q);
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
              Broker Offers Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure Instant Discount vs Cashback Modes, referral URL, and review student claims.
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
            Offer Settings
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
            Claims &amp; Cashback Ledger ({totalClaimsCount})
          </button>
        </div>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === "SETTINGS" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* Main Mode & Toggle Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Broker Offer Mode</h2>
                <p className="text-xs text-muted-foreground">
                  Select whether students receive an Instant Discount at checkout or Cashback post-purchase.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <span>Offer Enabled</span>
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Instant Discount Mode */}
              <div
                onClick={() => setSettings({ ...settings, mode: "INSTANT_DISCOUNT" })}
                className={`relative rounded-2xl border p-5 cursor-pointer transition-all ${
                  settings.mode === "INSTANT_DISCOUNT"
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-background/50 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                    Mode 1
                  </span>
                  {settings.mode === "INSTANT_DISCOUNT" && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">INSTANT DISCOUNT MODE</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Discount applied <strong>immediately</strong> at checkout.
                </p>
                <div className="mt-3 rounded-xl bg-background/80 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/40">
                  <p className="text-foreground font-semibold">Example Flow:</p>
                  <p>1. Course Price: ₹5,555 | Offer: 40% (-₹2,222)</p>
                  <p>2. Customer pays: ₹3,333 via Razorpay.</p>
                  <p>3. Razorpay order is created for exact ₹3,333.</p>
                </div>
              </div>

              {/* Option 2: Cashback Mode */}
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
                    Mode 2
                  </span>
                  {settings.mode === "CASHBACK" && (
                    <CheckCircle2 className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">CASHBACK MODE</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer pays <strong>full price</strong>. Cashback released post-purchase.
                </p>
                <div className="mt-3 rounded-xl bg-background/80 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/40">
                  <p className="text-foreground font-semibold">Example Flow:</p>
                  <p>1. Customer pays full course amount (₹5,555).</p>
                  <p>2. Cashback claim created (₹2,222) with status PENDING.</p>
                  <p>3. Admin approves and releases payout to student wallet.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Broker Details & Partner URL */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
              Broker Partner &amp; Offer Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Broker Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.brokerName}
                  onChange={(e) => setSettings({ ...settings, brokerName: e.target.value })}
                  placeholder="e.g. GTC FX, Exness"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Discount / Cashback Percentage (%) *
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
                  Broker Registration URL (Partner Referral Link) *
                </label>
                <input
                  type="url"
                  required
                  value={settings.brokerPartnerUrl}
                  onChange={(e) => setSettings({ ...settings, brokerPartnerUrl: e.target.value })}
                  placeholder="https://web.mygtc.app/login/register?ref=FtHnmAFV"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Opened when the student clicks &quot;Open Broker Account&quot; on the checkout page.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.minimumOrderAmount}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minimumOrderAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0 (No minimum)"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Maximum Benefit Cap (₹, Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.maximumBenefitAmount || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maximumBenefitAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Leave empty for uncapped"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Offer Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={settings.startDate ? settings.startDate.slice(0, 10) : ""}
                  onChange={(e) =>
                    setSettings({ ...settings, startDate: e.target.value || null })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Offer End Date (Optional)
                </label>
                <input
                  type="date"
                  value={settings.endDate ? settings.endDate.slice(0, 10) : ""}
                  onChange={(e) =>
                    setSettings({ ...settings, endDate: e.target.value || null })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Offer Description Shown to Students *
                </label>
                <textarea
                  rows={2}
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Open your broker account using our partner link and unlock a special course benefit."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Validation & Verification Rules and Stacking Matrix */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Checkout Requirements &amp; Stacking Rules
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control checkout verification requirements, offer visibility, and multi-discount stacking permissions
              </p>
            </div>

            {/* Independent Module Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Broker Offer Toggle */}
              <div className={`rounded-xl border p-3.5 transition-all ${settings.isEnabled ? "border-amber-500/40 bg-amber-500/10" : "border-border/60 bg-muted/20 opacity-70"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    Broker Partner Offer
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.isEnabled}
                      onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-amber-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {settings.isEnabled ? `Active (${settings.offerPercentage}% ${settings.mode})` : "Disabled on checkout"}
                </p>
              </div>

              {/* 2. Promo Coupons Toggle */}
              <div className={`rounded-xl border p-3.5 transition-all ${settings.isCouponEnabled !== false ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-muted/20 opacity-70"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                    Promo Coupons Box
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.isCouponEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, isCouponEnabled: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-emerald-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {settings.isCouponEnabled !== false ? "Active for coupon redemptions" : "Hidden from checkout"}
                </p>
              </div>

              {/* 3. Referral Discount Toggle */}
              <div className={`rounded-xl border p-3.5 transition-all ${settings.isReferralDiscountEnabled !== false ? "border-primary/40 bg-primary/10" : "border-border/60 bg-muted/20 opacity-70"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Referral Discount Box
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.isReferralDiscountEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, isReferralDiscountEnabled: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {settings.isReferralDiscountEnabled !== false ? `Active (${settings.referralDiscountPercentage || 10}% Instant OFF)` : "Hidden from checkout"}
                </p>
              </div>
            </div>

            {/* Broker Verification Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 rounded-xl bg-background/60 p-3.5 border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireMemberId}
                  onChange={(e) =>
                    setSettings({ ...settings, requireMemberId: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Require Broker Member ID</p>
                  <p className="text-[11px] text-muted-foreground">
                    Students must enter their Broker User/Account ID during checkout.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-background/60 p-3.5 border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireProof}
                  onChange={(e) =>
                    setSettings({ ...settings, requireProof: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Require Proof / Screenshot</p>
                  <p className="text-[11px] text-muted-foreground">
                    Students must upload a screenshot of their broker profile.
                  </p>
                </div>
              </label>
            </div>

            {/* Stacking Permissions Matrix */}
            <div className="rounded-xl border border-border/80 bg-background/80 p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Discount &amp; Offer Stacking Permissions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 rounded-lg bg-card p-3 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowCouponWithBroker || settings.allowCouponStacking)}
                    onChange={(e) =>
                      setSettings({ ...settings, allowCouponWithBroker: e.target.checked, allowCouponStacking: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Promo Coupon + Broker Offer</p>
                    <p className="text-[11px] text-muted-foreground">Allow students to combine promo coupons with broker partner offers.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-lg bg-card p-3 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowReferralWithCoupon)}
                    onChange={(e) =>
                      setSettings({ ...settings, allowReferralWithCoupon: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Referral Discount + Promo Coupon</p>
                    <p className="text-[11px] text-muted-foreground">Allow students to apply both an affiliate referral code and a promo coupon.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-lg bg-card p-3 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowReferralWithBroker)}
                    onChange={(e) =>
                      setSettings({ ...settings, allowReferralWithBroker: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Referral Discount + Broker Offer</p>
                    <p className="text-[11px] text-muted-foreground">Allow students to stack referral discounts with broker partner offers.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-lg bg-primary/10 p-3 border border-primary/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowAllStacking || settings.allowReferralStacking)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allowAllStacking: e.target.checked,
                        allowReferralStacking: e.target.checked,
                        allowCouponWithBroker: e.target.checked ? true : settings.allowCouponWithBroker,
                        allowReferralWithCoupon: e.target.checked ? true : settings.allowReferralWithCoupon,
                        allowReferralWithBroker: e.target.checked ? true : settings.allowReferralWithBroker,
                      })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-foreground">Stack All Three (Coupon + Referral + Broker)</p>
                    <p className="text-[11px] text-muted-foreground">Students can apply Promo Coupon + Referral Discount + Broker Offer all simultaneously.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Referral Discount % Configuration */}
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Referral / Affiliate Discount Rate
                </span>
                <span className="text-[11px] font-semibold text-primary">
                  Current: {settings.referralDiscountPercentage || 10}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Referral Discount Percentage (%)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Modifiable discount rate granted when a valid referral code is used (e.g. 5%, 6%, 10%, 20%).
                  </p>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={settings.referralDiscountPercentage !== undefined ? settings.referralDiscountPercentage : 10}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          referralDiscountPercentage: Math.max(1, Math.min(100, Number(e.target.value) || 0)),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background pl-3.5 pr-8 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Eligible Courses Scope */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Eligible Course Scope
            </h2>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="courseScope"
                  checked={settings.eligibleCourseScope === "ALL_COURSES"}
                  onChange={() => setSettings({ ...settings, eligibleCourseScope: "ALL_COURSES" })}
                  className="text-primary focus:ring-primary cursor-pointer"
                />
                <span>All Courses Eligible</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="courseScope"
                  checked={settings.eligibleCourseScope === "SELECTED_COURSES"}
                  onChange={() => setSettings({ ...settings, eligibleCourseScope: "SELECTED_COURSES" })}
                  className="text-primary focus:ring-primary cursor-pointer"
                />
                <span>Selected Courses Only</span>
              </label>
            </div>

            {settings.eligibleCourseScope === "SELECTED_COURSES" && (
              <div className="mt-3 rounded-xl border border-border bg-background/50 p-4 space-y-2 max-h-56 overflow-y-auto">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                  Select Applicable Courses:
                </p>
                {courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No published courses found.</p>
                ) : (
                  courses.map((c) => {
                    const isSelected = (settings.eligibleCourseIds || []).includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/40 text-xs cursor-pointer"
                      >
                        <span className="font-medium text-foreground">{c.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono">
                            {formatCurrency(c.price)}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCourseSelection(c.id)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                          />
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}
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
                  placeholder="Search Member ID, email, order..."
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
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Course &amp; Order</th>
                  <th className="px-4 py-3.5">Broker &amp; Member ID</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5">Benefit Amount</th>
                  <th className="px-4 py-3.5">Proof</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
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
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-foreground">
                            {claim.order.items?.[0]?.itemTitle || "Course"}
                          </p>
                          <p className="text-[10px] text-primary font-mono mt-0.5">
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
                          {claim.proofUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewProofUrl(claim.proofUrl || null)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                            >
                              <ImageIcon className="h-3.5 w-3.5" /> View Proof
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
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
                                  Approve
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

      {/* Proof Modal */}
      {viewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground">Broker Registration Screenshot</h3>
              <button
                type="button"
                onClick={() => setViewProofUrl(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black flex items-center justify-center max-h-[70vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewProofUrl}
                alt="Broker Proof"
                className="max-h-[68vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Reject Broker Claim Verification
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
                  placeholder="e.g. Member ID is not registered under our partner link or account is not activated."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-destructive focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRejectModalClaim(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
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
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClaim}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Confirm Payout &amp; Credit Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
