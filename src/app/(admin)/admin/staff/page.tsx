import type { Metadata } from "next";
import { getStaffMembersAction } from "@/server/actions/staff.actions";
import { StaffManagementClient } from "@/components/admin/staff-management-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Roles & Staff",
};

export default async function AdminStaffPage() {
  const { staff, currentUserRole } = await getStaffMembersAction();

  return <StaffManagementClient initialStaff={staff} currentUserRole={currentUserRole} />;
}
