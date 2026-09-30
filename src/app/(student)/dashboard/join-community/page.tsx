import { getBrokerPublicConfigAction, getJoinCommunityStatusAction } from "@/server/actions/broker.actions";
import { JoinCommunityClient } from "@/components/student/join-community-client";

export const metadata = {
  title: "Join Community | Super Warrior 30",
};

export default async function JoinCommunityPage() {
  const [brokerConfig, existingClaim] = await Promise.all([
    getBrokerPublicConfigAction(),
    getJoinCommunityStatusAction(),
  ]);

  return (
    <JoinCommunityClient
      brokerConfig={brokerConfig}
      existingClaim={existingClaim}
    />
  );
}
