import type { Metadata } from "next";
import { getAdminSupportInquiriesAction } from "@/server/actions/support.actions";
import { AdminSupportClient } from "@/components/admin/admin-support-client";
import { requireAdmin } from "@/server/dal/auth";
import { LifeBuoy } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support & Helpdesk — Admin Panel",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const status = typeof params.status === "string" ? params.status : "ALL";
  const category = typeof params.category === "string" ? params.category : "ALL";
  const search = typeof params.search === "string" ? params.search : "";

  const data = await getAdminSupportInquiriesAction({
    page,
    pageSize: 20,
    status,
    category,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Support Desk & Inquiries
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage incoming student inquiries, payment dispute tickets, and contact requests
          </p>
        </div>
      </div>

      {/* Main Client Content */}
      <AdminSupportClient
        inquiries={data.inquiries}
        pagination={data.pagination}
        metrics={data.metrics}
      />
    </div>
  );
}
