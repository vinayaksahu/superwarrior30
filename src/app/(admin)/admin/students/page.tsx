import type { Metadata } from "next";
import Link from "next/link";
import { getAdminStudentsAction } from "@/server/actions/admin.actions";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/dal/auth";
import { ForceLogoutButton } from "@/components/admin/admin-device-actions";
import { Users, Search, BookOpen, GitBranch, Wallet, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Students Directory",
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireAdmin();

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

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Registered Students</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.total} total student accounts
            </p>
          </div>

          <form className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              type="text"
              placeholder="Search name, email, or code..."
              defaultValue={search}
              className="flex h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
            />
          </form>
        </div>

        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No students found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="px-4 py-3 font-medium text-right">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground">{student.email}</p>
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
                        <Link
                          href={`/admin/devices?search=${encodeURIComponent(student.email)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
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
