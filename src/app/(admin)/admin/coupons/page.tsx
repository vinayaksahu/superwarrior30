import type { Metadata } from "next";
import Link from "next/link";
import { getAdminCouponsAction } from "@/server/actions/coupon.actions";
import { CouponTableActions } from "@/components/admin/coupon-table-actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { Tag, Plus, Search, Calendar, Users, CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Coupon Management",
};

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "all";
  const search = params.search || "";

  const data = await getAdminCouponsAction({
    page,
    status,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Promotional Coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage promotional discount codes, usage limits, and course restrictions
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </Link>
      </div>

      {/* Coupons Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">All Promotional Codes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} total configured coupons
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <form className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                placeholder="Search coupon code..."
                defaultValue={search}
                className="flex h-9 w-60 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
              />
            </form>

            <div className="flex gap-1.5">
              {["all", "active", "inactive", "expired"].map((s) => (
                <Link
                  key={s}
                  href={`/admin/coupons?status=${s}${search ? `&search=${search}` : ""}`}
                  className={`inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                    status === s
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-input bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No coupons found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Coupon Code</th>
                  <th className="px-4 py-3 font-medium">Discount Value</th>
                  <th className="px-4 py-3 font-medium">Validity Period</th>
                  <th className="px-4 py-3 font-medium">Usage Count</th>
                  <th className="px-4 py-3 font-medium">Course Scope</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <span className="font-mono font-extrabold text-foreground text-sm tracking-wider">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountValue}% OFF`
                          : formatCurrency(c.discountValue) + " OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      -{" "}
                      {new Date(c.endDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {c.usageCount}{" "}
                      <span className="text-muted-foreground font-normal">
                        / {c.usageLimit ? c.usageLimit : "∞"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.applicableCoursesCount === 0
                        ? "All Courses"
                        : `${c.applicableCoursesCount} Courses`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          c.isExpired
                            ? "bg-muted text-muted-foreground border-border"
                            : c.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {c.isExpired ? "Expired" : c.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CouponTableActions
                        couponId={c.id}
                        code={c.code}
                        isActive={c.isActive}
                        redemptionsCount={c.redemptionsCount}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Link
                  href={`/admin/coupons?page=${data.page - 1}&status=${status}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/coupons?page=${data.page + 1}&status=${status}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
