"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Search,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trash2,
  Edit3,
  Receipt,
  UserCheck,
  Globe,
  Send,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  replyAdminInquiryAction,
  updateSupportInquiryStatusAction,
  deleteSupportInquiryAction,
  getAdminInquiryDetailAction,
} from "@/server/actions/support.actions";
import { SupportInquiryStatus } from "@/generated/prisma";

interface InquiryListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: string;
  source: string;
  status: SupportInquiryStatus;
  orderNumber: string | null;
  adminNotes: string | null;
  userId: string | null;
  messageCount: number;
  lastMessage: string;
  lastSenderRole: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  senderId: string | null;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface AdminSupportClientProps {
  inquiries: InquiryListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    publicCount: number;
    studentTicketsCount: number;
    open: number;
    inProgress: number;
    waitingForUser: number;
    resolved: number;
    closed: number;
  };
  currentStatus: string;
  currentSource: string;
  currentSearch: string;
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
  OPEN: { label: "Open", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  NEW: { label: "Open", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  WAITING_FOR_USER: { label: "Waiting for User", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

export function AdminSupportClient({
  inquiries,
  pagination,
  metrics,
  currentStatus,
  currentSource,
  currentSearch,
}: AdminSupportClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentSearch || "");

  // Modal / Detailed View State
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [inquiryDetail, setInquiryDetail] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    category: string;
    source: string;
    status: SupportInquiryStatus;
    adminNotes: string | null;
    userId: string | null;
    createdAt: string;
    updatedAt: string;
    messages: MessageItem[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Reply & Status Edit state
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<SupportInquiryStatus>("WAITING_FOR_USER");
  const [editingNotes, setEditingNotes] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (currentStatus && currentStatus !== "ALL" && key !== "status") {
      params.set("status", currentStatus);
    }
    if (currentSource && currentSource !== "ALL" && key !== "source") {
      params.set("source", currentSource);
    }
    if (currentSearch && key !== "search") {
      params.set("search", currentSearch);
    }

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

  const handleOpenDetail = async (item: InquiryListItem) => {
    setActiveInquiryId(item.id);
    setReplyMessage("");
    setEditingNotes(item.adminNotes || "");
    setReplyStatus(item.status === "CLOSED" ? "CLOSED" : "WAITING_FOR_USER");
    setIsLoadingDetail(true);

    try {
      const res = await getAdminInquiryDetailAction(item.id);
      if (res.success && res.inquiry) {
        setInquiryDetail(res.inquiry);
      } else {
        toast.error("Failed to load details");
      }
    } catch {
      toast.error("Error loading conversation thread");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeInquiryId || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const res = await replyAdminInquiryAction({
        inquiryId: activeInquiryId,
        message: replyMessage.trim(),
        newStatus: replyStatus,
      });

      if (res.success) {
        toast.success("Reply posted and status updated");
        setReplyMessage("");
        // Refresh detail modal
        const updatedRes = await getAdminInquiryDetailAction(activeInquiryId);
        if (updatedRes.success && updatedRes.inquiry) {
          setInquiryDetail(updatedRes.inquiry);
        }
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Failed to send reply");
      }
    } catch {
      toast.error("Error sending reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleSaveNotesAndStatus = async () => {
    if (!activeInquiryId) return;

    try {
      const res = await updateSupportInquiryStatusAction({
        id: activeInquiryId,
        status: replyStatus,
        adminNotes: editingNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Status and notes updated");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Failed to update");
      }
    } catch {
      toast.error("Error updating status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this support inquiry / ticket?")) return;

    try {
      const res = await deleteSupportInquiryAction(id);
      if (res.success) {
        toast.success("Inquiry deleted");
        if (activeInquiryId === id) {
          setActiveInquiryId(null);
          setInquiryDetail(null);
        }
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
      {/* Source Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => handleFilterChange("source", "ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentSource === "ALL"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-card text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          All Inquiries & Tickets ({metrics.total})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("source", "STUDENT_TICKET")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentSource === "STUDENT_TICKET"
              ? "bg-blue-600 text-white shadow"
              : "bg-card text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Student Tickets ({metrics.studentTicketsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("source", "PUBLIC_CONTACT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentSource === "PUBLIC_CONTACT"
              ? "bg-amber-600 text-white shadow"
              : "bg-card text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Public Contact Inquiries ({metrics.publicCount})</span>
        </button>
      </div>

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
            <span>Total Shown</span>
            <LifeBuoy className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{metrics.total}</p>
          <span className="text-[11px] text-muted-foreground">All support inquiries</span>
        </div>

        <div
          onClick={() => handleFilterChange("status", "OPEN")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm space-y-1 transition-all ${
            currentStatus === "OPEN"
              ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Open / Pending</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500">{metrics.open}</p>
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
          <p className="text-2xl font-extrabold text-blue-400">{metrics.inProgress + metrics.waitingForUser}</p>
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
            placeholder="Search name, email, subject, message..."
            className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        {/* Quick Status Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open / Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Inquiries / Tickets List */}
      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No support inquiries found</p>
          <p>Incoming student tickets and public contact submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const isStudentTicket = inq.source === "STUDENT_TICKET";
            const stat = STATUS_BADGES[inq.status] || STATUS_BADGES.OPEN;
            const cat = CATEGORY_LABELS[inq.category] || CATEGORY_LABELS.GENERAL;

            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 transition-all hover:border-border/80"
              >
                {/* Top Row: User details & Source badge */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{inq.name}</span>

                      {/* Source Indicator Badge */}
                      {isStudentTicket ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                          <UserCheck className="h-3 w-3" />
                          Student Ticket
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                          <Globe className="h-3 w-3" />
                          Public Contact
                        </span>
                      )}

                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                        {cat.label}
                      </span>
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
                      onClick={() => handleOpenDetail(inq)}
                      className="inline-flex items-center gap-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      <span>{isStudentTicket ? "View & Reply" : "Manage"}</span>
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
                    {inq.lastMessage || inq.message}
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Ticket ID: #{inq.id.slice(-8).toUpperCase()} {inq.messageCount > 0 && `• ${inq.messageCount} messages`}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${inq.email}?subject=${encodeURIComponent(
                        `Re: ${inq.subject} [Ticket #${inq.id.slice(-8).toUpperCase()}]`
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </a>
                    {inq.phone && (
                      <a
                        href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `Hello ${inq.name}, we are contacting you regarding your support inquiry "${inq.subject}".`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
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

      {/* Detailed Conversation & Reply Modal */}
      {activeInquiryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Inquiry #{activeInquiryId.slice(-8).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveInquiryId(null);
                  setInquiryDetail(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingDetail || !inquiryDetail ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                <p>Loading conversation thread...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="rounded-xl bg-background border border-border p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-sm">{inquiryDetail.name}</span>
                    <span className="text-muted-foreground">{inquiryDetail.email}</span>
                  </div>
                  <p className="font-semibold text-primary">{inquiryDetail.subject}</p>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Conversation Messages ({inquiryDetail.messages.length})
                  </h4>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {inquiryDetail.messages.length === 0 ? (
                      <div className="rounded-xl border border-border bg-background p-3.5 text-xs text-foreground/90 whitespace-pre-wrap">
                        {inquiryDetail.message}
                      </div>
                    ) : (
                      inquiryDetail.messages.map((m) => {
                        const isStaff = m.senderRole === "ADMIN";
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                              isStaff
                                ? "border-primary/30 bg-primary/5 ml-4"
                                : "border-border bg-background mr-4"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-1">
                              <span className="font-bold text-foreground">
                                {isStaff ? "Staff: " + m.senderName : m.senderName}
                              </span>
                              <span>{new Date(m.createdAt).toLocaleString("en-IN")}</span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                              {m.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-primary" />
                    Post Staff Reply to Thread
                  </h4>

                  <textarea
                    rows={3}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the student/customer..."
                    className="w-full rounded-xl border border-input bg-card p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <label className="font-semibold text-muted-foreground">Next Status:</label>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as SupportInquiryStatus)}
                        className="h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground"
                      >
                        <option value="WAITING_FOR_USER">Waiting for User</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                        <option value="OPEN">Open</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isReplying || !replyMessage.trim()}
                      onClick={handleSendReply}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {isReplying ? "Sending..." : "Send Staff Reply"}
                    </button>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-muted-foreground block">
                    Internal Staff Notes (Admin only)
                  </label>
                  <textarea
                    rows={2}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Internal reference notes..."
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs placeholder:text-muted-foreground"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNotesAndStatus}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Save Notes & Status Only
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
