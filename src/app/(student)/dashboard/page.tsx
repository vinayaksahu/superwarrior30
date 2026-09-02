import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { getUserEnrolledCoursesAction } from "@/server/actions/enrollment.actions";
import { formatCurrency } from "@/lib/utils";
import {
  PlayCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitBranch,
  Wallet,
  TrendingUp,
  Clock,
} from "lucide-react";
import { TestUserBadge } from "@/components/shared/test-user-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const user = await requireAuth();

  let enrolledCourses: Awaited<ReturnType<typeof getUserEnrolledCoursesAction>> = [];
  let availableBalance = 0;
  let totalEarned = 0;
  let referralCount = 0;
  let pendingOrders: any[] = [];

  try {
    const [courses, wallet, referrals, pending] = await Promise.all([
      getUserEnrolledCoursesAction().catch((err) => {
        console.error("[Dashboard] Error fetching enrolled courses:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }),
      prisma.wallet.findUnique({
        where: { userId: user.id },
        select: {
          availableBalance: true,
          pendingBalance: true,
          totalEarned: true,
        },
      }),
      prisma.referralRelationship.count({
        where: { referrerId: user.id },
      }).catch((err) => {
        console.error("[Dashboard] Error fetching referrals count:", err);
        return 0;
      }),
      prisma.order.findMany({
        where: {
          userId: user.id,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  difficulty: true,
                  shortDescription: true,
                },
              },
            },
          },
        },
      }).catch((err) => {
        console.error("[Dashboard] Error fetching pending orders:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }),
    ]);

    enrolledCourses = courses || [];
    availableBalance = Number(wallet?.availableBalance ?? 0);
    totalEarned = Number(wallet?.totalEarned ?? 0);
    referralCount = referrals || 0;
    pendingOrders = pending || [];
  } catch (error) {
    console.error("Error loading student dashboard:", error);
  }

  const totalEnrolled = enrolledCourses.length;
  const completedCoursesCount = enrolledCourses.filter(
    (c) => c.progressPercentage >= 100
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name || "Trader"}!
          </h1>
          <TestUserBadge isTestData={user.isTestData} size="sm" />
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Continue your trading education journey, review lesson completions, and track affiliate earnings
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Courses</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{totalEnrolled}</p>
          <p className="text-[11px] text-muted-foreground">
            {completedCoursesCount} courses fully completed
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Balance</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            {formatCurrency(availableBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ready for bank withdrawal
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned</span>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            {formatCurrency(totalEarned)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Lifetime affiliate commissions
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Affiliates</span>
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{referralCount}</p>
          <p className="text-[11px] text-muted-foreground">
            Direct student signups
          </p>
        </div>
      </div>

      {/* Enrolled Courses & Continue Learning Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Continue Learning</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick up right where you left off
            </p>
          </div>
          {totalEnrolled > 0 && (
            <Link
              href="/dashboard/courses"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All ({totalEnrolled})
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Pending Verification Notice & Course Cards */}
        {pendingOrders.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span>
                    Payment Verification Pending ({pendingOrders.length} {pendingOrders.length === 1 ? "Course" : "Courses"})
                  </span>
                </div>
                <Link
                  href="/orders"
                  className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1"
                >
                  View Invoices <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                We have received your payment submission. Our team is verifying your payment. Once approved by admin, your course will be activated here automatically.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pendingOrders.map((order) =>
                order.items.map((item: any) => (
                  <div
                    key={`${order.id}-${item.id}`}
                    className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-500 border border-amber-500/30">
                          Pending Verification
                        </span>
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          #{order.orderNumber}
                        </span>
                      </div>

                      <h3 className="font-bold text-foreground line-clamp-1">
                        {item.course?.title || item.itemTitle}
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        UTR / Ref: <span className="font-mono text-foreground font-semibold">{order.manualPaymentRef || order.paymentId || "Submitted"}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Awaiting Admin Approval
                      </span>

                      <Link
                        href="/orders"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-accent"
                      >
                        View Receipt
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {totalEnrolled === 0 && pendingOrders.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No active course enrollments</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Explore our trading masterclasses and start your learning journey.
            </p>
            <div className="pt-2">
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                Browse Courses
              </Link>
            </div>
          </div>
        ) : totalEnrolled > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrolledCourses.map((course) => (
              <div
                key={course.courseId}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-5 transition-colors hover:border-primary/40 hover:bg-background"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {course.difficulty}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {course.progressPercentage}%
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground line-clamp-1">
                    {course.courseTitle}
                  </h3>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${course.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {course.progressPercentage >= 100 ? (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </span>
                    ) : (
                      "In Progress"
                    )}
                  </span>

                  <Link
                    href={`/learn/${course.courseSlug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    {course.progressPercentage > 0 ? "Resume" : "Start"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
