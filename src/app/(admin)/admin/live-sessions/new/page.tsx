import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { LiveSessionForm } from "@/components/admin/live-session-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Schedule Live Class | Admin",
  description: "Schedule a new live class or webinar.",
};

export default async function NewLiveSessionPage() {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/live-sessions"
          className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-foreground">Schedule Live Class</h1>
          <p className="text-xs text-muted-foreground">
            Configure Zoom, Google Meet, or built-in in-app video room.
          </p>
        </div>
      </div>

      <LiveSessionForm courses={courses} />
    </div>
  );
}
