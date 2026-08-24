import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderByIdAction } from "@/server/actions/order.actions";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, PlayCircle, FileText, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Order Successful",
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

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <div className="rounded-full bg-emerald-500/10 p-4 w-20 h-20 mx-auto flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Enrollment Confirmed!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment has been successfully processed and your course access is unlocked.
        </p>

        {/* Order Details Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-lg text-left space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3 text-xs text-muted-foreground">
            <span>Order Number</span>
            <span className="font-mono font-semibold text-foreground">{order.orderNumber}</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Enrolled Course</p>
            <p className="text-base font-bold text-foreground">{primaryItem?.itemTitle}</p>
          </div>

          <div className="flex justify-between items-center border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-bold text-primary text-lg">
              {formatCurrency(order.totalAmount.toString())}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 space-y-3">
          {courseSlug && (
            <Link
              href={`/learn/${courseSlug}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.01]"
            >
              <PlayCircle className="h-5 w-5" />
              Start Learning Now
            </Link>
          )}

          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
            <Link href="/dashboard" className="hover:text-foreground">
              Go to Dashboard
            </Link>
            <span>•</span>
            <Link href="/orders" className="hover:text-foreground">
              View Order History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
