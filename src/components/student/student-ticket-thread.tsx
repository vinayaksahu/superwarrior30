"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { replyStudentTicketAction } from "@/server/actions/support.actions";
import { SupportInquiryStatus } from "@/generated/prisma";

interface MessageItem {
  id: string;
  senderId: string | null;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: SupportInquiryStatus;
  createdAt: string;
  updatedAt: string;
  messages: MessageItem[];
}

interface StudentTicketThreadProps {
  ticket: TicketDetail;
  currentUser: {
    id: string;
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
  WAITING_FOR_USER: { label: "Staff Replied", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

export function StudentTicketThread({ ticket, currentUser }: StudentTicketThreadProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const status = STATUS_BADGES[ticket.status] || STATUS_BADGES.OPEN;
  const isClosed = ticket.status === "CLOSED";

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await replyStudentTicketAction({
        ticketId: ticket.id,
        message: replyText.trim(),
      });

      if (res.success) {
        setReplyText("");
        toast.success("Reply sent successfully");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || "Failed to send reply");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine initial description if no messages, or ensure messages list
  const displayMessages = ticket.messages.length > 0 ? ticket.messages : [
    {
      id: "initial",
      senderId: currentUser.id,
      senderRole: "STUDENT",
      senderName: currentUser.name || "Student",
      message: ticket.message,
      createdAt: ticket.createdAt,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar: Back button and Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Tickets</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Ticket Header Box */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono font-bold text-primary">#{ticket.id.slice(-8).toUpperCase()}</span>
          <span>•</span>
          <span className="font-medium text-foreground">{CATEGORY_LABELS[ticket.category] || "General"}</span>
          <span>•</span>
          <span>
            Created {new Date(ticket.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {ticket.subject}
        </h1>
      </div>

      {/* Conversation Messages Thread */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Conversation Thread
        </h2>

        <div className="space-y-4">
          {displayMessages.map((msg) => {
            const isStaff = msg.senderRole === "ADMIN";

            return (
              <div
                key={msg.id}
                className={`rounded-2xl border p-5 shadow-sm space-y-3 transition-all ${
                  isStaff
                    ? "border-primary/30 bg-primary/5 ml-0 sm:ml-6"
                    : "border-border bg-card mr-0 sm:mr-6"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    {isStaff ? (
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {isStaff ? "Super Warrior 30 Support Staff" : (msg.senderName || "Student")}
                      </span>
                      {isStaff && (
                        <span className="text-[10px] text-primary font-semibold">
                          Official Team Response
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(msg.createdAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Box or Closed State */}
      {isClosed ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-xs text-muted-foreground space-y-2">
          <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">This support ticket has been closed</p>
          <p>If you need further help, please create a new support ticket.</p>
          <div className="pt-2">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
            >
              Back to Support Desk
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Send a Reply
          </h3>

          <form onSubmit={handleSendReply} className="space-y-4">
            <textarea
              required
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply or additional information here..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Our support team typically responds within 24 hours.
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending Reply...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
