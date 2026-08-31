import type { Metadata } from "next";
import { getAdminProfileAction } from "@/server/actions/admin.actions";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requireAdmin } from "@/server/dal/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Profile & Password | Settings",
  description: "Update administrator profile details and change master password",
};

export default async function AdminProfileSettingsPage() {
  await requireAdmin();

  const user = await getAdminProfileAction();

  if (!user) {
    redirect("/admin/settings");
  }

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

      <AdminProfileForm user={user} />
    </div>
  );
}
