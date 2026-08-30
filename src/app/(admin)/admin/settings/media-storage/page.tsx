import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import { getBunnyAdminConfigAction } from "@/server/actions/bunny-admin.actions";
import { AdminBunnyWizardClient } from "@/components/admin/admin-bunny-wizard-client";
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
      <AdminBunnyWizardClient initialConfig={config} />
    </div>
  );
}
