import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";

export const metadata: Metadata = {
  title: "Privacy Policy — Rahul Trade Warrior Academy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-16 max-w-3xl space-y-6 text-xs text-muted-foreground leading-relaxed">
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-[11px] text-muted-foreground">Last updated: August 2026</p>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">1. Information Collection</h2>
          <p>
            We collect information you provide directly to us when registering for an account, purchasing a course, submitting withdrawal bank details, or contacting our support team.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">2. Payment Security</h2>
          <p>
            All payment transactions are processed securely via verified third-party payment gateways (such as Razorpay). Super Warrior 30 never stores raw credit card numbers or banking passwords on our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">3. Referral Network Privacy</h2>
          <p>
            When participating in the referral program, referred students are displayed using privacy-masked initials (e.g. "Rahul S."). Personal email addresses and private financial balances are never exposed to upline referrers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">4. Data Protection & Cookies</h2>
          <p>
            We use secure HTTP-only cookies exclusively for authentication sessions. We do not sell or rent personal information to third-party advertisers.
          </p>
        </section>
      </main>

      <footer className="bg-card py-8 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>© {new Date().getFullYear()} Super Warrior 30. All rights reserved.</p>
      </footer>
    </div>
  );
}
