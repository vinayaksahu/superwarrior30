import type { Metadata } from "next";
import Link from "next/link";
import { getReferralSettingsAction } from "@/server/actions/referral.actions";
import { ReferralSettingsForm } from "@/components/admin/referral-settings-form";
import { requireAdmin } from "@/server/dal/auth";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Referral Program Settings",
};

export default async function AdminReferralSettingsPage() {
  await requireAdmin();

  const settings = await getReferralSettingsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/referrals"
          className="rounded-lg border border-input p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Referral Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-tier referral depths, commission percentages, and global toggles
          </p>
        </div>
      </div>

      <ReferralSettingsForm
        initialEnabled={settings.isReferralEnabled}
        initialLevels={settings.levels}
      />
    </div>
  );
}
