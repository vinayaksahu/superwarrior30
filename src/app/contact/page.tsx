import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ContactForm } from "@/components/public/contact-form";
import { Mail, Clock, MessageSquare, MapPin, Phone, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact & Support Desk — Rahul Trade Warrior Academy",
  description: "Official customer contact desk, corporate address, student assistance, and grievance redressal for Super Warrior 30.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* Hero */}
      <section className="py-14 border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <Mail className="h-3.5 w-3.5" />
            <span>Official Support & Helpdesk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Customer Support & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Need help with course enrollment, UPI payment verification, digital access, or billing? Our dedicated support team is here to assist you.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl grid gap-8 md:grid-cols-3">
          {/* Left Column: Direct Contact & Office Details */}
          <div className="space-y-4 md:col-span-1">
            {/* Email Box */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Mail className="h-4 w-4 shrink-0" />
                <span>Email Support</span>
              </div>
              <p className="text-xs text-foreground font-semibold">
                <a href="mailto:support@superwarrior30.com" className="hover:underline text-primary">
                  support@superwarrior30.com
                </a>
              </p>
              <p className="text-[11px] text-muted-foreground">
                For order receipts, payment disputes, and general questions.
              </p>
            </div>

            {/* Business Hours & Response SLA */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Working Hours & SLA</span>
              </div>
              <p className="text-xs font-medium text-foreground">
                Mon – Sat: 10:00 AM – 7:00 PM IST
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Guaranteed response within <strong>24 business hours</strong>. Sundays & National Holidays closed.
              </p>
            </div>

            {/* Registered Address */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-blue-500 font-bold text-xs">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Registered Office Address</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Rahul Trade Warrior Academy</strong><br />
                VIP Road, Near Magneto The Mall,<br />
                Raipur, Chhattisgarh - 492001, India.
              </p>
            </div>

            {/* Grievance Officer */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Grievance Redressal</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Grievance Officer: <strong>Compliance Desk</strong><br />
                Email: <a href="mailto:grievance@superwarrior30.com" className="text-primary hover:underline">grievance@superwarrior30.com</a>
              </p>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Submit an Online Support Ticket
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in your details below and our team will get back to you promptly with a resolution.
              </p>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-10 text-xs text-muted-foreground border-t border-border/40">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-3">
          <p>© {new Date().getFullYear()} Rahul Trade Warrior Academy — Super Warrior 30. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-foreground">Refund & Cancellation Policy</Link>
            <span>•</span>
            <Link href="/contact" className="text-primary font-bold">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
