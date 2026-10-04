import type { Metadata } from "next";
import { getMemberMenuSettingsAction } from "@/server/actions/member-menu.actions";
import { MemberMenuSettingsClient } from "@/components/admin/member-menu-settings-client";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requireAdmin } from "@/server/dal/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Member Portal Menu Settings | Admin",
  description: "Configure visibility of menu items displayed in the student navigation panel",
};

export default async function AdminMemberMenuSettingsPage() {
  await requireAdmin();

  const { items } = await getMemberMenuSettingsAction();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Member Portal Menus
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Control which menu links are visible or hidden for students in the Member Portal (e.g. YouTube Live Trades, Live Classes).
        </p>
      </div>

      <SettingsNav />

      <MemberMenuSettingsClient initialItems={items} />
    </div>
  );
}
