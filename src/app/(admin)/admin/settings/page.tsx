import type { Metadata } from "next";
import { getAdminSettingsAction } from "@/server/actions/admin.actions";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requireAdmin } from "@/server/dal/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "General Platform Settings | Admin",
  description: "Configure platform identity, contact email, and maintenance mode",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await getAdminSettingsAction();

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

      <AdminSettingsForm initialSettings={settings} />
    </div>
  );
}
