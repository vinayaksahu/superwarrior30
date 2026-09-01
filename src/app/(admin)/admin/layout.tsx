import { requireAdmin } from "@/server/dal/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  // Check if primary admin
  const isSuper = user.role === "SUPER_ADMIN" || user.email === "vinayaksahu3@gmail.com" || user.email === "admin@superwarrior30.com";
  const displayRole = isSuper ? "SUPER_ADMIN" : user.role;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar userRole={displayRole} userEmail={user.email} />
      <div className="flex flex-1 flex-col">
        <AdminHeader user={{ ...user, role: displayRole }} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
