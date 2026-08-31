import type { Metadata } from "next";
import { requireAdmin } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import {
  getBrokerAdminSettingsAction,
  listBrokerClaimsAction,
} from "@/server/actions/broker.actions";
import { getAdminCouponsAction } from "@/server/actions/coupon.actions";
import { AdminBrokerOffersClient } from "@/components/admin/admin-broker-offers-client";
import { DEFAULT_BROKER_SETTINGS } from "@/lib/broker/config";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers & Discounts Hub | Admin",
  description: "Unified control center for Broker Partner Offers, Affiliate Referral Discounts, and Promo Coupons",
};

export default async function AdminBrokerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    status?: string;
    mode?: string;
    search?: string;
    couponSearch?: string;
    couponStatus?: string;
  }>;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();
  const params = await searchParams;

  const initialTab = (params?.tab || "MATRIX").toUpperCase();
  const page = parseInt(params?.page || "1") || 1;
  const status = params?.status || "ALL";
  const mode = params?.mode || "ALL";
  const search = params?.search || "";
  const couponSearch = params?.couponSearch || "";
  const couponStatus = params?.couponStatus || "all";

  let settings = DEFAULT_BROKER_SETTINGS;
  let claimsData = { claims: [], totalCount: 0, page: 1, totalPages: 1 };
  let couponsData = { data: [], total: 0, page: 1, totalPages: 1 };
  let courses: { id: string; title: string; price: number; status: string }[] = [];

  try {
    const [fetchedSettings, fetchedClaims, fetchedCoupons, fetchedCourses] = await Promise.all([
      getBrokerAdminSettingsAction(),
      listBrokerClaimsAction({
        page,
        status,
        mode,
        search,
        limit: 50,
      }),
      getAdminCouponsAction({
        page: 1,
        pageSize: 50,
        status: couponStatus,
        search: couponSearch,
      }),
      prisma.course.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, price: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (fetchedSettings) settings = fetchedSettings;
    if (fetchedClaims) claimsData = fetchedClaims as any;
    if (fetchedCoupons) couponsData = fetchedCoupons as any;
    if (fetchedCourses) {
      courses = fetchedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        price: Number(c.price),
        status: c.status,
      }));
    }
  } catch (error) {
    console.error("Error loading offers admin page data:", error);
  }

  return (
    <AdminBrokerOffersClient
      initialTab={initialTab}
      initialSettings={settings}
      claimsData={claimsData}
      couponsData={couponsData}
      courses={courses}
    />
  );
}
