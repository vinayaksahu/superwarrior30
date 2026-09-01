"use client";

import { useState, useTransition } from "react";
import {
  createStaffAccountAction,
  updateStaffRoleAction,
  toggleStaffStatusAction,
  type StaffMember,
} from "@/server/actions/staff.actions";
import {
  type AdminRoleType,
  ROLE_PRESETS,
  ALL_MODULES,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";
import { StaffRoleModal } from "@/components/admin/staff-role-modal";
import {
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Edit2,
  Power,
  X,
  Loader2,
  Eye,
  EyeOff,
  Layers,
  KeyRound,
} from "lucide-react";

interface StaffManagementClientProps {
  initialStaff: StaffMember[];
  currentUserRole: string;
  isSuperAdmin?: boolean;
  canAssignRoles?: boolean;
  canCreateDeactivate?: boolean;
}

export function StaffManagementClient({
  initialStaff,
  currentUserRole,
  isSuperAdmin = false,
  canAssignRoles = false,
  canCreateDeactivate = false,
}: StaffManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRoleStaff, setEditRoleStaff] = useState<StaffMember | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message?: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    password: "",
    adminRole: "FULL_ACCESS_ADMIN" as AdminRoleType,
  });

  const [createCustomPerms, setCreateCustomPerms] = useState<Set<string>>(
    new Set(["dashboard.view", "settings.profile.manage"])
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const fd = new FormData();
    fd.append("name", createFormData.name);
    fd.append("email", createFormData.email);
    fd.append("password", createFormData.password);
    fd.append("adminRole", createFormData.adminRole);

    if (createFormData.adminRole === "CUSTOM_ROLE") {
      fd.append("customPermissions", JSON.stringify(Array.from(createCustomPerms)));
    }

    startTransition(async () => {
      const res = await createStaffAccountAction(null, fd);
      setFeedback(res);
      if (res.success) {
        setIsCreateOpen(false);
        setCreateFormData({
          name: "",
          email: "",
          password: "",
          adminRole: "FULL_ACCESS_ADMIN",
        });
      }
    });
  };

  const handleRoleChangeConfirm = (
    staffId: string,
    newAdminRole: AdminRoleType,
    customPermissions: string[]
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateStaffRoleAction(staffId, newAdminRole, customPermissions);
      setFeedback(res);
      setEditRoleStaff(null);
    });
  };

  const handleToggleStatus = (staffId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleStaffStatusAction(staffId);
      setFeedback(res);
    });
  };

  const assignableRoles: AdminRoleType[] = [
    "FULL_ACCESS_ADMIN",
    "SUPPORT",
    "VIEWER",
    "FINANCE",
    "MARKETING",
    "CUSTOM_ROLE",
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-primary" />
            System Administrators ({initialStaff.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Role-Based Access Control (RBAC) &amp; staff permission management
          </p>
        </div>

        {(isSuperAdmin || canCreateDeactivate) && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff / Admin
          </button>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-center justify-between animate-in fade-in ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Administrators Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-4">Staff Name</th>
                <th className="px-5 py-4">Username &amp; Email</th>
                <th className="px-5 py-4">Role &amp; Access</th>
                <th className="px-5 py-4">Permissions Scope</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {initialStaff.map((staff) => {
                const isSuper = staff.adminRole === "SUPER_ADMIN";
                const initials = staff.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={staff.id}
                    className="hover:bg-muted/15 transition-colors group"
                  >
                    {/* Staff Name & Avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                            isSuper
                              ? "bg-destructive/20 text-destructive border border-destructive/30"
                              : "bg-primary/20 text-primary border border-primary/30"
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm leading-tight">{staff.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Joined {new Date(staff.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                      <p className="font-semibold text-foreground">@{staff.email.split("@")[0]}</p>
                      <p className="text-[10px]">{staff.email}</p>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${staff.badgeColorClass}`}>
                          {staff.badgeLabel}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-medium">{staff.displayName}</p>
                      </div>
                    </td>

                    {/* Permissions Scope */}
                    <td className="px-5 py-4 text-[11px] text-muted-foreground max-w-xs">
                      <p className="line-clamp-2">{staff.permissionsScope}</p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary mt-1">
                        <KeyRound className="h-2.5 w-2.5" />
                        {staff.permissionsCount} active permissions
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          staff.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-destructive/15 text-destructive border border-destructive/30"
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {isSuper ? (
                        <span className="text-[11px] italic font-bold text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                          Root Authority
                        </span>
                      ) : (isSuperAdmin || canAssignRoles || canCreateDeactivate) ? (
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Change Role Button */}
                          {(isSuperAdmin || canAssignRoles) && (
                            <button
                              onClick={() => setEditRoleStaff(staff)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Edit2 className="h-3 w-3 text-amber-400" />
                              Change Role
                            </button>
                          )}

                          {/* Deactivate / Activate Button */}
                          {(isSuperAdmin || canCreateDeactivate) && (
                            <button
                              onClick={() => handleToggleStatus(staff.id)}
                              disabled={isPending}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                                staff.status === "ACTIVE"
                                  ? "text-destructive hover:bg-destructive/10"
                                  : "text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              <Power className="h-3 w-3" />
                              {staff.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Staff / Admin */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Create Administrative Staff</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@superwarrior30.com"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min. 6 characters"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    className="w-full h-10 rounded-xl border border-input bg-background pl-3.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Assigned Administrative Role</label>
                <select
                  value={createFormData.adminRole}
                  onChange={(e) => setCreateFormData({ ...createFormData, adminRole: e.target.value as AdminRoleType })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {assignableRoles.map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {ROLE_PRESETS[roleKey].displayName} — {ROLE_PRESETS[roleKey].shortDescription}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Role Granular Permissions Quick Checklist */}
              {createFormData.adminRole === "CUSTOM_ROLE" && (
                <div className="p-3 rounded-xl border border-border bg-background/50 space-y-2">
                  <p className="font-bold text-[11px] text-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                    Custom Permissions: {createCustomPerms.size} selected
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    You can further edit all granular permissions in detail via the &ldquo;Change Role&rdquo; modal after creating this account.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Role & Granular Permissions */}
      {editRoleStaff && (
        <StaffRoleModal
          staff={editRoleStaff}
          onClose={() => setEditRoleStaff(null)}
          onConfirm={handleRoleChangeConfirm}
          isPending={isPending}
        />
      )}
    </div>
  );
}
