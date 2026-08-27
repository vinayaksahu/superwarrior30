import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDevicesAction } from "@/server/actions/device.actions";
import { requireAdmin } from "@/server/dal/auth";
import { RevokeDeviceButton, StudentSecurityControls } from "@/components/admin/admin-device-actions";
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Search,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Ban,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Device Security & Session Control | Admin",
  description: "Monitor and manage student devices, active sessions, and blocked accounts.",
};

export default async function AdminDevicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "all";

  const data = await getAdminDevicesAction({
    page,
    search,
    status,
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Device Security & Session Control
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enforces the 1 active session rule and 2-device historical limit with automatic account locking.
          </p>
        </div>
      </div>

      {/* Security Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Registered Devices
            </span>
            <Laptop className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{data.total}</p>
          <p className="text-[11px] text-muted-foreground">Across all registered students</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Active Concurrent Sessions
            </span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">{data.stats.totalActiveDevices}</p>
          <p className="text-[11px] text-muted-foreground">Currently logged in devices</p>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-destructive uppercase tracking-wider">
              Blocked Accounts (Limit Exceeded)
            </span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-black text-destructive">{data.stats.totalBlockedStudents}</p>
          <p className="text-[11px] text-muted-foreground">Accounts locked for exceeding 2 devices</p>
        </div>
      </div>

      {/* Table & Filter Section */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
            <Link
              href={`/admin/devices?status=all${search ? `&search=${search}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                status === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Devices
            </Link>
            <Link
              href={`/admin/devices?status=active${search ? `&search=${search}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                status === "active"
                  ? "bg-card text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Sessions ({data.stats.totalActiveDevices})
            </Link>
            <Link
              href={`/admin/devices?status=blocked_students${search ? `&search=${search}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                status === "blocked_students"
                  ? "bg-card text-destructive shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Blocked Students ({data.stats.totalBlockedStudents})
            </Link>
            <Link
              href={`/admin/devices?status=revoked${search ? `&search=${search}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                status === "revoked"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Revoked Devices ({data.stats.totalRevokedDevices})
            </Link>
          </div>

          {/* Search Box */}
          <form className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="search"
              type="text"
              placeholder="Search student email, OS, IP..."
              defaultValue={search}
              className="flex h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground"
            />
          </form>
        </div>

        {/* Devices Table */}
        {data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No device records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-left">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Device / OS</th>
                  <th className="px-4 py-3 font-semibold">Browser & IP</th>
                  <th className="px-4 py-3 font-semibold">Account Status</th>
                  <th className="px-4 py-3 font-semibold">Session Status</th>
                  <th className="px-4 py-3 font-semibold">Last Active</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.data.map((device) => {
                  const isBlocked = device.user.status === "BLOCKED" || device.user.status === "SUSPENDED";
                  const isRevoked = device.revokedAt !== null;

                  return (
                    <tr key={device.id} className="hover:bg-muted/10">
                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{device.user.name || "Student"}</p>
                        <p className="text-[10px] text-muted-foreground">{device.user.email}</p>
                        {device.user.phone && (
                          <p className="text-[10px] text-muted-foreground/80">{device.user.phone}</p>
                        )}
                      </td>

                      {/* Device & OS */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {device.deviceName?.toLowerCase().includes("mobile") ||
                          device.deviceName?.toLowerCase().includes("phone") ? (
                            <Smartphone className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Laptop className="h-4 w-4 text-sky-400 shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-foreground">{device.deviceName || "Generic Device"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {device.operatingSystem || "Unknown OS"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Browser & IP */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{device.browser || "Unknown Browser"}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {device.lastIpAddress || "127.0.0.1"}
                        </p>
                      </td>

                      {/* Account Status */}
                      <td className="px-4 py-3">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[10px] font-extrabold text-destructive border border-destructive/30">
                            <ShieldAlert className="h-3 w-3" />
                            BLOCKED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Session Status */}
                      <td className="px-4 py-3">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            Revoked
                          </span>
                        ) : device.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            Inactive (Idle)
                          </span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        <p>{new Date(device.lastSeenAt).toLocaleDateString("en-IN")}</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {new Date(device.lastSeenAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RevokeDeviceButton
                            deviceId={device.id}
                            deviceName={device.deviceName || "Device"}
                            isRevoked={isRevoked}
                          />

                          <StudentSecurityControls
                            studentId={device.userId}
                            studentEmail={device.user.email}
                            isBlocked={isBlocked}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <p>
              Page {data.page} of {data.totalPages} ({data.total} total devices)
            </p>
            <div className="flex items-center gap-2">
              {data.page > 1 && (
                <Link
                  href={`/admin/devices?page=${data.page - 1}&status=${status}${
                    search ? `&search=${search}` : ""
                  }`}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link
                  href={`/admin/devices?page=${data.page + 1}&status=${status}${
                    search ? `&search=${search}` : ""
                  }`}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
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
