import type { Metadata } from "next";
import Link from "next/link";
import { getAffiliateMaterialsAction } from "@/server/actions/referral.actions";
import { AffiliateMaterialsManager } from "@/components/admin/affiliate-materials-manager";
import { requireAdmin } from "@/server/dal/auth";
import { ArrowLeft, Sparkles, Settings, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiliate Promotional Materials",
};

export default async function AdminReferralMaterialsPage() {
  await requireAdmin();

  const materials = await getAffiliateMaterialsAction(true);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/referrals"
            className="rounded-lg border border-input p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Promotional Creatives &amp; Marketing Kit</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Add banners, posters, WhatsApp, Telegram, Instagram &amp; Facebook share messages with automatic affiliate link injection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/referrals/clearance"
            className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
          >
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Clearance</span>
          </Link>
          <Link
            href="/admin/referrals/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Tiers &amp; Rules</span>
          </Link>
        </div>
      </div>

      {/* Main Manager Component */}
      <AffiliateMaterialsManager initialMaterials={materials} />
    </div>
  );
}
