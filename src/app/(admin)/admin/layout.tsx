import { requireAdmin, isSuperAdminUser } from "@/server/dal/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { TestingModeBanner } from "@/components/admin/environment-switcher";
import { resolveCurrentEnvironment, resolveTestVisibilityScope } from "@/lib/env-context";
import { isStaffTestingAllowedInDb } from "@/server/actions/environment.actions";
import { getEffectivePermissions, getRolePresentation } from "@/lib/permissions";
import { UploadManagerProvider } from "@/contexts/upload-manager-context";
import { GlobalUploadWidget } from "@/components/admin/media/global-upload-widget";
import { UploadManagerModal } from "@/components/admin/media/upload-manager-modal";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, currentEnvironment, staffTestingAllowed, visibilityScope] = await Promise.all([
    requireAdmin(),
    resolveCurrentEnvironment(),
    isStaffTestingAllowedInDb(),
    resolveTestVisibilityScope(),
  ]);
  const isSuper = isSuperAdminUser(user);

  // Resolve role presentation and effective permissions
  const rolePresentation = getRolePresentation(user.role, user.adminRole, user.email);
  const effectivePermissions = getEffectivePermissions(user);
  const permsList = Array.from(effectivePermissions);

  return (
    <UploadManagerProvider>
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
          <div className="flex flex-1 flex-col min-w-0">
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
              isSuperAdmin={isSuper}
              testVisibilityScope={visibilityScope}
            />
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 min-w-0">{children}</main>
          </div>
        </div>
        <GlobalUploadWidget />
        <UploadManagerModal />
      </div>
    </UploadManagerProvider>
  );
}
