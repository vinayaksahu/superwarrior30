import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "coupons");
  if (params?.page) q.set("page", params.page);
  if (params?.status) q.set("couponStatus", params.status);
  if (params?.search) q.set("couponSearch", params.search);

  redirect(`/admin/broker-offers?${q.toString()}`);
}
