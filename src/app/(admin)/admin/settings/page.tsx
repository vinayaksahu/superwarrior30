import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSettingsAction } from "@/server/actions/admin.actions";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdmin } from "@/server/dal/auth";
import { ArrowRight, Cloud } from "lucide-react";

export const metadata: Metadata = {
  title: "Platform Settings",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await getAdminSettingsAction();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage platform identity, customer contact email, and system operational mode
        </p>
      </div>

      {/* Media Storage & Bunny CDN Setup Card */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Media Storage &amp; Bunny.net CDN</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect client Bunny account, configure production Storage Zone, HLS Video Stream, and CDN edge delivery.
            </p>
          </div>
        </div>

        <Link
          href="/admin/settings/media-storage"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
        >
          Setup Media Storage
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <AdminSettingsForm initialSettings={settings} />
    </div>
  );
}
