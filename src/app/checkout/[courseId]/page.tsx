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

  const [paymentMethods, brokerConfig, availableCoupons, userReferralCoupon] =
    await withEnvironmentContext(pageEnv, async () => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setUTCHours(0, 0, 0, 0);

      const [methods, config, rawCoupons, referralRel] = await Promise.all([
        getPublicPaymentMethodsAction(),
        getBrokerPublicConfigAction(),
        prisma.coupon.findMany({
          where: {
            isActive: true,
            showInCheckout: true,
            startDate: { lte: now },
            endDate: { gte: startOfToday },
            OR: [
              { courses: { none: {} } },
              { courses: { some: { courseId: course.id } } },
            ],
          },
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            minOrderAmount: true,
            maxDiscountAmount: true,
            usageLimit: true,
            usageCount: true,
          },
          orderBy: { discountValue: "desc" },
        }),
        user
          ? prisma.referralRelationship.findUnique({
              where: { referredId: user.id },
              include: {
                referrer: {
                  select: { id: true, name: true, referralCode: true, status: true },
                },
              },
            })
          : Promise.resolve(null),
      ]);

      const validCoupons = rawCoupons
        .filter((c) => c.usageLimit === null || c.usageCount < c.usageLimit)
        .map((c) => ({
          id: c.id,
          code: c.code,
          discountType: c.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
          discountValue: Number(c.discountValue),
          minOrderAmount: Number(c.minOrderAmount),
          maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
        }));

      let refCoupon: {
        code: string;
        referrerName: string;
        discountPercentage: number;
        discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
        discountValue?: number;
      } | null = null;

      const defaultReferralCode = "SUPERWARRIOR30";
      const defaultReferrerName = "Vinayak Sahu";
      const referralPct = Number(config?.referralDiscountPercentage) || 25;
      const refType = config?.referralDiscountType || "PERCENTAGE";
      const refVal = config?.referralDiscountValue !== undefined ? config?.referralDiscountValue : referralPct;

      if (
        referralRel &&
        referralRel.referrer &&
        referralRel.referrer.status === "ACTIVE"
      ) {
        refCoupon = {
          code: referralRel.referrer.referralCode,
          referrerName: referralRel.referrer.name || "Mentor / Friend",
          discountPercentage: referralPct,
          discountType: refType,
          discountValue: refVal,
        };
      } else if (config?.isReferralDiscountEnabled !== false) {
        // Direct / New student without a referrer gets default Welcome Coupon "SUPERWARRIOR30"
        const isSelf = user?.referralCode === defaultReferralCode;
        if (!isSelf) {
          refCoupon = {
            code: defaultReferralCode,
            referrerName: defaultReferrerName,
            discountPercentage: referralPct,
            discountType: refType,
            discountValue: refVal,
          };
        }
      }

      return [methods, config, validCoupons, refCoupon] as const;
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
      availableCoupons={availableCoupons}
      userReferralCoupon={userReferralCoupon}
    />
  );
}
