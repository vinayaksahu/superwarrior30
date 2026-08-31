import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import {
  getBrokerAdminSettingsAction,
  listBrokerClaimsAction,
} from "@/server/actions/broker.actions";
import { AdminBrokerOffersClient } from "@/components/admin/admin-broker-offers-client";
import { DEFAULT_BROKER_SETTINGS } from "@/lib/broker/config";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broker Offers & Cashback Modes | Admin",
};

export default async function AdminBrokerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; mode?: string; search?: string }>;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();
  const params = await searchParams;

  const page = parseInt(params?.page || "1") || 1;
  const status = params?.status || "ALL";
  const mode = params?.mode || "ALL";
  const search = params?.search || "";

  let settings = DEFAULT_BROKER_SETTINGS;
  let claimsData = { claims: [], totalCount: 0, page: 1, totalPages: 1 };
  let courses: { id: string; title: string; price: number; status: string }[] = [];

  try {
    const [fetchedSettings, fetchedClaims, fetchedCourses] = await Promise.all([
      getBrokerAdminSettingsAction(),
      listBrokerClaimsAction({
        page,
        status,
        mode,
        search,
        limit: 50,
      }),
      prisma.course.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, price: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (fetchedSettings) settings = fetchedSettings;
    if (fetchedClaims) claimsData = fetchedClaims as any;
    if (fetchedCourses) {
      courses = fetchedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        price: Number(c.price),
        status: c.status,
      }));
    }
  } catch (error) {
    console.error("Error loading broker offers admin page data:", error);
  }

  return (
    <AdminBrokerOffersClient
      initialSettings={settings}
      claimsData={claimsData}
      courses={courses}
    />
  );
}
