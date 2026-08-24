import type { Metadata } from "next";
import { getAdminSettingsAction } from "@/server/actions/admin.actions";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdmin } from "@/server/dal/auth";

export const metadata: Metadata = {
  title: "Platform Settings",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await getAdminSettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage platform identity, customer contact email, and system operational mode
        </p>
      </div>

      <AdminSettingsForm initialSettings={settings} />
    </div>
  );
}
