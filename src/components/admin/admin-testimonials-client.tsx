"use client";

import { useState, useTransition } from "react";
import {
  approveTestimonialAction,
  rejectTestimonialAction,
  toggleFeaturedTestimonialAction,
  toggleTestimonialHomeAction,
  toggleTestimonialLandingAction,
  toggleVisibilityAction,
  updateTestimonialAction,
  deleteTestimonialAction,
  createAdminTestimonialAction,
} from "@/server/actions/testimonial.actions";
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  Sparkles,
  Search,
  Plus,
  Maximize2,
  X,
  Check,
  Home,
  Rocket,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { TestUserBadge } from "@/components/shared/test-user-badge";

export interface AdminTestimonialItem {
  id: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    isTestData?: boolean;
  } | null;
  studentName: string;
  content: string;
  photoUrl: string | null;
  videoUrl: string | null;
  rating: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  isApproved: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  showOnHome?: boolean;
  showOnLanding?: boolean;
  displayOrder: number;
  tradingPlatform: string | null;
  accountType: string | null;
  tradingResult: string | null;
  experienceDuration: string | null;
  consentGiven: boolean;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  approvedAt: string | null;
  isTestData: boolean;
  createdAt: string;
  updatedAt: string;
  media: Array<{
    id: string;
    url: string;
    caption: string | null;
    type: string;
  }>;
}

interface AdminTestimonialsClientProps {
  initialTestimonials: AdminTestimonialItem[];
}

export function AdminTestimonialsClient({
  initialTestimonials,
}: AdminTestimonialsClientProps) {
  const [testimonials, setTestimonials] = useState<AdminTestimonialItem[]>(initialTestimonials);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "FEATURED" | "HOME" | "LANDING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransitioning, startTransition] = useTransition();

  // Modals state
  const [rejectingItem, setRejectingItem] = useState<AdminTestimonialItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editingItem, setEditingItem] = useState<AdminTestimonialItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);

  // Manual Add Form State
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("TradingView / MT5");
  const [newAccountType, setNewAccountType] = useState("Real Account");
  const [newResult, setNewResult] = useState("");
  const [newDuration, setNewDuration] = useState("3-6 Months");
  const [newApproveImmediately, setNewApproveImmediately] = useState(true);
  const [newIsFeatured, setNewIsFeatured] = useState(false);
  const [newShowOnHome, setNewShowOnHome] = useState(true);
  const [newShowOnLanding, setNewShowOnLanding] = useState(true);
  const [newScreenshotUrls, setNewScreenshotUrls] = useState<string[]>([]);
  const [tempScreenshotUrl, setTempScreenshotUrl] = useState("");

  // Common Rejection Presets
  const rejectionPresets = [
    "Screenshot is blurry or unreadable. Please upload a clear HD chart.",
    "Review content is too brief or requires more detailed feedback.",
    "Trading proof contains sensitive personal or credential details.",
    "Promotional or inappropriate external links detected.",
    "Please verify trade entry/exit chart screenshot.",
  ];

  // Stats calculation
  const totalCount = testimonials.length;
  const pendingCount = testimonials.filter((t) => t.status === "PENDING").length;
  const approvedCount = testimonials.filter((t) => t.status === "APPROVED" || t.isApproved).length;
  const rejectedCount = testimonials.filter((t) => t.status === "REJECTED").length;
  const featuredCount = testimonials.filter((t) => t.isFeatured).length;
  const homeCount = testimonials.filter((t) => t.showOnHome !== false && (t.status === "APPROVED" || t.isApproved)).length;
  const landingCount = testimonials.filter((t) => t.showOnLanding !== false && (t.status === "APPROVED" || t.isApproved)).length;

  // Filtered list
  const filteredTestimonials = testimonials.filter((t) => {
    if (activeTab === "PENDING" && t.status !== "PENDING") return false;
    if (activeTab === "APPROVED" && t.status !== "APPROVED" && !t.isApproved) return false;
    if (activeTab === "REJECTED" && t.status !== "REJECTED") return false;
    if (activeTab === "FEATURED" && !t.isFeatured) return false;
    if (activeTab === "HOME" && (t.showOnHome === false || (!t.isApproved && t.status !== "APPROVED"))) return false;
    if (activeTab === "LANDING" && (t.showOnLanding === false || (!t.isApproved && t.status !== "APPROVED"))) return false;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = t.studentName.toLowerCase().includes(q);
      const matchContent = t.content.toLowerCase().includes(q);
      const matchPlatform = (t.tradingPlatform || "").toLowerCase().includes(q);
      const matchEmail = (t.user?.email || "").toLowerCase().includes(q);
      return matchName || matchContent || matchPlatform || matchEmail;
    }

    return true;
  });

  // Action: Approve
  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        const res = await approveTestimonialAction(id);
        if (res.success) {
          toast.success("Testimonial approved & published successfully!");
          setTestimonials((prev) =>
            prev.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: "APPROVED" as const,
                    isApproved: true,
                    isVisible: true,
                    showOnHome: t.showOnHome ?? true,
                    showOnLanding: t.showOnLanding ?? true,
                    rejectionReason: null,
                    approvedAt: new Date().toISOString(),
                    reviewedAt: new Date().toISOString(),
                  }
                : t
            )
          );
        } else {
          toast.error(res.error || "Approval failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Approval failed";
        toast.error(msg);
      }
    });
  };

  // Action: Reject
  const handleRejectSubmit = () => {
    if (!rejectingItem) return;
    const reason = rejectionReason.trim() || "Review does not meet publication standards.";

    startTransition(async () => {
      try {
        const res = await rejectTestimonialAction(rejectingItem.id, reason);
        if (res.success) {
          toast.success("Testimonial rejected and returned with feedback.");
          setTestimonials((prev) =>
            prev.map((t) =>
              t.id === rejectingItem.id
                ? {
                    ...t,
                    status: "REJECTED" as const,
                    isApproved: false,
                    isFeatured: false,
                    rejectionReason: reason,
                    reviewedAt: new Date().toISOString(),
                  }
                : t
            )
          );
          setRejectingItem(null);
          setRejectionReason("");
        } else {
          toast.error(res.error || "Rejection failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Rejection failed";
        toast.error(msg);
      }
    });
  };

  // Action: Toggle Featured
  const handleToggleFeatured = (item: AdminTestimonialItem) => {
    if (item.status !== "APPROVED" && !item.isApproved) {
      toast.error("Only approved testimonials can be featured.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await toggleFeaturedTestimonialAction(item.id);
        if (res.success) {
          toast.success(res.isFeatured ? "Marked as Featured Spotlight!" : "Removed from Featured.");
          setTestimonials((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, isFeatured: Boolean(res.isFeatured) } : t))
          );
        } else {
          toast.error(res.error || "Action failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Action failed";
        toast.error(msg);
      }
    });
  };

  // Action: Toggle Homepage Placement
  const handleToggleHome = (item: AdminTestimonialItem) => {
    startTransition(async () => {
      try {
        const res = await toggleTestimonialHomeAction(item.id);
        if (res.success) {
          toast.success(res.showOnHome ? "Now showing on Homepage!" : "Hidden from Homepage.");
          setTestimonials((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, showOnHome: Boolean(res.showOnHome) } : t))
          );
        } else {
          toast.error(res.error || "Action failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Action failed";
        toast.error(msg);
      }
    });
  };

  // Action: Toggle Landing Page Placement
  const handleToggleLanding = (item: AdminTestimonialItem) => {
    startTransition(async () => {
      try {
        const res = await toggleTestimonialLandingAction(item.id);
        if (res.success) {
          toast.success(res.showOnLanding ? "Now showing on Funnel Landing Page!" : "Hidden from Landing Page.");
          setTestimonials((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, showOnLanding: Boolean(res.showOnLanding) } : t))
          );
        } else {
          toast.error(res.error || "Action failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Action failed";
        toast.error(msg);
      }
    });
  };

  // Action: Toggle Visibility
  const handleToggleVisibility = (item: AdminTestimonialItem) => {
    startTransition(async () => {
      try {
        const res = await toggleVisibilityAction(item.id);
        if (res.success) {
          toast.success(res.isVisible ? "Testimonial is now public!" : "Testimonial hidden from public view.");
          setTestimonials((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, isVisible: Boolean(res.isVisible) } : t))
          );
        } else {
          toast.error(res.error || "Action failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Action failed";
        toast.error(msg);
      }
    });
  };

  // Action: Delete
  const handleDeleteConfirm = () => {
    if (!deletingId) return;

    startTransition(async () => {
      try {
        const res = await deleteTestimonialAction(deletingId);
        if (res.success) {
          toast.success("Testimonial deleted.");
          setTestimonials((prev) => prev.filter((t) => t.id !== deletingId));
          setDeletingId(null);
        } else {
          toast.error(res.error || "Deletion failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Deletion failed";
        toast.error(msg);
      }
    });
  };

  // Action: Create Manual
  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await createAdminTestimonialAction({
          studentName: newName,
          content: newContent,
          rating: newRating,
          photoUrl: newPhotoUrl || undefined,
          tradingPlatform: newPlatform,
          accountType: newAccountType,
          tradingResult: newResult,
          experienceDuration: newDuration,
          isApproved: newApproveImmediately,
          isFeatured: newIsFeatured,
          showOnHome: newShowOnHome,
          showOnLanding: newShowOnLanding,
          screenshots: newScreenshotUrls.map((url) => ({ url })),
        });

        if (res.success) {
          toast.success("Manual testimonial created successfully!");
          setIsCreateModalOpen(false);
          // reset
          setNewName("");
          setNewContent("");
          setNewRating(5);
          setNewPhotoUrl("");
          setNewResult("");
          setNewScreenshotUrls([]);

          window.location.reload();
        } else {
          toast.error(res.error || "Creation failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Creation failed";
        toast.error(msg);
      }
    });
  };

  // Action: Edit Save
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    startTransition(async () => {
      try {
        const res = await updateTestimonialAction(editingItem.id, {
          studentName: editingItem.studentName,
          content: editingItem.content,
          rating: editingItem.rating,
          photoUrl: editingItem.photoUrl || undefined,
          tradingPlatform: editingItem.tradingPlatform || undefined,
          accountType: editingItem.accountType || undefined,
          tradingResult: editingItem.tradingResult || undefined,
          experienceDuration: editingItem.experienceDuration || undefined,
          isVisible: editingItem.isVisible,
          isFeatured: editingItem.isFeatured,
          showOnHome: editingItem.showOnHome ?? true,
          showOnLanding: editingItem.showOnLanding ?? true,
        });

        if (res.success) {
          toast.success("Testimonial updated.");
          setTestimonials((prev) =>
            prev.map((t) => (t.id === editingItem.id ? editingItem : t))
          );
          setEditingItem(null);
        } else {
          toast.error(res.error || "Update failed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Update failed";
        toast.error(msg);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
            <Star className="h-6 w-6 text-primary fill-primary" />
            <span>Testimonials Moderation & Placements</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review student submissions, manage screenshots, and configure exactly where each testimonial appears (Homepage vs Funnel Landing Page).
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Testimonial</span>
        </button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <div
          onClick={() => setActiveTab("ALL")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "ALL" ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card hover:border-border/80"
          }`}
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-xl font-black text-foreground mt-1">{totalCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("PENDING")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "PENDING"
              ? "border-amber-500 bg-amber-500/10 shadow-sm"
              : "border-border bg-card hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</p>
            {pendingCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className="text-xl font-black text-amber-500 mt-1">{pendingCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("APPROVED")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "APPROVED"
              ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
              : "border-border bg-card hover:border-emerald-500/40"
          }`}
        >
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Approved</p>
          <p className="text-xl font-black text-emerald-500 mt-1">{approvedCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("REJECTED")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "REJECTED"
              ? "border-destructive bg-destructive/10 shadow-sm"
              : "border-border bg-card hover:border-destructive/40"
          }`}
        >
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Rejected</p>
          <p className="text-xl font-black text-destructive mt-1">{rejectedCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("FEATURED")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "FEATURED"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Featured</p>
          <p className="text-xl font-black text-primary mt-1">{featuredCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("HOME")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "HOME"
              ? "border-emerald-400 bg-emerald-500/10 shadow-sm"
              : "border-border bg-card hover:border-emerald-400/40"
          }`}
        >
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">🏠 On Home</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{homeCount}</p>
        </div>

        <div
          onClick={() => setActiveTab("LANDING")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            activeTab === "LANDING"
              ? "border-blue-400 bg-blue-500/10 shadow-sm"
              : "border-border bg-card hover:border-blue-400/40"
          }`}
        >
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">🚀 On Funnel</p>
          <p className="text-xl font-black text-blue-400 mt-1">{landingCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "FEATURED", "HOME", "LANDING"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "ALL" && `All (${totalCount})`}
              {tab === "PENDING" && `Pending (${pendingCount})`}
              {tab === "APPROVED" && `Approved (${approvedCount})`}
              {tab === "REJECTED" && `Rejected (${rejectedCount})`}
              {tab === "FEATURED" && `⭐ Featured (${featuredCount})`}
              {tab === "HOME" && `🏠 On Home (${homeCount})`}
              {tab === "LANDING" && `🚀 On Funnel (${landingCount})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviews or names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2 text-xs focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Testimonials List / Grid */}
      {filteredTestimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground bg-card">
          No testimonials match the selected tab filter or search query.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTestimonials.map((t) => {
            const isApproved = t.status === "APPROVED" || t.isApproved;
            const isPending = t.status === "PENDING";
            const isRejected = t.status === "REJECTED";

            return (
              <div
                key={t.id}
                className={`rounded-2xl border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                  t.isFeatured
                    ? "border-primary/60 ring-1 ring-primary/40 bg-gradient-to-b from-card to-primary/5"
                    : isApproved
                    ? "border-emerald-500/30"
                    : isRejected
                    ? "border-destructive/30"
                    : "border-amber-500/40"
                }`}
              >
                <div className="space-y-3">
                  {/* Top student header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {t.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.photoUrl}
                          alt={t.studentName}
                          className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-sm">
                          {t.studentName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foreground">{t.studentName}</p>
                          <TestUserBadge isTestData={t.isTestData} />
                        </div>
                        {t.user?.email && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {t.user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-0.5 justify-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-bold ${
                        isApproved
                          ? "text-emerald-500"
                          : isRejected
                          ? "text-destructive"
                          : "text-amber-500"
                      }`}
                    >
                      {isApproved && "✅ Approved & Published"}
                      {isPending && "⏳ Pending Moderation"}
                      {isRejected && "❌ Rejected / Needs Revision"}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Placement Badges / Quick Toggles */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Live Placements & Visibility:
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* Homepage Placement Toggle */}
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleToggleHome(t)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                          t.showOnHome !== false
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-muted text-muted-foreground/50 border border-border/60 line-through hover:text-muted-foreground"
                        }`}
                        title="Click to toggle Homepage display"
                      >
                        <Home className="h-3 w-3" />
                        <span>Home</span>
                        {t.showOnHome !== false ? <Check className="h-2.5 w-2.5" /> : null}
                      </button>

                      {/* Landing Page Placement Toggle */}
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleToggleLanding(t)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                          t.showOnLanding !== false
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30"
                            : "bg-muted text-muted-foreground/50 border border-border/60 line-through hover:text-muted-foreground"
                        }`}
                        title="Click to toggle Funnel Landing Page display"
                      >
                        <Rocket className="h-3 w-3" />
                        <span>Funnel</span>
                        {t.showOnLanding !== false ? <Check className="h-2.5 w-2.5" /> : null}
                      </button>

                      {/* Featured Spotlight Toggle */}
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleToggleFeatured(t)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                          t.isFeatured
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
                            : "bg-muted text-muted-foreground/50 border border-border/60 hover:text-muted-foreground"
                        }`}
                        title="Click to toggle Featured Spotlight"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Featured</span>
                        {t.isFeatured ? <Check className="h-2.5 w-2.5" /> : null}
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleToggleVisibility(t)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                          t.isVisible
                            ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                            : "bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30"
                        }`}
                        title="Click to toggle Public Visibility"
                      >
                        {t.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        <span>{t.isVisible ? "Visible" : "Hidden"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Rejection Reason if Rejected */}
                  {isRejected && t.rejectionReason && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-destructive">
                        Rejection Note:
                      </span>
                      <p className="text-[11px] text-foreground font-medium">{t.rejectionReason}</p>
                    </div>
                  )}

                  {/* Review Text */}
                  <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-4">
                    &ldquo;{t.content}&rdquo;
                  </p>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.tradingPlatform && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        💻 {t.tradingPlatform}
                      </span>
                    )}
                    {t.tradingResult && (
                      <span className="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold">
                        📈 {t.tradingResult}
                      </span>
                    )}
                    {t.accountType && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        🏦 {t.accountType}
                      </span>
                    )}
                  </div>

                  {/* Screenshots gallery */}
                  {t.media && t.media.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Screenshots ({t.media.length}):
                      </p>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {t.media.map((m, idx) => (
                          <button
                            key={m.id || idx}
                            type="button"
                            onClick={() => setPreviewImage({ url: m.url, caption: m.caption || undefined })}
                            className="group relative h-12 w-20 shrink-0 rounded-lg overflow-hidden border border-border bg-muted focus:outline-none cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.url}
                              alt={m.caption || "Proof"}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Maximize2 className="h-3.5 w-3.5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Moderation Actions */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5">
                    {/* Approve button */}
                    {!isApproved && (
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleApprove(t.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Reject button */}
                    {!isRejected && (
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => {
                          setRejectingItem(t);
                          setRejectionReason("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingItem(t)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit Testimonial"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeletingId(t.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Delete Testimonial"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span>Reject Testimonial Review</span>
              </h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Provide actionable feedback for <strong>{rejectingItem.studentName}</strong>. The student will be able to update and resubmit their review.
            </p>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Quick Preset Feedback:
              </label>
              <div className="space-y-1">
                {rejectionPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="w-full text-left text-xs text-foreground/80 hover:text-foreground hover:bg-muted/50 p-1.5 rounded border border-border/40 transition-colors"
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Rejection Reason / Custom Feedback *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter feedback reason..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:border-destructive focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransitioning}
                onClick={handleRejectSubmit}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isTransitioning ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleEditSave}
            className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span>Edit Testimonial Details & Placements</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Student Name</label>
                <input
                  type="text"
                  value={editingItem.studentName}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, studentName: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Rating (1-5)</label>
                <select
                  value={editingItem.rating}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, rating: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                  <option value="2">⭐⭐ (2 Stars)</option>
                  <option value="1">⭐ (1 Star)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Review Content</label>
              <textarea
                rows={4}
                value={editingItem.content}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, content: e.target.value })
                }
                required
                className="w-full rounded-lg border border-input bg-background p-3 text-xs resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Platform</label>
                <input
                  type="text"
                  value={editingItem.tradingPlatform || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, tradingPlatform: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Result / P&L</label>
                <input
                  type="text"
                  value={editingItem.tradingResult || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, tradingResult: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Placements checkboxes */}
            <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
              <p className="text-[11px] font-bold text-foreground">Where to display this Testimonial:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.showOnHome !== false}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, showOnHome: e.target.checked })
                    }
                    className="rounded border-input text-primary"
                  />
                  <span>🏠 Homepage</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.showOnLanding !== false}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, showOnLanding: e.target.checked })
                    }
                    className="rounded border-input text-primary"
                  />
                  <span>🚀 Funnel Landing</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isFeatured}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isFeatured: e.target.checked })
                    }
                    className="rounded border-input text-primary"
                  />
                  <span>⭐ Featured Top</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isVisible}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isVisible: e.target.checked })
                    }
                    className="rounded border-input text-primary"
                  />
                  <span>👁️ Public Visible</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTransitioning}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                {isTransitioning ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE MANUAL TESTIMONIAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateManual}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Add Verified Student Testimonial</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Student Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Vinayak Sahu"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Rating</label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Photo URL (Optional)</label>
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Testimonial Content *</label>
              <textarea
                rows={3}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Student review text..."
                className="w-full rounded-lg border border-input bg-background p-3 text-xs resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Trading Platform</label>
                <input
                  type="text"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Result / P&L</label>
                <input
                  type="text"
                  value={newResult}
                  onChange={(e) => setNewResult(e.target.value)}
                  placeholder="e.g. +$2,500 (1:4 RR)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Screenshots list */}
            <div className="space-y-2 rounded-xl border border-border p-3">
              <label className="text-xs font-bold text-foreground">Screenshot Image URLs (Max 5)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://... image CDN url"
                  value={tempScreenshotUrl}
                  onChange={(e) => setTempScreenshotUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempScreenshotUrl && newScreenshotUrls.length < 5) {
                      setNewScreenshotUrls([...newScreenshotUrls, tempScreenshotUrl]);
                      setTempScreenshotUrl("");
                    }
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  + Add
                </button>
              </div>
              {newScreenshotUrls.length > 0 && (
                <div className="space-y-1 pt-1">
                  {newScreenshotUrls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-[11px]">
                      <span className="truncate max-w-[300px]">{url}</span>
                      <button
                        type="button"
                        onClick={() => setNewScreenshotUrls(newScreenshotUrls.filter((_, idx) => idx !== i))}
                        className="text-destructive font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Placement settings */}
            <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
              <p className="text-[11px] font-bold text-foreground">Placement & Moderation Options:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShowOnHome}
                    onChange={(e) => setNewShowOnHome(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>🏠 Homepage</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShowOnLanding}
                    onChange={(e) => setNewShowOnLanding(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>🚀 Funnel Landing</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsFeatured}
                    onChange={(e) => setNewIsFeatured(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>⭐ Featured Top</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newApproveImmediately}
                    onChange={(e) => setNewApproveImmediately(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>✅ Approve Now</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTransitioning}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                {isTransitioning ? "Creating..." : "Add Testimonial"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <span>Confirm Testimonial Deletion</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this testimonial? This action will also delete all associated screenshots from the database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransitioning}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                {isTransitioning ? "Deleting..." : "Delete Testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.caption || "Screenshot Preview"}
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
            />
            {previewImage.caption && (
              <p className="text-center text-xs font-bold text-foreground py-2">
                {previewImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
