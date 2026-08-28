import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { getSystemPaymentMethodsAction } from "@/server/actions/payment-method.actions";
import { ManualCheckoutClient } from "@/components/checkout/manual-checkout-client";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure Checkout | Super Warrior 30",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await ensureDatabaseSchemaSync();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=/checkout/${courseId}`);
  }

  // Find course by ID or slug
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { slug: courseId }],
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      compareAtPrice: true,
    },
  });

  if (!course) {
    notFound();
  }

  // Check if already enrolled
  let isEnrolled = false;
  try {
    const existingEnrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
        status: "ACTIVE",
      },
      select: { id: true, status: true },
    });

    if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
      isEnrolled = true;
    }
  } catch {
    // fallback if table schema has unmigrated columns
  }

  if (isEnrolled) {
    redirect(`/learn/${course.slug}`);
  }

  const paymentMethods = await getSystemPaymentMethodsAction(false);

  return (
    <ManualCheckoutClient
      course={{
        id: course.id,
        title: course.title,
        slug: course.slug,
        price: Number(course.price),
        compareAtPrice: course.compareAtPrice ? Number(course.compareAtPrice) : null,
      }}
      paymentMethods={paymentMethods}
      userEmail={user.email}
      userName={user.name}
    />
  );
}
