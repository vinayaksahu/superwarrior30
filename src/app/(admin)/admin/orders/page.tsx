import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOrdersAction } from "@/server/actions/order.actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { Search, ShoppingCart } from "lucide-react";
import { AdminOrderActions } from "@/components/admin/admin-order-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Orders",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "all";
  const search = params.search || "";

  const result = await getAdminOrdersAction({ page, status, search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="text-muted-foreground">
          Monitor course purchases, payment transactions, and enrollment statuses
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder="Search by order #, student name, or email..."
            defaultValue={search}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {["all", "PENDING", "PAID", "CANCELLED", "REFUNDED"].map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}${search ? `&search=${search}` : ""}`}
              className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                status === s
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {s === "all" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-base font-semibold text-foreground">No orders found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try adjusting your search criteria." : "No orders have been placed yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Order Number
                  </th>
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Student
                  </th>
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Course Items
                  </th>
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {result.data.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{order.user.name || "Student"}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                      {order.items.map((i) => i.itemTitle).join(", ")}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      {formatCurrency(order.totalAmount.toString())}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
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
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <AdminOrderActions
                        orderId={order.id}
                        status={order.status}
                        orderNumber={order.orderNumber}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {result.page} of {result.totalPages} ({result.total} total)
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/admin/orders?page=${result.page - 1}&status=${status}${search ? `&search=${search}` : ""}`}
                    className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/admin/orders?page=${result.page + 1}&status=${status}${search ? `&search=${search}` : ""}`}
                    className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
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
