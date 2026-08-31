import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ShieldCheck, Lock, Eye, Database, Globe, UserCheck, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Rahul Trade Warrior Academy",
  description: "Official Privacy Policy outlining how Super Warrior 30 collects, processes, and protects your personal and payment data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* Title Header */}
        <div className="border-b border-border/40 pb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: January 1, 2026 | Last Updated: August 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          At <strong>Rahul Trade Warrior Academy</strong> (&quot;Super Warrior 30&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;), we are committed to protecting your privacy and ensuring the utmost security of your personal and transaction data. This Privacy Policy details how we collect, store, utilize, and safeguard your information in compliance with the <strong>Information Technology Act, 2000</strong>, the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>, and the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> of India.
        </p>

        <div className="space-y-8 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Database className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">1. Information We Collect</h2>
            </div>
            <p>
              We collect information that you provide directly to us when registering an account, enrolling in courses, submitting support inquiries, or managing withdrawals:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Personal Identifiers:</strong> Name, email address, phone number, and account passwords (stored exclusively in encrypted hash format).</li>
              <li><strong>Billing & Transaction Details:</strong> Order IDs, amounts paid, payment method type (e.g. UPI, NetBanking, Card), and transaction timestamps.</li>
              <li><strong>Withdrawal Information:</strong> Bank account numbers and IFSC codes provided by affiliate partners for commission disbursals.</li>
              <li><strong>Technical Data:</strong> IP address, device fingerprints, and browser user agent for account security and one-device session enforcement.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">2. Payment Security & RBI Payment Aggregator Standards</h2>
            </div>
            <p>
              <strong>We do NOT store or process raw debit/credit card numbers, CVVs, or NetBanking MPINs on our servers.</strong>
            </p>
            <p>
              All online transactions are securely encrypted via 256-bit SSL and routed directly through <strong>RBI-authorized Payment Aggregators (such as Razorpay / Cashfree)</strong> that comply with <strong>PCI-DSS (Payment Card Industry Data Security Standard) Level 1</strong> compliance.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <Eye className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">3. Affiliate Privacy & Anonymization</h2>
            </div>
            <p>
              To protect student confidentiality within the affiliate reward network, student names in referral tree downlines are automatically masked using privacy initials (e.g., &quot;Rahul S.&quot;). Private email addresses, phone numbers, and course progress are never disclosed to upline affiliates.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <Globe className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">4. Cookies & Session Storage</h2>
            </div>
            <p>
              We use secure, HTTP-only authentication cookies strictly necessary for login sessions, csrf protection, and course video DRM tokens. We do NOT sell or rent your personal data to third-party ad networks or data brokers.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-sm">
              <UserCheck className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">5. Your Rights & Data Retention</h2>
            </div>
            <p>
              Under Indian data protection regulations, you have the right to access, correct, or request the deletion of your personal account data, subject to statutory record-keeping obligations for tax and financial audit trails.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">6. Grievance Redressal & Contact Information</h2>
            </div>
            <p>
              If you have questions regarding this Privacy Policy or wish to exercise your data rights, please contact our designated Grievance Officer:
            </p>
            <div className="bg-background rounded-xl p-4 border border-border text-[11px] space-y-1">
              <p><strong>Grievance & Data Privacy Desk</strong></p>
              <p>Rahul Trade Warrior Academy</p>
              <p>Email: <a href="mailto:privacy@superwarrior30.com" className="text-primary hover:underline">privacy@superwarrior30.com</a> / <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline">support@superwarrior30.com</a></p>
              <p>Address: VIP Road, Near Magneto The Mall, Raipur, Chhattisgarh - 492001, India.</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card py-10 text-xs text-muted-foreground border-t border-border/40">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-3">
          <p>© {new Date().getFullYear()} Rahul Trade Warrior Academy — Super Warrior 30. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="text-primary font-bold">Privacy Policy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-foreground">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
