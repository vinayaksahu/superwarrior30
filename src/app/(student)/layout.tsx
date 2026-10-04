import { redirect } from "next/navigation";
import { requireAuth } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { StudentNav } from "@/components/student/student-nav";
import { StudentHeader } from "@/components/student/student-header";
import { StudentTopAlertBanner } from "@/components/student/student-notifications";
import { getMemberMenuSettingsAction } from "@/server/actions/member-menu.actions";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // If user is Admin or Staff, automatically direct them to the Admin Portal (/admin)
  if (
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "SUPPORT" ||
    Boolean(user.adminRole)
  ) {
    redirect("/admin");
  }

  // Check if student has verified community access & fetch menu visibility concurrently
  const [verifiedCommunityClaim, menuSettings] = await Promise.all([
    prisma.brokerOfferClaim.findFirst({
      where: {
        userId: user.id,
        verificationStatus: "VERIFIED",
      },
      select: { id: true },
    }),
    getMemberMenuSettingsAction(),
  ]);

  const isCommunityMember = Boolean(verifiedCommunityClaim);
  const visibilityMap = menuSettings.visibilityMap;

  return (
    <div className="min-h-screen bg-background">
      <StudentTopAlertBanner />
      <StudentHeader
        user={user}
        isCommunityMember={isCommunityMember}
        visibilityMap={visibilityMap}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row min-w-0">
          <StudentNav
            isCommunityMember={isCommunityMember}
            visibilityMap={visibilityMap}
          />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
