import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { HelpCircle, BookOpen, ShieldCheck, Wallet, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Rahul Trade Warrior Academy",
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
          q: "Is GST invoice provided?",
          a: "Yes, all orders generate an official tax invoice accessible directly from your Student Orders dashboard.",
        },
      ],
    },
    {
      name: "Affiliate & Referrals",
      faqs: [
        {
          q: "How do referral commissions work?",
          a: "When your friends or network enroll via your personalized affiliate link, you receive automated instant commission credited directly to your Wallet.",
        },
        {
          q: "How do I withdraw my earnings?",
          a: "Navigate to your Wallet, enter your bank account details or UPI ID, and submit a withdrawal request for admin clearance.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

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
