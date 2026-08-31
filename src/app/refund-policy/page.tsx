import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, CreditCard, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Rahul Trade Warrior Academy",
  description: "Official Refund and Cancellation Policy for course purchases, digital deliverables, and payment resolutions on Super Warrior 30.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* Title Header */}
        <div className="border-b border-border/40 pb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Billing & Returns</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: January 1, 2026 | Last Updated: August 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Thank you for enrolling in our online educational masterclasses at <strong>Rahul Trade Warrior Academy</strong> (&quot;Super Warrior 30&quot;). We prioritize customer transparency and strive to provide high-quality trading curriculum. Please review our comprehensive policy regarding refunds, cancellations, and duplicate charge resolutions below.
        </p>

        <div className="space-y-8 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">1. Digital Goods Nature & General Policy</h2>
            </div>
            <p>
              Our courses, video lectures, downloadable PDFs, and masterclass modules are <strong>instant-access digital products</strong>. Once payment is confirmed, immediate full access to the digital intellectual property and curriculum is provisioned to your student dashboard.
            </p>
            <p>
              Because digital assets are unlocked immediately, courses are generally non-refundable once content has been accessed or watched, except under the circumstances outlined in Section 2 below.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">2. Eligible Refund Circumstances (7-Day Review Window)</h2>
            </div>
            <p>
              You are eligible for a 100% refund under the following conditions within <strong>7 days of purchase</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Duplicate Billing:</strong> If an accidental double transaction or gateway error resulted in duplicate charges for the same course enrollment.</li>
              <li><strong>Unresolved Technical Failure:</strong> If you experienced a proven technical issue preventing course access that our support engineering desk was unable to resolve within 48 hours of notification.</li>
              <li><strong>Accidental Wrong Tier Enrollment:</strong> If notified within 24 hours prior to consuming course content, eligible for course exchange or credit adjustment.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <CreditCard className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">3. How to Request a Refund</h2>
            </div>
            <p>
              To initiate a refund or dispute resolution request:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 mt-2">
              <li>Submit a ticket via our <Link href="/contact" className="text-primary underline font-bold">Contact Support Desk</Link> or email us at <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline font-bold">support@superwarrior30.com</a>.</li>
              <li>Include your <strong>Registered Email Address</strong>, <strong>Order Number (e.g. ORD-2026-XXXX)</strong>, and <strong>Payment Gateway Transaction ID / UTR number</strong>.</li>
              <li>Provide a brief explanation of the issue or duplicate charge.</li>
            </ol>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <RefreshCw className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">4. Refund Processing Timeline (5–7 Business Days)</h2>
            </div>
            <p>
              Once your refund request is verified and approved by our billing desk:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Refunds are initiated immediately and processed through our payment gateway partner (Razorpay / Cashfree).</li>
              <li>The refunded amount will be credited back to your <strong>original payment method</strong> (Source Bank Account, UPI ID, or Credit/Debit Card) within <strong>5 to 7 business days</strong> depending on your issuing bank.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-destructive font-bold text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">5. Cancellation Policy & Account Revocation</h2>
            </div>
            <p>
              Because digital course access is delivered immediately, order cancellations prior to fulfillment are handled on a case-by-case basis through our support team. Upon approval of any refund or charge reversal, course access from your student dashboard will be immediately revoked, and any associated affiliate commissions will be voided.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">6. Contact Our Billing Support Team</h2>
            </div>
            <p>
              For all payment-related questions, invoice receipts, or refund queries:
            </p>
            <div className="bg-background rounded-xl p-4 border border-border text-[11px] space-y-1">
              <p><strong>Billing & Refund Support Desk</strong></p>
              <p>Rahul Trade Warrior Academy</p>
              <p>Email: <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline">support@superwarrior30.com</a></p>
              <p>Support Portal: <Link href="/contact" className="text-primary hover:underline">https://superwarrior30.com/contact</Link></p>
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
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="text-primary font-bold">Refund Policy</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-foreground">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
