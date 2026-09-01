import type { Metadata } from "next";
import { getEmailSettingsAction } from "@/server/actions/email-settings.actions";
import { EmailSettingsForm } from "@/components/admin/email-settings-form";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requireSuperAdmin } from "@/server/dal/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Email & OTP Security | Admin",
  description: "Configure Namecheap SMTP delivery and Email OTP two-factor verification policies",
};

export default async function AdminEmailSettingsPage() {
  await requireSuperAdmin();

  const settings = await getEmailSettingsAction();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Email &amp; OTP Security
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage Namecheap Private Email SMTP connectivity, dispatch test emails, and configure 2-factor OTP verification policies.
        </p>
      </div>

      <SettingsNav />

      <EmailSettingsForm initialSettings={settings} />
    </div>
  );
}
