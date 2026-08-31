"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitPublicContactAction } from "@/server/actions/support.actions";

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setErrorMessage(null);

    try {
      const res = await submitPublicContactAction({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject,
        message: formData.message,
      });

      if (res.success) {
        setIsSubmitted(true);
        toast.success("Thank you! Your message has been sent successfully.");
      } else {
        setErrorMessage(res.error || "Failed to send message");
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
          <h3 className="text-lg font-bold text-foreground">Message Sent Successfully!</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Thank you for contacting us, <strong>{formData.name}</strong>. We have received your inquiry and our team will get back to you at <strong>{formData.email}</strong> as soon as possible.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                name: "",
                email: "",
                phone: "",
                subject: "",
                message: "",
              });
            }}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Row 1: Name & Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Rahul Sharma"
            className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g. rahul@example.com"
            className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Row 2: Phone / WhatsApp Number */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Phone / WhatsApp Number <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+91 98765 43210"
          className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Row 3: Subject */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Subject <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Brief summary of your question or inquiry"
          className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Row 4: Message */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Type your message or inquiry here..."
          className="w-full rounded-xl border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Sending Message...</span>
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" />
            <span>Send Message</span>
          </>
        )}
      </button>
    </form>
  );
}
