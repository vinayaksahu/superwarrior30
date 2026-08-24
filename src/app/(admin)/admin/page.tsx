import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOverviewAction } from "@/server/actions/admin.actions";
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee,
  Users,
  BookOpen,
  ShoppingCart,
  Clock,
  ArrowRight,
  GitBranch,
  TrendingUp,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Executive Dashboard",
};

export default async function AdminDashboardPage() {
  const data = await getAdminOverviewAction();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Platform Executive Control
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time analytics across enrollments, revenue, student affiliates, and payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Course
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {formatCurrency(data.metrics.totalRevenue)}
          </p>
          <p className="text-xs text-muted-foreground">{data.metrics.paidOrdersCount} paid transactions</p>
        </div>

        {/* Total Students */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {data.metrics.totalStudents}
          </p>
          <p className="text-xs text-muted-foreground">Registered learner accounts</p>
        </div>

        {/* Active Courses */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Courses</span>
            <BookOpen className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {data.metrics.publishedCourses}{" "}
            <span className="text-sm font-normal text-muted-foreground">/ {data.metrics.totalCourses} total</span>
          </p>
          <p className="text-xs text-muted-foreground">Live & purchasable curriculum</p>
        </div>

        {/* Pending Withdrawals */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-500">
            {formatCurrency(data.metrics.pendingWithdrawalsAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.metrics.pendingWithdrawalsCount} requests in queue
          </p>
        </div>
      </div>

      {/* Grid: Recent Orders & Recent Students */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Recent Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No orders placed yet.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{order.courseTitle}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.studentName} ({order.orderNumber})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-foreground">{formatCurrency(order.totalAmount)}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        order.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {order.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Students */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Recent Student Signups</h2>
            </div>
            <Link
              href="/admin/students"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data.recentStudents.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No registered students yet.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {data.recentStudents.map((student) => (
                <div key={student.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{student.name}</p>
                    <p className="text-[10px] text-muted-foreground">{student.email}</p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <span>{student.coursesCount} Courses</span>
                    <span className="mx-1.5">•</span>
                    <span>{student.referralsCount} Referrals</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
