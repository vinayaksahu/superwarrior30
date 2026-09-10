"use client";

import { useState } from "react";
import Link from "next/link";
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
  Users,
  Percent,
  Plus,
  ArrowRight,
  Sliders,
  DollarSign,
  Edit2,
  Trash2,
  Globe,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BrokerOfferSettings, BrokerItem } from "@/lib/broker/config";
import {
  updateBrokerAdminSettingsAction,
  adminVerifyMemberIdAction,
  adminReleaseCashbackPayoutAction,
} from "@/server/actions/broker.actions";
import { CouponTableActions } from "@/components/admin/coupon-table-actions";
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

interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startDate: Date | string;
  endDate: Date | string;
  usageCount: number;
  usageLimit: number | null;
  isActive: boolean;
  showInCheckout?: boolean;
  isExpired: boolean;
  applicableCoursesCount: number;
  redemptionsCount: number;
}

interface AdminBrokerOffersClientProps {
  initialTab?: string;
  initialSettings: BrokerOfferSettings;
  claimsData: {
    claims: ClaimItem[];
    totalCount: number;
    page: number;
    totalPages: number;
  };
  couponsData?: {
    data: CouponItem[];
    total: number;
    page: number;
    totalPages: number;
  };
  courses?: CourseOption[];
}

export function AdminBrokerOffersClient({
  initialTab = "MATRIX",
  initialSettings,
  claimsData,
  couponsData,
  courses = [],
}: AdminBrokerOffersClientProps) {
  const router = useRouter();

  // Normalize initial active tab
  const getValidTab = (tabStr: string): "MATRIX" | "BROKER" | "COUPONS" | "CLAIMS" => {
    const t = tabStr.toUpperCase();
    if (t === "COUPONS" || t === "COUPON") return "COUPONS";
    if (t === "CLAIMS" || t === "LEDGER") return "CLAIMS";
    if (t === "BROKER" || t === "SETTINGS") return "BROKER";
    return "MATRIX";
  };

  const [activeTab, setActiveTab] = useState<"MATRIX" | "BROKER" | "COUPONS" | "CLAIMS">(
    getValidTab(initialTab)
  );

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
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  // Coupon Search & Filter State
  const [couponSearch, setCouponSearch] = useState<string>("");
  const [couponStatusFilter, setCouponStatusFilter] = useState<string>("all");

  // Multi-Broker Management State
  const [editingBroker, setEditingBroker] = useState<BrokerItem | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);

  const handleOpenAddBroker = () => {
    setEditingBroker({
      id: `broker-${Date.now()}`,
      name: "",
      partnerUrl: "",
      discountType: "PERCENTAGE",
      discountValue: 25,
      offerPercentage: 25,
      couponCode: "",
      description: "Open your broker account using our partner link and unlock a special course benefit.",
      isActive: true,
      requiresMemberId: true,
      requiresProof: false,
    });
    setIsBrokerModalOpen(true);
  };

  const handleOpenEditBroker = (broker: BrokerItem) => {
    setEditingBroker({
      ...broker,
      discountType: broker.discountType || "PERCENTAGE",
      discountValue: broker.discountValue !== undefined ? broker.discountValue : broker.offerPercentage,
    });
    setIsBrokerModalOpen(true);
  };

  const handleSaveBrokerItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBroker) return;

    if (!editingBroker.name.trim()) {
      toast.error("Please enter a Broker Name.");
      return;
    }
    if (!editingBroker.partnerUrl.trim()) {
      toast.error("Please enter a Partner Registration URL.");
      return;
    }

    const itemToSave: BrokerItem = {
      ...editingBroker,
      discountType: editingBroker.discountType || "PERCENTAGE",
      discountValue: editingBroker.discountValue !== undefined ? editingBroker.discountValue : (editingBroker.offerPercentage || 25),
      offerPercentage: editingBroker.discountType === "FIXED_AMOUNT"
        ? (editingBroker.offerPercentage || 25)
        : (editingBroker.discountValue ?? editingBroker.offerPercentage ?? 25),
    };

    const currentBrokers = settings.brokers || [];
    const exists = currentBrokers.some((b) => b.id === itemToSave.id);
    const updatedBrokers = exists
      ? currentBrokers.map((b) => (b.id === itemToSave.id ? itemToSave : b))
      : [...currentBrokers, itemToSave];

    const primary = updatedBrokers.find((b) => b.isActive) || updatedBrokers[0];
    setSettings({
      ...settings,
      brokers: updatedBrokers,
      brokerName: primary?.name || settings.brokerName,
      brokerPartnerUrl: primary?.partnerUrl || settings.brokerPartnerUrl,
      discountType: primary?.discountType || settings.discountType || "PERCENTAGE",
      discountValue: primary?.discountValue ?? settings.discountValue ?? primary?.offerPercentage ?? settings.offerPercentage,
      offerPercentage: primary?.offerPercentage ?? settings.offerPercentage,
    });

    setIsBrokerModalOpen(false);
    setEditingBroker(null);
    toast.success(`Broker "${itemToSave.name}" updated! Click "Save Offer Settings" to persist.`);
  };

  const handleDeleteBrokerItem = (brokerId: string) => {
    const currentBrokers = settings.brokers || [];
    if (currentBrokers.length <= 1) {
      toast.error("You must keep at least one broker configured.");
      return;
    }
    const brokerToDelete = currentBrokers.find((b) => b.id === brokerId);
    if (!confirm(`Are you sure you want to remove ${brokerToDelete?.name || "this broker"}?`)) {
      return;
    }
    const updatedBrokers = currentBrokers.filter((b) => b.id !== brokerId);
    const primary = updatedBrokers.find((b) => b.isActive) || updatedBrokers[0];
    setSettings({
      ...settings,
      brokers: updatedBrokers,
      brokerName: primary?.name || settings.brokerName,
      brokerPartnerUrl: primary?.partnerUrl || settings.brokerPartnerUrl,
      discountType: primary?.discountType || settings.discountType || "PERCENTAGE",
      discountValue: primary?.discountValue ?? settings.discountValue ?? primary?.offerPercentage ?? settings.offerPercentage,
      offerPercentage: primary?.offerPercentage ?? settings.offerPercentage,
    });
    toast.success("Broker removed from list.");
  };

  const handleToggleBrokerActive = (brokerId: string) => {
    const currentBrokers = settings.brokers || [];
    const updatedBrokers = currentBrokers.map((b) =>
      b.id === brokerId ? { ...b, isActive: !b.isActive } : b
    );
    const primary = updatedBrokers.find((b) => b.isActive) || updatedBrokers[0];
    setSettings({
      ...settings,
      brokers: updatedBrokers,
      brokerName: primary?.name || settings.brokerName,
      brokerPartnerUrl: primary?.partnerUrl || settings.brokerPartnerUrl,
      discountType: primary?.discountType || settings.discountType || "PERCENTAGE",
      discountValue: primary?.discountValue ?? settings.discountValue ?? primary?.offerPercentage ?? settings.offerPercentage,
      offerPercentage: primary?.offerPercentage ?? settings.offerPercentage,
    });
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSavingSettings(true);
    try {
      const res = await updateBrokerAdminSettingsAction(settings);
      if (res.success) {
        toast.success(res.message || "Offers & Percentage Settings saved successfully!");
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
        `Approve Member ID '${claim.brokerMemberId}' for ${claim.user?.email || "Student"}? This will make ₹${claim.calculatedAmount} cashback AVAILABLE for the student.`
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
      const matchName = (c.user?.name || "").toLowerCase().includes(q);
      const matchOrder = (c.order?.orderNumber || "").toLowerCase().includes(q);
      if (!matchMember && !matchEmail && !matchName && !matchOrder) return false;
    }
    return true;
  });

  // Safe coupons array extraction
  const couponsList: CouponItem[] = Array.isArray(couponsData?.data) ? couponsData.data : [];
  const totalCouponsCount: number = couponsData?.total ?? couponsList.length;

  const filteredCoupons = couponsList.filter((c) => {
    if (couponStatusFilter === "active" && (!c.isActive || c.isExpired)) return false;
    if (couponStatusFilter === "inactive" && c.isActive) return false;
    if (couponStatusFilter === "expired" && !c.isExpired) return false;
    if (couponSearch.trim()) {
      const q = couponSearch.toUpperCase().trim();
      if (!c.code.toUpperCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Offers &amp; Discounts Hub
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Unified control center for Broker Partner Offers, Affiliate Referral Discounts, and Promo Coupons
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Button for Quick Access */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSavingSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save Offer Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Hub Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("MATRIX")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "MATRIX"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Percent className="h-3.5 w-3.5" />
          Discount Matrix &amp; Rates
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BROKER")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "BROKER"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Partner Broker Config
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("COUPONS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "COUPONS"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          Promo Coupons ({totalCouponsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CLAIMS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "CLAIMS"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          Broker Verifications &amp; Records ({totalClaimsCount})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MASTER DISCOUNT MATRIX & PERCENTAGE RATES */}
      {/* ======================================================== */}
      {activeTab === "MATRIX" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-5xl">
          {/* Header Description */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Active Offer Channels &amp; Percentage Controls
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable or disable each offer independently and customize their discount percentages on checkout.
              </p>
            </div>

            {/* 3 Prominent Offer Channel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1: BROKER PARTNER OFFER */}
              <div
                className={`rounded-2xl border p-5 transition-all space-y-4 ${
                  settings.isEnabled
                    ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                    : "border-border/60 bg-muted/20 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-amber-500" />
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

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Discount Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={settings.discountType || "PERCENTAGE"}
                      onChange={(e) => {
                        const newType = e.target.value as "PERCENTAGE" | "FIXED_AMOUNT";
                        setSettings({
                          ...settings,
                          discountType: newType,
                          discountValue: newType === "PERCENTAGE"
                            ? Math.min(100, settings.discountValue || settings.offerPercentage || 25)
                            : (settings.discountValue || 500),
                        });
                      }}
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:border-amber-500 focus:outline-none"
                    >
                      <option value="PERCENTAGE">Percentage (%) Off</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹) Off</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {settings.discountType === "FIXED_AMOUNT" ? "Broker Offer Amount (₹) *" : "Broker Offer Percentage (%) *"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={settings.discountType === "FIXED_AMOUNT" ? undefined : 100}
                        step={1}
                        value={
                          settings.discountType === "FIXED_AMOUNT"
                            ? (settings.discountValue ?? 500)
                            : (settings.discountValue ?? settings.offerPercentage ?? 25)
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const safeVal = settings.discountType === "FIXED_AMOUNT"
                            ? Math.max(0, val)
                            : Math.max(1, Math.min(100, val));
                          setSettings({
                            ...settings,
                            discountValue: safeVal,
                            offerPercentage: settings.discountType === "FIXED_AMOUNT" ? (settings.offerPercentage || 25) : safeVal,
                          });
                        }}
                        className="h-9 w-full rounded-xl border border-input bg-background pl-3.5 pr-8 text-sm font-black text-amber-400 focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        {settings.discountType === "FIXED_AMOUNT" ? "₹" : "%"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-bold text-foreground">
                      {settings.mode === "INSTANT_DISCOUNT" ? "⚡ Instant Discount" : "💰 Cashback"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Brokers:</span>
                    <span className="font-semibold text-foreground">
                      {(settings.brokers || []).filter((b) => b.isActive).length} Active ({(settings.brokers || []).length} Configured)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("BROKER")}
                    className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 pt-0.5"
                  >
                    Manage Multiple Brokers <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* CARD 2: AFFILIATE REFERRAL DISCOUNT */}
              <div
                className={`rounded-2xl border p-5 transition-all space-y-4 ${
                  settings.isReferralDiscountEnabled !== false
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/60 bg-muted/20 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    Affiliate Referral Discount
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.isReferralDiscountEnabled !== false}
                      onChange={(e) =>
                        setSettings({ ...settings, isReferralDiscountEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Discount Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={settings.referralDiscountType || "PERCENTAGE"}
                      onChange={(e) => {
                        const newType = e.target.value as "PERCENTAGE" | "FIXED_AMOUNT";
                        setSettings({
                          ...settings,
                          referralDiscountType: newType,
                          referralDiscountValue: newType === "PERCENTAGE"
                            ? Math.min(100, settings.referralDiscountValue || settings.referralDiscountPercentage || 10)
                            : (settings.referralDiscountValue || 500),
                        });
                      }}
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="PERCENTAGE">Percentage (%) Off</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹) Off</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {settings.referralDiscountType === "FIXED_AMOUNT" ? "Referral Discount Amount (₹) *" : "Referral Discount Rate (%) *"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={settings.referralDiscountType === "FIXED_AMOUNT" ? undefined : 100}
                        step={1}
                        value={
                          settings.referralDiscountType === "FIXED_AMOUNT"
                            ? (settings.referralDiscountValue ?? 500)
                            : (settings.referralDiscountValue ?? settings.referralDiscountPercentage ?? 10)
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const safeVal = settings.referralDiscountType === "FIXED_AMOUNT"
                            ? Math.max(0, val)
                            : Math.max(1, Math.min(100, val));
                          setSettings({
                            ...settings,
                            referralDiscountValue: safeVal,
                            referralDiscountPercentage: settings.referralDiscountType === "FIXED_AMOUNT" ? (settings.referralDiscountPercentage || 10) : safeVal,
                          });
                        }}
                        className="h-9 w-full rounded-xl border border-input bg-background pl-3.5 pr-8 text-sm font-black text-primary focus:border-primary focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        {settings.referralDiscountType === "FIXED_AMOUNT" ? "₹" : "%"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Students signing up or checking out with an affiliate referral code instantly unlock this discount.
                  </p>
                  <Link
                    href="/admin/referrals/settings"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-0.5"
                  >
                    Manage Commission Tiers & Levels <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* CARD 3: PROMO COUPONS */}
              <div
                className={`rounded-2xl border p-5 transition-all space-y-4 ${
                  settings.isCouponEnabled !== false
                    ? "border-emerald-500/40 bg-emerald-500/5 shadow-sm"
                    : "border-border/60 bg-muted/20 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-emerald-500" />
                    Promo Coupons System
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.isCouponEnabled !== false}
                      onChange={(e) =>
                        setSettings({ ...settings, isCouponEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-emerald-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Configured Promo Codes
                  </label>
                  <div className="flex items-center justify-between rounded-xl bg-background border border-input px-3.5 py-2.5">
                    <span className="text-xs font-bold text-foreground">
                      {totalCouponsCount} Coupons Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("COUPONS")}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      Manage <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                  Controls the promo coupon input box on checkout. Individual discount % and limits are set per coupon.
                </p>
              </div>
            </div>

            {/* Stacking Permissions Matrix */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Discount &amp; Offer Stacking Permissions Matrix
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select which discounts can be combined together by students on the checkout page.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 rounded-xl bg-card p-3.5 border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowCouponWithBroker || settings.allowCouponStacking)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allowCouponWithBroker: e.target.checked,
                        allowCouponStacking: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-foreground">Promo Coupon + Broker Offer</p>
                    <p className="text-[11px] text-muted-foreground">
                      Allow students to combine promo coupon codes with partner broker offers.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl bg-card p-3.5 border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowReferralWithCoupon)}
                    onChange={(e) =>
                      setSettings({ ...settings, allowReferralWithCoupon: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-foreground">Referral Discount + Promo Coupon</p>
                    <p className="text-[11px] text-muted-foreground">
                      Allow students to apply both an affiliate referral code and a promo coupon.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl bg-card p-3.5 border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowReferralWithBroker)}
                    onChange={(e) =>
                      setSettings({ ...settings, allowReferralWithBroker: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-foreground">Referral Discount + Broker Offer</p>
                    <p className="text-[11px] text-muted-foreground">
                      Allow students to stack referral discount rates with partner broker offers.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl bg-primary/10 p-3.5 border border-primary/30 cursor-pointer hover:border-primary transition-colors">
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
                    <p className="text-xs font-bold text-foreground">
                      Stack All Three Simultaneously (Promo + Referral + Broker)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Permit students to combine all three discount types simultaneously on a single order.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Settings...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save All Rates &amp; Stacking Rules
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PARTNER BROKERS & OFFER CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === "BROKER" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* SECTION 1: PARTNER BROKERS MANAGER */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-400" />
                  Partner Brokers ({(settings.brokers || []).length})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure multiple broker partners. Students can select any one broker on checkout and apply its discount / coupon code.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddBroker}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-black px-3.5 py-2 text-xs font-bold shadow hover:bg-amber-400 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Partner Broker
              </button>
            </div>

            {/* List of Brokers */}
            <div className="space-y-3">
              {(settings.brokers || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No partner brokers configured yet. Click &quot;Add Partner Broker&quot; to configure one.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {(settings.brokers || []).map((broker, idx) => (
                    <div
                      key={broker.id || idx}
                      className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        broker.isActive
                          ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                          : "border-border/60 bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate">
                            {broker.name}
                          </span>
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            {broker.discountType === "FIXED_AMOUNT"
                              ? `₹${broker.discountValue !== undefined ? broker.discountValue : 500} OFF`
                              : `${broker.discountValue ?? broker.offerPercentage}% OFF`}
                          </span>
                          {broker.couponCode ? (
                            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                              Coupon: {broker.couponCode}
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                              No Coupon
                            </span>
                          )}
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              broker.isActive
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {broker.isActive ? "Active on Checkout" : "Disabled"}
                          </span>
                        </div>

                        {broker.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {broker.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                          {broker.partnerUrl ? (
                            <a
                              href={broker.partnerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:underline inline-flex items-center gap-1 font-mono text-[10px] truncate max-w-xs"
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{broker.partnerUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-destructive">No partner URL set</span>
                          )}
                          <span>
                            {broker.requiresMemberId !== false ? "✓ Requires Member ID" : "No Member ID required"}
                          </span>
                          {broker.requiresProof && <span>✓ Requires Screenshot Proof</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBrokerActive(broker.id)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                            broker.isActive
                              ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {broker.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBroker(broker)}
                          className="rounded-lg border border-input p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                          title="Edit Broker"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBrokerItem(broker.id)}
                          disabled={(settings.brokers || []).length <= 1}
                          className="rounded-lg border border-input p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 cursor-pointer"
                          title="Delete Broker"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: GLOBAL BROKER OFFER RULES */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Global Broker Offer Rules</h2>
              <p className="text-xs text-muted-foreground">
                Configure benefit mode, minimum orders, caps, and course eligibility across all partner brokers.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground block">Broker Benefit Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    settings.mode === "INSTANT_DISCOUNT"
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-border/80 bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Percent className="h-4 w-4 text-primary" />
                      Instant Discount Mode (At Checkout)
                    </span>
                    <input
                      type="radio"
                      name="brokerMode"
                      checked={settings.mode === "INSTANT_DISCOUNT"}
                      onChange={() => setSettings({ ...settings, mode: "INSTANT_DISCOUNT" })}
                      className="text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Directly discounts the total payable at checkout upon entering/applying partner broker coupon or Member ID.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    settings.mode === "CASHBACK"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-border hover:border-border/80 bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                      Cashback Mode (Post-Purchase)
                    </span>
                    <input
                      type="radio"
                      name="brokerMode"
                      checked={settings.mode === "CASHBACK"}
                      onChange={() => setSettings({ ...settings, mode: "CASHBACK" })}
                      className="text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Student pays standard amount at checkout. Benefit amount is verified by admin and released to wallet post-purchase.
                  </p>
                </label>
              </div>
            </div>

            {/* Caps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.minimumOrderAmount || 0}
                  onChange={(e) =>
                    setSettings({ ...settings, minimumOrderAmount: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Maximum Benefit Cap (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.maximumBenefitAmount || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maximumBenefitAmount: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="No limit"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Course Scope Selection */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-foreground block">Eligible Courses</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="courseScope"
                    checked={settings.eligibleCourseScope !== "SELECTED_COURSES"}
                    onChange={() => setSettings({ ...settings, eligibleCourseScope: "ALL_COURSES" })}
                  />
                  <span>All Published Courses</span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="courseScope"
                    checked={settings.eligibleCourseScope === "SELECTED_COURSES"}
                    onChange={() => setSettings({ ...settings, eligibleCourseScope: "SELECTED_COURSES" })}
                  />
                  <span>Selected Specific Courses</span>
                </label>
              </div>

              {settings.eligibleCourseScope === "SELECTED_COURSES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-border bg-background">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.eligibleCourseIds?.includes(c.id))}
                        onChange={() => toggleCourseSelection(c.id)}
                      />
                      <span className="truncate">{c.title} ({formatCurrency(c.price)})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save Broker Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PROMOTIONAL COUPONS MANAGER */}
      {/* ======================================================== */}
      {activeTab === "COUPONS" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Promotional Coupons</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create and manage discount codes, per-user limits, and course restrictions
              </p>
            </div>

            <Link
              href="/admin/coupons/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Create New Coupon
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Filter coupon code..."
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  className="flex h-9 w-60 rounded-lg border border-input bg-background pl-3 pr-3 text-xs"
                />

                <div className="flex gap-1.5">
                  {["all", "active", "inactive", "expired"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCouponStatusFilter(s)}
                      className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${
                        couponStatusFilter === s
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-input bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredCoupons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                No coupons found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                      <th className="px-4 py-3 font-medium">Coupon Code</th>
                      <th className="px-4 py-3 font-medium">Discount Value</th>
                      <th className="px-4 py-3 font-medium">Validity</th>
                      <th className="px-4 py-3 font-medium">Usage Count</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Checkout Display</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <span className="font-mono font-extrabold text-foreground text-sm tracking-wider">
                            {c.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
                            {c.discountType === "PERCENTAGE"
                              ? `${c.discountValue}% OFF`
                              : formatCurrency(c.discountValue) + " OFF"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(c.startDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          -{" "}
                          {new Date(c.endDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {c.usageCount} <span className="text-muted-foreground font-normal">/ {c.usageLimit || "∞"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              c.isExpired
                                ? "bg-muted text-muted-foreground border-border"
                                : c.isActive
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {c.isExpired ? "Expired" : c.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              c.showInCheckout !== false
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {c.showInCheckout !== false ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CouponTableActions
                            couponId={c.id}
                            code={c.code}
                            isActive={c.isActive}
                            showInCheckout={c.showInCheckout}
                            redemptionsCount={c.redemptionsCount || 0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BROKER CLAIMS & CASHBACK LEDGER */}
      {/* ======================================================== */}
      {activeTab === "CLAIMS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search Member ID, email, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="AVAILABLE">Available for Claim</option>
                <option value="CLAIM_REQUESTED">Claim Requested</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Modes</option>
                <option value="INSTANT_DISCOUNT">Instant Discount</option>
                <option value="CASHBACK">Cashback</option>
              </select>
            </div>

            <span className="text-xs text-muted-foreground font-semibold">
              Showing {filteredClaims.length} of {totalClaimsCount} claims
            </span>
          </div>

          {/* Claims Table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {filteredClaims.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ListFilter className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">No broker claims found</p>
                <p className="text-[11px] text-muted-foreground">
                  Claims submitted by students during checkout will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Student / User</th>
                      <th className="px-4 py-3 font-medium">Broker &amp; Member ID</th>
                      <th className="px-4 py-3 font-medium">Order &amp; Course</th>
                      <th className="px-4 py-3 font-medium">Benefit Mode &amp; Amount</th>
                      <th className="px-4 py-3 font-medium">Broker ID Verification</th>
                      <th className="px-4 py-3 font-medium">Benefit / Payout Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredClaims.map((claim) => {
                      const isInstant = claim.mode === "INSTANT_DISCOUNT";
                      return (
                        <tr key={claim.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground">{claim.user?.name || "Student"}</p>
                            <p className="text-[11px] text-muted-foreground">{claim.user?.email || "N/A"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-mono font-bold text-foreground">{claim.brokerMemberId}</p>
                            <p className="text-[11px] text-muted-foreground">{claim.brokerName}</p>
                            {claim.proofUrl && (
                              <button
                                type="button"
                                onClick={() => setProofModalUrl(claim.proofUrl!)}
                                className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <ImageIcon className="h-3 w-3" /> View Proof
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-mono font-bold text-foreground">{claim.order?.orderNumber || "N/A"}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              {claim.order?.items?.[0]?.itemTitle || "Course"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {isInstant ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                  ⚡ Instant Discount
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  💰 Cashback Mode
                                </span>
                              )}
                              <p className="font-bold text-foreground text-sm">
                                {formatCurrency(claim.calculatedAmount)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                ({claim.offerPercentage}% of {formatCurrency(claim.coursePrice)})
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                claim.verificationStatus === "VERIFIED"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : claim.verificationStatus === "REJECTED"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {claim.verificationStatus === "VERIFIED"
                                ? "✓ ID Verified"
                                : claim.verificationStatus === "REJECTED"
                                ? "✕ ID Rejected"
                                : "● Pending Review"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isInstant ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  ✓ Deducted at Checkout
                                </span>
                                <p className="text-[10px] text-muted-foreground">No cashback needed</p>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  claim.cashbackStatus === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : claim.cashbackStatus === "CLAIM_REQUESTED"
                                    ? "bg-primary/10 text-primary"
                                    : claim.cashbackStatus === "AVAILABLE"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {claim.cashbackStatus === "AVAILABLE"
                                  ? "Ready for Claim"
                                  : claim.cashbackStatus === "CLAIM_REQUESTED"
                                  ? "Payout Requested"
                                  : claim.cashbackStatus === "PAID"
                                  ? "Paid Out"
                                  : claim.cashbackStatus}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {claim.verificationStatus === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveMemberId(claim)}
                                    disabled={isUpdatingClaim}
                                    className="rounded bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                    title="Verify student's broker account"
                                  >
                                    Approve ID
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectModalClaim(claim)}
                                    disabled={isUpdatingClaim}
                                    className="rounded bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20 transition-colors"
                                    title="Reject if ID is fake or invalid"
                                  >
                                    Reject ID
                                  </button>
                                </>
                              )}

                            {claim.cashbackStatus === "CLAIM_REQUESTED" && (
                              <button
                                type="button"
                                onClick={() => setPayoutModalClaim(claim)}
                                disabled={isUpdatingClaim}
                                className="rounded bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow"
                              >
                                Release Payout
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">Reject Broker Claim</h3>
            <p className="text-xs text-muted-foreground">
              Please provide a reason for rejecting Member ID {rejectModalClaim.brokerMemberId}.
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Account not registered under partner referral link"
                className="w-full h-24 rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalClaim(null)}
                  className="rounded-xl border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClaim || !rejectionReason.trim()}
                  className="rounded-xl bg-destructive px-3.5 py-2 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {payoutModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">Release Cashback Payout</h3>
            <p className="text-xs text-muted-foreground">
              Releasing ₹{payoutModalClaim.calculatedAmount} to {payoutModalClaim.user?.name || "Student"}.
            </p>
            <form onSubmit={handleConfirmReleasePayout} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Transaction Reference / UTR Number *
                </label>
                <input
                  type="text"
                  required
                  value={payoutTxRef}
                  onChange={(e) => setPayoutTxRef(e.target.value)}
                  placeholder="e.g. 423984712093"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalClaim(null)}
                  className="rounded-xl border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClaim || !payoutTxRef.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
                >
                  Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-w-2xl w-full rounded-2xl bg-card border border-border p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground">Broker Proof Screenshot</span>
              <button
                type="button"
                onClick={() => setProofModalUrl(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofModalUrl}
              alt="Broker Proof"
              className="max-h-[70vh] w-full object-contain rounded-lg border"
            />
          </div>
        </div>
      )}

      {/* Broker Add/Edit Modal */}
      {isBrokerModalOpen && editingBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="relative max-w-lg w-full rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-400" />
                {editingBroker.id.startsWith("broker-") && !(settings.brokers || []).some((b) => b.id === editingBroker.id)
                  ? "Add New Partner Broker"
                  : `Edit Broker: ${editingBroker.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsBrokerModalOpen(false);
                  setEditingBroker(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrokerItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Broker Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GTC FX, Exness, XM"
                    value={editingBroker.name}
                    onChange={(e) => setEditingBroker({ ...editingBroker, name: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Discount Type *
                  </label>
                  <select
                    value={editingBroker.discountType || "PERCENTAGE"}
                    onChange={(e) => {
                      const newType = e.target.value as "PERCENTAGE" | "FIXED_AMOUNT";
                      setEditingBroker({
                        ...editingBroker,
                        discountType: newType,
                        discountValue: newType === "PERCENTAGE"
                          ? Math.min(100, editingBroker.discountValue || editingBroker.offerPercentage || 25)
                          : (editingBroker.discountValue || 500),
                      });
                    }}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-amber-400 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹) Off</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {editingBroker.discountType === "FIXED_AMOUNT" ? "Discount Value (₹) *" : "Discount Value (%) *"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={editingBroker.discountType === "FIXED_AMOUNT" ? undefined : 100}
                      value={
                        editingBroker.discountType === "FIXED_AMOUNT"
                          ? (editingBroker.discountValue ?? 500)
                          : (editingBroker.discountValue ?? editingBroker.offerPercentage ?? 25)
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const safeVal = editingBroker.discountType === "FIXED_AMOUNT"
                          ? Math.max(0, val)
                          : Math.max(1, Math.min(100, val));
                        setEditingBroker({
                          ...editingBroker,
                          discountValue: safeVal,
                          offerPercentage: editingBroker.discountType === "FIXED_AMOUNT" ? (editingBroker.offerPercentage || 25) : safeVal,
                        });
                      }}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 pr-7 text-xs font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      {editingBroker.discountType === "FIXED_AMOUNT" ? "₹" : "%"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Partner Registration URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={editingBroker.partnerUrl}
                  onChange={(e) => setEditingBroker({ ...editingBroker, partnerUrl: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Partner Coupon Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GTC25, EXNESS25"
                  value={editingBroker.couponCode || ""}
                  onChange={(e) =>
                    setEditingBroker({
                      ...editingBroker,
                      couponCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold uppercase text-primary focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  If set, students can click a 1-tap &quot;Apply Coupon&quot; button for this broker on checkout.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Custom Description / Tagline
                </label>
                <textarea
                  rows={2}
                  placeholder="Open your broker account using our partner link and unlock a special course benefit."
                  value={editingBroker.description || ""}
                  onChange={(e) => setEditingBroker({ ...editingBroker, description: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBroker.requiresMemberId !== false}
                    onChange={(e) =>
                      setEditingBroker({ ...editingBroker, requiresMemberId: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-foreground">Require Member ID</span>
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5 border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBroker.requiresProof)}
                    onChange={(e) =>
                      setEditingBroker({ ...editingBroker, requiresProof: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-foreground">Require Screenshot</span>
                </label>
              </div>

              <label className="flex items-center gap-2 rounded-xl bg-primary/5 p-2.5 border border-primary/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingBroker.isActive}
                  onChange={(e) =>
                    setEditingBroker({ ...editingBroker, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">
                  Active &amp; Visible on Checkout
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsBrokerModalOpen(false);
                    setEditingBroker(null);
                  }}
                  className="rounded-xl border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 text-black px-4 py-2 text-xs font-bold shadow hover:bg-amber-400 cursor-pointer"
                >
                  Save to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
