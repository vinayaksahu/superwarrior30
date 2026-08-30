import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSettingsAction } from "@/server/actions/admin.actions";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdmin } from "@/server/dal/auth";
import { Sparkles, ArrowRight } from "lucide-react";

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

      {/* Broker Offers Shortcut Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Broker Offer Modes (Cashback vs Instant Discount)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure partner broker settings, affiliate links, and manage student cashback claims ledger.
            </p>
          </div>
        </div>

        <Link
          href="/admin/broker-offers"
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shrink-0"
        >
          Manage Broker Offers
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <AdminSettingsForm initialSettings={settings} />
    </div>
  );
}
