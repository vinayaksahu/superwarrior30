import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByIdAction } from "@/server/actions/order.actions";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, PlayCircle, Clock, ShieldCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Status | Super Warrior 30",
};

interface OrderSuccessPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderSuccessPage({
  params,
}: OrderSuccessPageProps) {
  const { orderId } = await params;

  let order;
  try {
    order = await getOrderByIdAction(orderId);
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  const primaryItem = order.items[0];
  const courseSlug = primaryItem?.course?.slug;
  const isPaid = order.status === "PAID";

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <div
          className={`rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-6 ${
            isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="h-10 w-10" />
          ) : (
            <Clock className="h-10 w-10 animate-pulse" />
          )}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {isPaid ? "Enrollment Confirmed!" : "Payment Under Verification"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {isPaid
            ? "Your payment has been successfully confirmed and your course access is fully unlocked."
            : "Your transaction details have been submitted. Our team will verify the payment and unlock your course access shortly."}
        </p>

        {/* Order Details Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-lg text-left space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3 text-xs text-muted-foreground">
            <span>Order Number</span>
            <span className="font-mono font-bold text-foreground">#{order.orderNumber}</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Course</p>
            <p className="text-base font-bold text-foreground">{primaryItem?.itemTitle}</p>
          </div>

          {order.manualPaymentRef && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">UTR / Transaction Ref</span>
              <span className="font-mono font-bold text-foreground">{order.manualPaymentRef}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Order Status</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}
            >
              {isPaid ? "PAID / ACTIVE" : "PENDING VERIFICATION"}
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-extrabold text-primary text-xl">
              {formatCurrency(Number(order.totalAmount))}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 space-y-3">
          {isPaid && courseSlug ? (
            <Link
              href={`/learn/${courseSlug}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
            >
              <PlayCircle className="h-5 w-5" />
              Start Learning Now
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
            >
              <ShieldCheck className="h-5 w-5" />
              Go to Student Dashboard
            </Link>
          )}

          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
            <Link href="/orders" className="hover:text-foreground">
              View All Orders & Invoices
            </Link>
            <span>•</span>
            <Link href="/courses" className="hover:text-foreground">
              Browse More Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
