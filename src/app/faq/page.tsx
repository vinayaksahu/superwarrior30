import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, BookOpen, ShieldCheck, Wallet, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Super Warrior 30",
  description: "Find answers regarding course access, video streaming, payments, referral payouts, and student support.",
};

export default function FAQPage() {
  const categories = [
    {
      name: "Course Enrollment & Access",
      faqs: [
        {
          q: "How soon do I get access to course content after payment?",
          a: "Access is granted immediately upon successful payment verification. You will be redirected directly to your student learning portal.",
        },
        {
          q: "Are the courses live or pre-recorded?",
          a: "All masterclasses consist of high-definition pre-recorded video lessons and downloadable PDF companion guides, allowing you to learn at your own pace.",
        },
        {
          q: "Do I get lifetime access to the courses I purchase?",
          a: "Yes. Once enrolled, you retain lifetime on-demand access to the course content and all future curriculum updates for that masterclass.",
        },
      ],
    },
    {
      name: "Payments & Invoicing",
      faqs: [
        {
          q: "What payment methods are accepted?",
          a: "We accept all major Indian credit/debit cards, Net Banking, UPI (Google Pay, PhonePe, Paytm), and major wallets via our secure payment gateway.",
        },
        {
          q: "Can I apply discount promo coupons at checkout?",
          a: "Yes. If you have an active promotional coupon code, enter it during the checkout step before finalizing payment to receive an instant discount.",
        },
        {
          q: "Where can I find invoices for my purchases?",
          a: "All transaction receipts and order numbers are accessible inside your student dashboard under the Orders section.",
        },
      ],
    },
    {
      name: "Referral Program & Payouts",
      faqs: [
        {
          q: "How do I participate in the referral affiliate program?",
          a: "Every registered student has a unique referral code and invitation link inside their dashboard under Referrals. Share this link with friends to earn multi-tier commissions.",
        },
        {
          q: "What is the minimum withdrawal amount for wallet commissions?",
          a: "The minimum threshold to request a payout is ₹500. Payouts are transferred directly to your registered UPI ID or Indian bank account.",
        },
        {
          q: "How long does a withdrawal take to process?",
          a: "Withdrawal requests are reviewed and disbursed by our financial desk within 24 to 48 business hours.",
        },
      ],
    },
  ];

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
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Support Knowledgebase</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Clear answers to common questions about courses, payments, streaming, and affiliate earnings.
          </p>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-12">
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground border-b border-border/60 pb-2">
                {cat.name}
              </h2>

              <div className="space-y-3">
                {cat.faqs.map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-2xl border border-border bg-card p-5 transition-colors open:border-primary/40"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-foreground">
                      <span>{faq.q}</span>
                      <span className="transition-transform group-open:rotate-180">↓</span>
                    </summary>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {/* Contact Support Card */}
          <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center space-y-3">
            <h3 className="text-base font-bold text-foreground">Still have questions?</h3>
            <p className="text-xs text-muted-foreground">
              Our support team is ready to help you with enrollment or technical inquiries.
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                Contact Support Desk
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
