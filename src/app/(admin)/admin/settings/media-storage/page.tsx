import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import { getBunnyAdminConfigAction } from "@/server/actions/bunny-admin.actions";
import { AdminBunnyWizardClient } from "@/components/admin/admin-bunny-wizard-client";
import { SettingsNav } from "@/components/admin/settings-nav";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bunny.net Media Storage & CDN Setup | Admin",
};

export default async function AdminMediaStoragePage() {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const config = await getBunnyAdminConfigAction();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Settings &amp; Administration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage platform identity, admin profile &amp; passwords, media storage, and database backups.
        </p>
      </div>

      <SettingsNav />

      <AdminBunnyWizardClient initialConfig={config} />
    </div>
  );
}
