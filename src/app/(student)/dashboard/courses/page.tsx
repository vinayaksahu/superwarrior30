import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { getUserEnrolledCoursesAction } from "@/server/actions/enrollment.actions";
import { BookOpen, PlayCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Enrolled Courses",
};

export default async function StudentCoursesPage() {
  const user = await requireAuth();

  const [enrolledCourses, pendingOrders] = await Promise.all([
    getUserEnrolledCoursesAction().catch(() => []),
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
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">
            Access your active enrolled courses and continue learning
          </p>
        </div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Browse More Courses
        </Link>
      </div>

      {/* Pending Orders Notice & Cards */}
      {pendingOrders.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
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
                View Order Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              We received your manual payment details. Once verified and approved by the admin team, your full course access will be unlocked.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pendingOrders.map((order) =>
              order.items.map((item: any) => (
                <div
                  key={`${order.id}-${item.id}`}
                  className="flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-500 border border-amber-500/30">
                        Pending Approval
                      </span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        #{order.orderNumber}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground line-clamp-1">
                      {item.course?.title || item.itemTitle}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.course?.shortDescription || "Trading course materials and strategy lessons."}
                    </p>

                    <p className="text-xs text-muted-foreground pt-1">
                      UTR / Ref: <span className="font-mono text-foreground font-semibold">{order.manualPaymentRef || order.paymentId || "Submitted"}</span>
                    </p>
                  </div>

                  <div className="border-t border-border/60 bg-muted/20 p-4 flex items-center justify-between">
                    <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Under Review
                    </span>
                    <Link
                      href="/orders"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-accent"
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

      {enrolledCourses.length === 0 && pendingOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No enrolled courses</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            You have not purchased any courses yet. Discover our trading masterclasses to begin.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
          >
            Explore Catalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((course) => (
            <div
              key={course.courseId}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {course.difficulty}
                  </span>
                  {course.progressPercentage >= 100 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-foreground line-clamp-1">
                  {course.courseTitle}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {course.shortDescription || "Trading course materials and strategy lessons."}
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-primary font-bold">{course.progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${course.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 bg-muted/20 p-4">
                <Link
                  href={`/learn/${course.courseSlug}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  <PlayCircle className="h-4 w-4" />
                  {course.progressPercentage > 0 ? "Continue Learning" : "Start Course"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
