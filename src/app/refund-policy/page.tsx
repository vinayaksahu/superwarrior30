import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, CreditCard, Mail, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Rahul Trade Warrior Academy",
  description: "Official Strict No Refund and Cancellation Policy for digital educational deliverables, courses, and masterclasses on Super Warrior 30.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {/* Title Header */}
        <div className="border-b border-border/40 pb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-bold text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Digital Goods • Strict No Refund Policy</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: January 1, 2026 | Last Updated: August 2026
          </p>
        </div>

        {/* Prominent Notice Banner */}
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-bold text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Important Notice: Strict No-Refund Policy</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All courses, masterclasses, mentorship content, video lessons, and digital resources offered on <strong>Rahul Trade Warrior Academy</strong> (&quot;Super Warrior 30&quot;) are <strong>immediate-access digital products</strong>. Due to the irreversible and instant nature of digital goods delivery, <strong>we operate a strict NO REFUND and NO CANCELLATION policy. All sales are final.</strong>
          </p>
        </div>

        <div className="space-y-8 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">1. Digital Goods Nature & No Refund Policy</h2>
            </div>
            <p>
              When you purchase a course or mentorship program on Super Warrior 30, access to our proprietary curriculum, video masterclasses, downloadable trade setups, assignment modules, and in-app trading journal is granted <strong>immediately and irrevocably</strong> upon payment confirmation.
            </p>
            <p>
              Unlike physical merchandise, digital educational content cannot be returned, reclaimed, or &quot;unseen&quot; once digital access has been unlocked. By completing your transaction and enrolling in any course, you explicitly acknowledge, agree, and accept that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>All purchases are <strong>100% non-refundable</strong> once payment is completed.</li>
              <li>No money-back guarantees, trial periods, partial refunds, or credit exchanges are offered under any circumstances.</li>
              <li>Dissatisfaction with market performance, failure to attend sessions, change of mind, lack of personal trading capital, or personal financial constraints do not qualify for a refund.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <CreditCard className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">2. Sole Exception: Technical Duplicate Transactions</h2>
            </div>
            <p>
              The only circumstance under which a refund will be processed is in the event of a <strong>genuine technical duplicate charge</strong> caused by a payment gateway or network malfunction (i.e., you were debited twice for the same single course enrollment).
            </p>
            <p>
              If a duplicate charge occurs:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>You must report the duplicate transaction to us within <strong>48 hours</strong> of the transaction.</li>
              <li>Email <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline font-bold">support@superwarrior30.com</a> with your registered email, order numbers, and bank/UPI transaction UTR receipts.</li>
              <li>Upon verification of duplicate billing, the extra debited amount will be initiated for refund back to your <strong>original source payment method</strong> within <strong>5 to 7 business days</strong>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <RefreshCw className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">3. Order Cancellation Policy</h2>
            </div>
            <p>
              Course enrollments on our platform are processed as one-time upfront payments for immediate access (not recurring auto-debit subscriptions). Because electronic fulfillment and credential generation happen instantly through automated systems upon checkout, <strong>orders cannot be cancelled, paused, or transferred</strong> to another user once completed.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">4. Student Due Diligence Before Purchase</h2>
            </div>
            <p>
              To ensure that our mentorship and courses match your learning goals, we encourage all prospective students to perform full due diligence prior to enrolling:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Read the comprehensive course curriculum breakdown, syllabus, and learning modules provided on the course page.</li>
              <li>Review the Frequently Asked Questions (FAQ) and our risk disclaimer regarding financial market trading.</li>
              <li>Reach out to our support team at <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline font-bold">support@superwarrior30.com</a> if you have any pre-purchase questions regarding course suitability.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <h2 className="text-foreground font-bold">5. Contact Our Support Team</h2>
            </div>
            <p>
              For any payment-related inquiries or duplicate charge reporting:
            </p>
            <div className="bg-background rounded-xl p-4 border border-border text-[11px] space-y-1">
              <p><strong>Billing & Support Desk</strong></p>
              <p>Rahul Trade Warrior Academy</p>
              <p>Email: <a href="mailto:support@superwarrior30.com" className="text-primary hover:underline font-bold">support@superwarrior30.com</a></p>
              <p>Support Portal: <Link href="/contact" className="text-primary hover:underline">https://superwarrior30.com/contact</Link></p>
              <p>Address: Civil Lines, MG Marg, Prayagraj, Uttar Pradesh - 211001, India.</p>
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
