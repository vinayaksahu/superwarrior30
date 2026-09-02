import { requireAdmin } from "@/server/dal/auth";
import { resolveCurrentEnvironment } from "@/lib/env-context";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { MediaLibraryClient } from "@/components/admin/media/media-library-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media Library | Admin Dashboard",
  description: "Upload and manage reusable course videos, PDFs and images.",
};

export default async function AdminMediaPage() {
  const user = await requireAdmin();

  // Strict RBAC Verification: View Permission
  if (!hasPermission(user, "media.view")) {
    redirect("/admin?error=unauthorized_media");
  }

  const currentEnvironment = await resolveCurrentEnvironment();
  const canUpload = hasPermission(user, "media.upload");
  const canDelete = hasPermission(user, "media.delete");

  return (
    <MediaLibraryClient
      initialEnvironment={currentEnvironment}
      canUpload={canUpload}
      canDelete={canDelete}
    />
  );
}
