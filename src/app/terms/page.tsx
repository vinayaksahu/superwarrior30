import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ShieldAlert, BookOpen, CreditCard, Scale, Lock, RefreshCw, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions of Service — Rahul Trade Warrior Academy",
  description: "Official Terms and Conditions governing course enrollments, digital content licenses, and platform usage for Super Warrior 30.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* Title Header */}
        <div className="border-b border-border/40 pb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            <Scale className="h-3.5 w-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Terms & Conditions of Service
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: January 1, 2026 | Last Updated: August 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Welcome to <strong>Rahul Trade Warrior Academy</strong> (&quot;Super Warrior 30&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of our website (<a href="https://superwarrior30.com" className="text-primary hover:underline">superwarrior30.com</a>), student portals, on-demand video masterclasses, educational curriculum, and related services. By accessing or purchasing any course from this platform, you agree to be bound by these Terms.
        </p>

        {/* Sections */}
        <div className="space-y-8 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">1. Educational & Non-Financial Advisory Disclaimer</h2>
            </div>
            <p>
              All video lessons, webinars, analytical frameworks, chart patterns, indicators, and educational resources provided across Super Warrior 30 are strictly for <strong>educational, informational, and training purposes only</strong>.
            </p>
            <p>
              Rahul Trade Warrior Academy and its instructors are <strong>NOT SEBI (Securities and Exchange Board of India) registered investment advisors, research analysts, or portfolio managers</strong>. We do not provide personalized financial advice, stock recommendations, or trade execution signals. Trading and investing in equities, futures, options, and financial derivatives involve substantial market risk, including the possible loss of principal capital. You assume sole responsibility for all financial decisions and trades executed in your individual broker accounts.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <BookOpen className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">2. Course Enrollment, Digital Delivery & License</h2>
            </div>
            <p>
              Upon successful payment verification, you are granted a <strong>single-user, personal, non-transferable, revocable license</strong> to access the enrolled course materials via our secured student portal.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Instant Fulfillment:</strong> Course access is granted electronically and instantly upon transaction confirmation by the payment gateway. No physical parcel is shipped.</li>
              <li><strong>One Active Device Policy:</strong> For platform security, student accounts are restricted to one active login session at a time. Concurrent simultaneous logins from multiple devices will automatically displace previous sessions.</li>
              <li><strong>Anti-Piracy Prohibition:</strong> Screen recording, downloading proprietary video streams, distributing login credentials, reselling, or public broadcasting of course materials is strictly illegal and will result in permanent account termination and legal action under the Indian Copyright Act, 1957.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CreditCard className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">3. Pricing, Payments & Taxes</h2>
            </div>
            <p>
              All course pricing is explicitly displayed in <strong>Indian Rupees (INR / ₹)</strong>. We reserve the right to revise pricing or discount promotions at any time without prior notice.
            </p>
            <p>
              Payments are processed through <strong>RBI-authorized Payment Aggregators & Gateways (such as Razorpay, Cashfree, and UPI)</strong>. By initiating a payment transaction, you authorize our payment partner to charge your selected payment method (UPI, Debit Card, Credit Card, Net Banking) for the full stated amount.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <RefreshCw className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">4. Refund & Cancellation Policy</h2>
            </div>
            <p>
              Refunds and cancellations are strictly governed by our standalone <Link href="/refund-policy" className="text-primary underline font-semibold">Refund & Cancellation Policy</Link>. In brief, because digital goods and video streams are consumed immediately upon purchase, requests for refund must be submitted within our designated review window with valid transaction proofs. Verified duplicate billing errors will be refunded to the original payment source within 5 to 7 business days.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">5. Affiliate & Referral Rewards</h2>
            </div>
            <p>
              Enrolled students may participate in our performance-based student affiliate reward program. Affiliate commissions are earned strictly on verified, paid course enrollments through your unique affiliate link. Spamming, fake registrations, unauthorized brand name PPC bidding, or deceptive representations are strictly prohibited and will result in commission forfeiture.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Scale className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">6. Governing Law & Jurisdiction</h2>
            </div>
            <p>
              These Terms and any disputes arising out of or in connection with your use of the platform shall be governed by and construed in accordance with the <strong>laws of the Republic of India</strong>, subject to the exclusive jurisdiction of the competent courts in <strong>Raipur, Chhattisgarh, India</strong>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">7. Customer Support & Grievance Contact</h2>
            </div>
            <p>
              For legal inquiries, billing assistance, or technical support, please contact:
            </p>
            <div className="bg-background rounded-xl p-4 border border-border text-[11px] space-y-1">
              <p><strong>Rahul Trade Warrior Academy</strong></p>
              <p>Email: <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline">support@superwarrior30.com</a></p>
              <p>Grievance Officer: <a href="mailto:grievance@superwarrior30.com" className="text-primary hover:underline">grievance@superwarrior30.com</a></p>
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
            <Link href="/terms" className="text-primary font-bold">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
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
