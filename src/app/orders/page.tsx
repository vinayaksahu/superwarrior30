import type { Metadata } from "next";
import Link from "next/link";
import { getUserOrdersAction } from "@/server/actions/order.actions";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Order Invoices",
};

export default async function StudentOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  const result = await getUserOrdersAction({ page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Invoices & Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View your course enrollment invoices, coupon savings, and payment receipts
        </p>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No purchase history</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            You haven&apos;t enrolled in any courses yet. Browse our masterclasses to get started.
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              Explore Courses
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Order Number</th>
                  <th className="px-4 py-3 font-medium">Course Title</th>
                  <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                  <th className="px-4 py-3 font-medium text-right">Discount</th>
                  <th className="px-4 py-3 font-medium text-right">Final Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {result.data.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {order.items.map((i) => i.itemTitle).join(", ")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                      {formatCurrency(Number(order.subtotalAmount))}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-500">
                      {Number(order.discountAmount) > 0
                        ? `-${formatCurrency(Number(order.discountAmount))}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-foreground text-sm">
                      {formatCurrency(Number(order.totalAmount))}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          order.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : order.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : order.status === "REFUNDED"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {order.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                Page {result.page} of {result.totalPages} ({result.total} total)
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/orders?page=${result.page - 1}`}
                    className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/orders?page=${result.page + 1}`}
                    className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
