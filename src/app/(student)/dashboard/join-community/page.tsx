import { getBrokerPublicConfigAction, getJoinCommunityStatusAction } from "@/server/actions/broker.actions";
import { JoinCommunityClient } from "@/components/student/join-community-client";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join Community | Super Warrior 30",
};

export default async function JoinCommunityPage() {
  const user = await getCurrentUser();

  const [brokerConfig, existingClaim, activeEnrollmentsCount] = await Promise.all([
    getBrokerPublicConfigAction(),
    getJoinCommunityStatusAction(),
    user
      ? prisma.courseEnrollment.count({
          where: { userId: user.id, status: "ACTIVE" },
        })
      : 0,
  ]);

  const hasPurchasedCourse = activeEnrollmentsCount > 0;

  return (
    <JoinCommunityClient
      brokerConfig={brokerConfig}
      existingClaim={existingClaim}
      hasPurchasedCourse={hasPurchasedCourse}
      userPhone={user?.phone || ""}
    />
  );
}
