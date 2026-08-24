import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/public/contact-form";
import { Mail, Clock, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Support Desk — Super Warrior 30",
  description: "Get in touch with the Super Warrior 30 support team for enrollment queries or technical support.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
              SW
            </span>
            <span className="text-base font-bold">Super Warrior 30</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/courses" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Courses
            </Link>
            <Link href="/login" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <Mail className="h-3.5 w-3.5" />
            <span>Support Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Get in Touch
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Have questions about a course, payment verification, or affiliate payouts? Send us a message below.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl grid gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Clock className="h-4 w-4" />
                <span>Response Time</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our support team responds to student inquiries within 24 business hours.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <MessageSquare className="h-4 w-4" />
                <span>Student Support</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For fast resolution, please mention your registered student email and order number if applicable.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
              Send an Inquiry
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-8 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>© {new Date().getFullYear()} Super Warrior 30. All rights reserved.</p>
      </footer>
    </div>
  );
}
