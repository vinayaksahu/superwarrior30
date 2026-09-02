import { requireAdmin, isSuperAdminUser } from "@/server/dal/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { TestingModeBanner } from "@/components/admin/environment-switcher";
import { resolveCurrentEnvironment, isStaffTestingActive } from "@/lib/env-context";
import { getEffectivePermissions, getRolePresentation } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const currentEnvironment = await resolveCurrentEnvironment();
  const isSuper = isSuperAdminUser(user);
  const staffTestingAllowed = isStaffTestingActive();

  // Resolve role presentation and effective permissions
  const rolePresentation = getRolePresentation(user.role, user.adminRole, user.email);
  const effectivePermissions = getEffectivePermissions(user);
  const permsList = Array.from(effectivePermissions);

  return (
    <div className="flex min-h-screen flex-col">
      {currentEnvironment === "TEST" && (
        <TestingModeBanner isSuperAdmin={isSuper} isStaffAdmin={!isSuper} />
      )}
      <div className="flex flex-1">
        <AdminSidebar
          userRole={rolePresentation.effectiveRoleKey}
          userEmail={user.email}
          userPermissions={permsList}
          userDisplayName={rolePresentation.displayName}
          userBadgeLabel={rolePresentation.badgeLabel}
          userBadgeColorClass={rolePresentation.badgeColorClass}
        />
        <div className="flex flex-1 flex-col">
          <AdminHeader
            user={{
              ...user,
              role: rolePresentation.effectiveRoleKey,
              permissions: permsList,
              displayName: rolePresentation.displayName,
              badgeLabel: rolePresentation.badgeLabel,
              badgeColorClass: rolePresentation.badgeColorClass,
            }}
            currentEnvironment={currentEnvironment}
            staffTestingAllowed={staffTestingAllowed}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
