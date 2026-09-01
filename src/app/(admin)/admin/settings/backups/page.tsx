import type { Metadata } from "next";
import { getDatabaseBackupDataAction } from "@/server/actions/admin.actions";
import { AdminBackupsClient } from "@/components/admin/admin-backups-client";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requirePermission } from "@/server/dal/auth";

export const metadata: Metadata = {
  title: "Database Backups & Maintenance | Settings",
  description: "Download database snapshots, trigger schema syncs, and monitor database health",
};

export default async function AdminBackupsSettingsPage() {
  await requirePermission("settings.backups.manage");

  const res = await getDatabaseBackupDataAction();

  const stats = res?.stats || {
    usersCount: 0,
    coursesCount: 0,
    ordersCount: 0,
    settingsCount: 0,
    claimsCount: 0,
    couponsCount: 0,
    auditLogsCount: 0,
    exportedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Settings &amp; Administration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage platform identity, admin profile &amp; passwords, media storage, and database backups.
        </p>
      </div>

      <SettingsNav />

      <AdminBackupsClient stats={stats} />
    </div>
  );
}
