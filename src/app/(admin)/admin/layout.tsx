import { requireAdmin } from "@/server/dal/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { getEffectivePermissions, getRolePresentation } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  // Resolve role presentation and effective permissions
  const rolePresentation = getRolePresentation(user.role, user.adminRole, user.email);
  const effectivePermissions = getEffectivePermissions(user);
  const permsList = Array.from(effectivePermissions);

  return (
    <div className="flex min-h-screen">
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
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
