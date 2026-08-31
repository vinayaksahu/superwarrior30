"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { createStudentTicketAction } from "@/server/actions/support.actions";
import { SupportInquiryStatus } from "@/generated/prisma";

interface TicketListItem {
  id: string;
  subject: string;
  category: string;
  status: SupportInquiryStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastSenderRole: string;
}

interface StudentSupportClientProps {
  tickets: TicketListItem[];
  user: {
    name: string | null;
    email: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General Query",
  PAYMENT: "Payment & Billing",
  COURSE_ACCESS: "Course Access",
  TECHNICAL: "Technical Issue",
  REFUND: "Refund Query",
  AFFILIATE: "Affiliate & Wallet",
};

const STATUS_BADGES: Record<SupportInquiryStatus, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  NEW: { label: "Open", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  WAITING_FOR_USER: { label: "Response Received", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

export function StudentSupportClient({ tickets, user }: StudentSupportClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    category: "GENERAL",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createStudentTicketAction({
        subject: formData.subject,
        category: formData.category,
        message: formData.message,
      });

      if (res.success && res.ticketId) {
        toast.success("Support ticket created successfully!");
        setIsModalOpen(false);
        setFormData({ subject: "", category: "GENERAL", message: "" });
        startTransition(() => {
          router.push(`/dashboard/support/${res.ticketId}`);
        });
      } else {
        toast.error(res.error || "Failed to create ticket");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "NEW").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "WAITING_FOR_USER").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Header & Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LifeBuoy className="h-7 w-7 text-primary" />
            Support & Helpdesk
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Have an issue with lessons, payment verification, or account? Create a ticket and our team will assist you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Total Tickets</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{tickets.length}</p>
          <span className="text-[11px] text-muted-foreground">Logged with support</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Active / Open</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500">{openCount + inProgressCount}</p>
          <span className="text-[11px] text-muted-foreground">Under review / replied</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{resolvedCount}</p>
          <span className="text-[11px] text-muted-foreground">Successfully closed</span>
        </div>
      </div>

      {/* Ticket List */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/80 p-4 sm:p-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">My Support Tickets</h2>
          <span className="text-xs text-muted-foreground">{tickets.length} total</span>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
            <LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">No support tickets found</p>
            <p className="max-w-md mx-auto">
              If you ever face any problems with your course access, payment verification, or live mentorship sessions, you can click &quot;New Support Ticket&quot; above.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {tickets.map((t) => {
              const status = STATUS_BADGES[t.status] || STATUS_BADGES.OPEN;
              const categoryLabel = CATEGORY_LABELS[t.category] || "General";
              const isStaffReply = t.lastSenderRole === "ADMIN";

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/support/${t.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground">
                        #{t.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">
                        {categoryLabel}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${status.color}`}>
                        {status.label}
                      </span>
                      {isStaffReply && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Staff Replied
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {t.subject}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {t.lastMessage}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="h-3 w-3" />
                      {new Date(t.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>View</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Create Support Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Authenticated Account Info Preview */}
            <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Ticket Account:</span>
              <span className="font-semibold text-foreground">
                {user.name || "Student"} ({user.email})
              </span>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Issue Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="GENERAL">General Query</option>
                  <option value="PAYMENT">Payment & UPI Verification</option>
                  <option value="COURSE_ACCESS">Course & Video Access</option>
                  <option value="TECHNICAL">Technical Player / PDF Issue</option>
                  <option value="REFUND">Refund / Billing Dispute</option>
                  <option value="AFFILIATE">Affiliate & Wallet Withdrawal</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Subject <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. UPI payment done but course not activated"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Message / Details <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue with transaction IDs, module names, or details..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-input px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Ticket</span>
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
