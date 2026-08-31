"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { submitSupportInquiryAction } from "@/server/actions/support.actions";

const CATEGORIES = [
  { value: "GENERAL", label: "General Inquiry / Program Details" },
  { value: "PAYMENT", label: "Payment, UPI & Billing Verification" },
  { value: "COURSE_ACCESS", label: "Course Access / Student Login" },
  { value: "TECHNICAL", label: "Video Player / PDF Technical Issue" },
  { value: "REFUND", label: "Refund / Cancellation Request" },
  { value: "AFFILIATE", label: "Affiliate Program & Commissions" },
];

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [inquiryId, setInquiryId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "GENERAL",
    orderNumber: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    try {
      const res = await submitSupportInquiryAction({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        category: formData.category,
        orderNumber: formData.orderNumber || null,
        subject: formData.subject,
        message: formData.message,
      });

      if (res.success && res.inquiryId) {
        setInquiryId(res.inquiryId);
        setIsSubmitted(true);
        toast.success("Support inquiry logged successfully!");
      } else {
        setErrorMessage(res.error || "Failed to log inquiry");
        toast.error(res.error || "Submission failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground">Inquiry Received & Logged</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Thank you for contacting us, <strong>{formData.name}</strong>. Your support ticket ID is:
          </p>
          <div className="inline-block rounded-lg bg-background border border-border px-3 py-1 font-mono text-xs font-bold text-primary shadow-sm">
            #{inquiryId.slice(-8).toUpperCase()}
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Our customer support desk will review your inquiry and get back to you at <strong>{formData.email}</strong> within 24 business hours.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                name: "",
                email: "",
                phone: "",
                category: "GENERAL",
                orderNumber: "",
                subject: "",
                message: "",
              });
            }}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Submit another query
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-foreground">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            required
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-foreground">
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            required
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-semibold text-foreground">
            Phone / WhatsApp Number (Optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category" className="text-xs font-semibold text-foreground">
            Inquiry Category <span className="text-destructive">*</span>
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-card text-foreground">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="orderNumber" className="text-xs font-semibold text-foreground">
            Order ID / Transaction Ref (Optional)
          </label>
          <input
            id="orderNumber"
            type="text"
            value={formData.orderNumber}
            onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
            placeholder="e.g. ORD-2026-XXXX or pay_XXXX"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="subject" className="text-xs font-semibold text-foreground">
            Subject <span className="text-destructive">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g. Need assistance with Super Warrior 30 enrollment"
            required
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-xs font-semibold text-foreground">
          Message Details <span className="text-destructive">*</span>
        </label>
        <textarea
          id="message"
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Please describe your query or technical issue in detail..."
          required
          className="flex w-full rounded-lg border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground">
          Average resolution window: <strong className="text-foreground">Under 24 Hours</strong>
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? "Submitting Inquiry..." : "Submit Inquiry"}
        </button>
      </div>
    </form>
  );
}
