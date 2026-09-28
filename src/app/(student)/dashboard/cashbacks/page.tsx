import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentCashbacksAction } from "@/server/actions/broker.actions";
import { StudentCashbacksClient } from "@/components/student/student-cashbacks-client";

import { prisma } from "@/lib/prisma";
import { getBrokerSettings } from "@/lib/broker/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rewards & Offers | Super Warrior 30",
};

export default async function StudentCashbacksPage() {
  const user = await requireAuth();

  const [claims, referralRel, activeEnrollmentCount, brokerSettings] = await Promise.all([
    getStudentCashbacksAction(),
    prisma.referralRelationship.findUnique({
      where: { referredId: user.id },
      include: {
        referrer: {
          select: { id: true, name: true, referralCode: true, status: true, role: true },
        },
      },
    }),
    prisma.courseEnrollment.count({
      where: { userId: user.id, status: "ACTIVE" },
    }),
    getBrokerSettings(),
  ]);

  const referralDiscountPercentage = Number(brokerSettings.referralDiscountPercentage) || 25;
  const isReferralDiscountEnabled = brokerSettings.isReferralDiscountEnabled !== false;

  const defaultReferralCode = "SW30";
  const defaultReferrerName = "Admin";
  const isSelf = user.referralCode === defaultReferralCode;

  const isAdminReferrer =
    referralRel?.referrer?.referralCode === "SW30" ||
    referralRel?.referrer?.referralCode === "SUPERWARRIOR30" ||
    referralRel?.referrer?.role === "SUPER_ADMIN" ||
    referralRel?.referrer?.role === "ADMIN" ||
    referralRel?.referrer?.name === "Vinayak Sahu";

  const resolvedReferrerName = isAdminReferrer
    ? "Admin"
    : referralRel?.referrer?.name || "Mentor / Friend";

  const referralReward =
    referralRel && referralRel.referrer
      ? {
          hasReferrer: true,
          referrerCode: referralRel.referrer.referralCode,
          referrerName: resolvedReferrerName,
          discountPercentage: referralDiscountPercentage,
          isReferralDiscountEnabled,
          hasPurchased: activeEnrollmentCount > 0,
        }
      : !isSelf
      ? {
          hasReferrer: true,
          referrerCode: defaultReferralCode,
          referrerName: defaultReferrerName,
          discountPercentage: referralDiscountPercentage,
          isReferralDiscountEnabled,
          hasPurchased: activeEnrollmentCount > 0,
        }
      : {
          hasReferrer: false,
          discountPercentage: referralDiscountPercentage,
          isReferralDiscountEnabled,
          hasPurchased: activeEnrollmentCount > 0,
        };

  return (
    <StudentCashbacksClient
      claims={claims as any}
      userEmail={user.email}
      userName={user.name}
      referralReward={referralReward}
    />
  );
}
