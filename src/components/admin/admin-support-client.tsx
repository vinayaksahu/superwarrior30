"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LifeBuoy,
  Search,
  Filter,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronDown,
  Tag,
  Receipt,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateSupportInquiryStatusAction,
  deleteSupportInquiryAction,
} from "@/server/actions/support.actions";
import { SupportInquiryStatus } from "@/generated/prisma";

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: string;
  status: SupportInquiryStatus;
  orderNumber: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminSupportClientProps {
  inquiries: InquiryItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  GENERAL: { label: "General Inquiry", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  PAYMENT: { label: "Payment & Billing", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  COURSE_ACCESS: { label: "Course Access", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  TECHNICAL: { label: "Technical Issue", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  REFUND: { label: "Refund Request", color: "bg-destructive/10 text-destructive border-destructive/20" },
  AFFILIATE: { label: "Affiliate & Network", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

const STATUS_BADGES: Record<SupportInquiryStatus, { label: string; color: string }> = {
  NEW: { label: "New / Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

export function AdminSupportClient({
  inquiries,
  pagination,
  metrics,
}: AdminSupportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") || "ALL";
  const currentCategory = searchParams.get("category") || "ALL";
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  // Modal / Inline edit state
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingStatus, setEditingStatus] = useState<SupportInquiryStatus>("NEW");
  const [isSaving, setIsSaving] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/admin/support?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", searchInput.trim());
  };

  const handleOpenEdit = (inquiry: InquiryItem) => {
    setSelectedInquiry(inquiry);
    setEditingStatus(inquiry.status);
    setEditingNotes(inquiry.adminNotes || "");
  };

  const handleSaveStatus = async () => {
    if (!selectedInquiry) return;
    setIsSaving(true);

    try {
      const res = await updateSupportInquiryStatusAction({
        id: selectedInquiry.id,
        status: editingStatus,
        adminNotes: editingNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Support ticket updated successfully");
        setSelectedInquiry(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this support inquiry?")) return;

    try {
      const res = await deleteSupportInquiryAction(id);
      if (res.success) {
        toast.success("Inquiry deleted");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete inquiry");
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => handleFilterChange("status", "ALL")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm space-y-1 transition-all ${
            currentStatus === "ALL"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Total Inquiries</span>
            <LifeBuoy className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{metrics.total}</p>
          <span className="text-[11px] text-muted-foreground">All support queries</span>
        </div>

        <div
          onClick={() => handleFilterChange("status", "NEW")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm space-y-1 transition-all ${
            currentStatus === "NEW"
              ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>New / Pending</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500">{metrics.new}</p>
          <span className="text-[11px] text-muted-foreground">Needs response</span>
        </div>

        <div
          onClick={() => handleFilterChange("status", "IN_PROGRESS")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm space-y-1 transition-all ${
            currentStatus === "IN_PROGRESS"
              ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>In Progress</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-400">{metrics.inProgress}</p>
          <span className="text-[11px] text-muted-foreground">Being addressed</span>
        </div>

        <div
          onClick={() => handleFilterChange("status", "RESOLVED")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm space-y-1 transition-all ${
            currentStatus === "RESOLVED"
              ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{metrics.resolved}</p>
          <span className="text-[11px] text-muted-foreground">Closed tickets</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name, email, order #, subject..."
            className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        {/* Category Dropdown & Quick Status Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={currentCategory}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL">General Inquiry</option>
            <option value="PAYMENT">Payment & Billing</option>
            <option value="COURSE_ACCESS">Course Access</option>
            <option value="TECHNICAL">Technical Issue</option>
            <option value="REFUND">Refund Request</option>
            <option value="AFFILIATE">Affiliate & Network</option>
          </select>

          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New / Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Inquiry List */}
      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No support inquiries found</p>
          <p>Customer contact messages submitted on the Contact page will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const cat = CATEGORY_LABELS[inq.category] || CATEGORY_LABELS.GENERAL;
            const stat = STATUS_BADGES[inq.status] || STATUS_BADGES.NEW;

            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 transition-all hover:border-border/80"
              >
                {/* Top Row: User details & Status */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{inq.name}</span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                        {cat.label}
                      </span>
                      {inq.orderNumber && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                          <Receipt className="h-3 w-3" />
                          {inq.orderNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <a href={`mailto:${inq.email}`} className="hover:underline text-foreground">
                          {inq.email}
                        </a>
                      </span>
                      {inq.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          <a
                            href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-emerald-400"
                          >
                            {inq.phone}
                          </a>
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(inq.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${stat.color}`}>
                      {stat.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(inq)}
                      className="inline-flex items-center gap-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      <span>Manage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(inq.id)}
                      className="rounded-xl border border-destructive/20 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                      title="Delete Ticket"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subject & Message Content */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Subject: <span className="font-normal text-muted-foreground">{inq.subject}</span>
                  </h4>
                  <div className="rounded-xl bg-background border border-border/80 p-3.5 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {inq.message}
                  </div>
                </div>

                {/* Admin Notes (if any) */}
                {inq.adminNotes && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs space-y-1">
                    <span className="font-bold text-amber-500 flex items-center gap-1.5 text-[11px]">
                      <Edit3 className="h-3 w-3" />
                      Staff Internal Note:
                    </span>
                    <p className="text-muted-foreground whitespace-pre-wrap">{inq.adminNotes}</p>
                  </div>
                )}

                {/* Quick Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Ticket ID: #{inq.id.slice(-8).toUpperCase()}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${inq.email}?subject=${encodeURIComponent(
                        `Re: ${inq.subject} [Ticket #${inq.id.slice(-8).toUpperCase()}]`
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Reply via Email</span>
                    </a>
                    {inq.phone && (
                      <a
                        href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `Hello ${inq.name}, we are following up on your support ticket #${inq.id.slice(-8).toUpperCase()} regarding "${inq.subject}".`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp Chat</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => handleFilterChange("page", String(pagination.page - 1))}
              className="rounded-lg border border-input bg-card px-3 py-1 font-semibold text-foreground hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handleFilterChange("page", String(pagination.page + 1))}
              className="rounded-lg border border-input bg-card px-3 py-1 font-semibold text-foreground hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Manage Status & Notes Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                Manage Ticket #{selectedInquiry.id.slice(-8).toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Update Ticket Status
                </label>
                <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value as SupportInquiryStatus)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="NEW">New / Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Staff Internal Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="e.g. Student issue resolved over phone. Payment receipt verified."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="rounded-xl border border-input px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveStatus}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
