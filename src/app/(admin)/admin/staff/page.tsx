import type { Metadata } from "next";
import { getStaffMembersAction } from "@/server/actions/staff.actions";
import { StaffManagementClient } from "@/components/admin/staff-management-client";
import { requireAnyPermission } from "@/server/dal/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Roles & Staff",
};

export default async function AdminStaffPage() {
  await requireAnyPermission(["staff.view", "staff.roles_assign"]);
  const { staff, currentUserRole } = await getStaffMembersAction();

  return <StaffManagementClient initialStaff={staff} currentUserRole={currentUserRole} />;
}
