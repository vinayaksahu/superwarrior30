import { requireAdmin } from "@/server/dal/auth";
import { resolveCurrentEnvironment } from "@/lib/env-context";
import { MediaLibraryClient } from "@/components/admin/media/media-library-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media Library | Admin Dashboard",
  description: "Upload and manage reusable course videos, PDFs and images.",
};

export default async function AdminMediaPage() {
  await requireAdmin();
  const currentEnvironment = await resolveCurrentEnvironment();

  return <MediaLibraryClient initialEnvironment={currentEnvironment} />;
}
