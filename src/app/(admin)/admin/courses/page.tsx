import type { Metadata } from "next";
import Link from "next/link";
import { getCoursesAction } from "@/server/actions/course.actions";
import { getCurrentUser, isSuperAdminUser } from "@/server/dal/auth";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Trash2 } from "lucide-react";
import { CourseStatusBadge } from "@/components/admin/course-status-badge";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Courses",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "all";
  const search = params.search || "";

  const result = await getCoursesAction({ page, status, search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses, modules, and lessons
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Link
              href="/admin/recycle-bin"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Recycle Bin
            </Link>
          )}
          <Link
            href="/admin/courses/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Course
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder="Search courses..."
            defaultValue={search}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <div className="flex gap-2">
          {["all", "DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
            <Link
              key={s}
              href={`/admin/courses?status=${s}${search ? `&search=${search}` : ""}`}
              className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                status === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Course Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium">No courses found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Create your first course to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Modules
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Students
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {course.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        /{course.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <CourseStatusBadge status={course.status} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(course.price.toString())}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {course._count.modules}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {course._count.enrollments}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Edit
                        </Link>
                        <CourseDeleteButton
                          courseId={course.id}
                          courseTitle={course.title}
                          isSuperAdmin={isSuperAdmin}
                          enrollmentsCount={course._count.enrollments}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages} ({result.total} total)
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/admin/courses?page=${result.page - 1}&status=${status}${search ? `&search=${search}` : ""}`}
                    className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/admin/courses?page=${result.page + 1}&status=${status}${search ? `&search=${search}` : ""}`}
                    className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
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
