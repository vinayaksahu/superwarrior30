import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { getPublicPaymentMethodsAction } from "@/server/actions/payment-method.actions";
import { getBrokerPublicConfigAction } from "@/server/actions/broker.actions";
import { ManualCheckoutClient } from "@/components/checkout/manual-checkout-client";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { resolvePublicHomepageEnvironment, withEnvironmentContext } from "@/lib/env-context";

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
  const pageEnv = await resolvePublicHomepageEnvironment();

  const user = await withEnvironmentContext(pageEnv, async () => {
    return await getCurrentUser();
  });

  // Find course by ID or slug
  const course = await withEnvironmentContext(pageEnv, async () => {
    return await prisma.course.findFirst({
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
  });

  if (!course) {
    notFound();
  }

  // Check if already enrolled (only for logged-in users)
  if (user) {
    let isEnrolled = false;
    try {
      const existingEnrollment = await withEnvironmentContext(pageEnv, async () => {
        return await prisma.courseEnrollment.findFirst({
          where: {
            userId: user.id,
            courseId: course.id,
            status: "ACTIVE",
          },
          select: { id: true, status: true },
        });
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
  }

  const [paymentMethods, brokerConfig] = await withEnvironmentContext(pageEnv, async () => {
    return await Promise.all([
      getPublicPaymentMethodsAction(),
      getBrokerPublicConfigAction(),
    ]);
  });

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
      brokerConfig={brokerConfig}
      userEmail={user?.email || ""}
      userName={user?.name || null}
      isGuest={!user}
    />
  );
}
