import type { Metadata } from "next";
import Link from "next/link";
import { getRecycleBinCoursesAction } from "@/server/actions/course.actions";
import { requireSuperAdmin } from "@/server/dal/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, ArrowLeft, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { RecycleBinActions } from "@/components/admin/recycle-bin-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Course Recycle Bin | Super Warrior 30",
};

export default async function RecycleBinPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const result = await getRecycleBinCoursesAction({ page, search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/courses"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Back to Courses"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Course Recycle Bin
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground pl-9">
            Manage soft-deleted courses. Restore courses back to the active catalog or permanently delete them.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-300 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Soft-Deleted Course Safeguard (SUPER_ADMIN Only)
          </p>
          <p className="text-amber-300/80">
            Courses in the Recycle Bin are hidden from the active catalog and students. All modules, lessons, Bunny media, and student progress records remain 100% intact until permanently deleted.
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder="Search deleted courses by title or slug..."
            defaultValue={search}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </div>

      {/* Course Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-lg font-medium text-foreground">
            Recycle Bin is empty
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "No deleted courses match your search."
              : "No courses have been moved to the Recycle Bin."}
          </p>
          <div className="mt-4">
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Course</th>
                  <th className="px-4 py-3 text-left font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Modules</th>
                  <th className="px-4 py-3 text-left font-medium">Enrollments</th>
                  <th className="px-4 py-3 text-left font-medium">Deleted Date</th>
                  <th className="px-4 py-3 text-left font-medium">Deleted By</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((course) => (
                  <tr
                    key={course.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {course.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /{course.slug}
                        </p>
                      </div>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {course.deletedAt
                        ? formatDate(course.deletedAt)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {course.deletedBy ? (
                        <div>
                          <p className="font-medium text-foreground">
                            {course.deletedBy.name || "Admin"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {course.deletedBy.email}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RecycleBinActions
                        courseId={course.id}
                        courseTitle={course.title}
                        enrollmentsCount={course._count.enrollments}
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
              <p className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages} ({result.total} total)
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/admin/recycle-bin?page=${result.page - 1}${search ? `&search=${search}` : ""}`}
                    className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/admin/recycle-bin?page=${result.page + 1}${search ? `&search=${search}` : ""}`}
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
