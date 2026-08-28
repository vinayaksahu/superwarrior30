import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CouponForm } from "@/components/admin/coupon-form";
import { requireAdmin } from "@/server/dal/auth";

export const metadata: Metadata = {
  title: "Create Coupon",
};

export default async function AdminNewCouponPage() {
  await requireAdmin();

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
          Create Promotional Coupon
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure a new discount code for your trading courses
        </p>
      </div>

      <CouponForm
        courses={courses.map((c) => ({
          id: c.id,
          title: c.title,
          price: Number(c.price),
        }))}
      />
    </div>
  );
}
