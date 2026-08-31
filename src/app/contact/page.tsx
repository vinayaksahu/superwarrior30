import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ContactForm } from "@/components/public/contact-form";
import { Mail, Clock, MapPin, MessageSquare, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us — Rahul Trade Warrior Academy",
  description: "Official contact information, address, and inquiry desk for Super Warrior 30.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* Hero */}
      <section className="py-14 border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>We are here to help</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Contact Us
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Have questions about our mentorship program, curriculum, or enrollment? Send us a message and our team will get back to you shortly.
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
                <span>Email Us</span>
              </div>
              <p className="text-xs text-foreground font-semibold">
                <a href="mailto:support@superwarrior30.com" className="hover:underline text-primary">
                  support@superwarrior30.com
                </a>
              </p>
              <p className="text-[11px] text-muted-foreground">
                For course queries, payment questions, and general guidance.
              </p>
            </div>

            {/* Business Hours */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Operating Hours</span>
              </div>
              <p className="text-xs font-medium text-foreground">
                Monday – Saturday: 10:00 AM – 7:00 PM IST
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Response typically within 24 business hours.
              </p>
            </div>

            {/* Registered Address */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-blue-500 font-bold text-xs">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Registered Office</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Rahul Trade Warrior Academy</strong><br />
                VIP Road, Near Magneto The Mall,<br />
                Raipur, Chhattisgarh - 492001, India.
              </p>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm md:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Send Us a Message
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Fill in the form below and we will get back to you promptly.
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
            <Link href="/contact" className="text-primary font-bold">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
