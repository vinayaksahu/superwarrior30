import type { Metadata } from "next";
import Link from "next/link";
import { getAdminStudentsAction } from "@/server/actions/admin.actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin, isSuperAdminUser } from "@/server/dal/auth";
import { ForceLogoutButton } from "@/components/admin/admin-device-actions";
import { EditUserEmailButton } from "@/components/admin/edit-user-email-modal";
import { Users, Search, BookOpen, GitBranch, Wallet, CheckCircle2 } from "lucide-react";
import { TestUserBadge } from "@/components/shared/test-user-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Students Directory",
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const currentUser = await requireAdmin();
  const isSuper = isSuperAdminUser(currentUser);

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const data = await getAdminStudentsAction({
    page,
    search,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Students Directory
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View and manage registered student accounts, course enrollments, and referral performance
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Registered Students</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} total student accounts
            </p>
          </div>

          <form className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              type="text"
              placeholder="Search name, email, or code..."
              defaultValue={search}
              className="flex h-9 w-full sm:w-64 rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </form>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No students found matching your search.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="grid gap-3 md:hidden">
              {data.data.map((student) => (
                <div
                  key={student.id}
                  className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                          {student.name}
                        </p>
                        <TestUserBadge isTestData={student.isTestData} />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                        {student.email}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                      {student.referralCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Enrollments</span>
                      <span className="font-semibold text-foreground">
                        {student.enrollmentsCount} Course{student.enrollmentsCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Direct Referrals</span>
                      <span className="font-semibold text-foreground">
                        {student.directReferralsCount} Student{student.directReferralsCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Wallet Balance</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(student.walletBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Total Earned</span>
                      <span className="font-bold text-emerald-500">
                        {formatCurrency(student.totalEarned)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      Joined {new Date(student.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSuper && (
                        <EditUserEmailButton
                          userId={student.id}
                          userName={student.name}
                          currentEmail={student.email}
                          isSuperAdmin={isSuper}
                          size="xs"
                        />
                      )}
                      <Link
                        href={`/admin/devices?search=${encodeURIComponent(student.email)}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                      >
                        Devices
                      </Link>
                      <ForceLogoutButton
                        userId={student.id}
                        userEmail={student.email}
                        label="Out"
                        size="xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Referral Code</th>
                    <th className="px-4 py-3 font-medium">Courses</th>
                    <th className="px-4 py-3 font-medium">Direct Referrals</th>
                    <th className="px-4 py-3 font-medium text-right">Wallet Balance</th>
                    <th className="px-4 py-3 font-medium text-right">Total Earned</th>
                    <th className="px-4 py-3 font-medium">Joined Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions & Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.data.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <TestUserBadge isTestData={student.isTestData} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{student.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {student.referralCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {student.enrollmentsCount} Enrolled
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {student.directReferralsCount} Referrals
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-foreground">
                        {formatCurrency(student.walletBalance)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-500">
                        {formatCurrency(student.totalEarned)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(student.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuper && (
                            <EditUserEmailButton
                              userId={student.id}
                              userName={student.name}
                              currentEmail={student.email}
                              isSuperAdmin={isSuper}
                              size="xs"
                            />
                          )}
                          <Link
                            href={`/admin/devices?search=${encodeURIComponent(student.email)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                          >
                            Devices
                          </Link>
                          <ForceLogoutButton
                            userId={student.id}
                            userEmail={student.email}
                            label="Session Out"
                            size="xs"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
                  href={`/admin/students?page=${data.page - 1}${search ? `&search=${search}` : ""}`}
                  className="rounded-md border border-input px-3 py-1 hover:bg-accent"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/students?page=${data.page + 1}${search ? `&search=${search}` : ""}`}
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
