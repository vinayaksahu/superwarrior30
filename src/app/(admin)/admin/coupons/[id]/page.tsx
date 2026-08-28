import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminCouponByIdAction } from "@/server/actions/coupon.actions";
import { CouponForm } from "@/components/admin/coupon-form";
import { requireAdmin } from "@/server/dal/auth";

export const metadata: Metadata = {
  title: "Edit Coupon",
};

export default async function AdminEditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  let coupon;
  try {
    coupon = await getAdminCouponByIdAction(id);
  } catch {
    notFound();
  }

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Edit Coupon: {coupon.code}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Modify discount parameters, usage limits, and course restrictions
        </p>
      </div>

      <CouponForm
        isEdit
        coupon={coupon}
        courses={courses.map((c) => ({
          id: c.id,
          title: c.title,
          price: Number(c.price),
        }))}
      />
    </div>
  );
}
