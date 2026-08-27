import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";

export const metadata: Metadata = {
  title: "Terms of Service — Rahul Trade Warrior Academy",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-16 max-w-3xl space-y-6 text-xs text-muted-foreground leading-relaxed">
        <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-[11px] text-muted-foreground">Last updated: August 2026</p>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">1. Educational Disclaimer</h2>
          <p>
            All content, videos, materials, and masterclasses provided by Super Warrior 30 are strictly for educational and informational purposes. We do not provide SEBI-registered financial advisory services, personalized portfolio management, or trade execution signals.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">2. Intellectual Property & Course Access</h2>
          <p>
            Course materials, video streams, PDF cheat sheets, and proprietary diagrams are the intellectual property of Super Warrior 30. Enrolled students are granted a personal, non-transferable, revocable license for individual learning. Screen-recording, redistributing, or reselling content is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">3. Affiliate Referral Program</h2>
          <p>
            Referral commissions are calculated on verified, paid enrollments. Self-referrals, artificial circular relationships, and abusive spam tactics are prohibited and will result in account suspension and commission forfeiture.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">4. Account Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials. Super Warrior 30 reserves the right to terminate accounts that violate security or community standards.
          </p>
        </section>
      </main>

      <footer className="bg-card py-8 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>© {new Date().getFullYear()} Super Warrior 30. All rights reserved.</p>
      </footer>
    </div>
  );
}
