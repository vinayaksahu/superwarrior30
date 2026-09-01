"use client";

import { useState, useTransition } from "react";
import {
  createStaffAccountAction,
  updateStaffRoleAction,
  toggleStaffStatusAction,
  type StaffMember,
} from "@/server/actions/staff.actions";
import {
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Edit2,
  Power,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface StaffManagementClientProps {
  initialStaff: StaffMember[];
  currentUserRole: string;
}

export function StaffManagementClient({
  initialStaff,
  currentUserRole,
}: StaffManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRoleStaff, setEditRoleStaff] = useState<StaffMember | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message?: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN" as "ADMIN" | "SUPPORT",
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("email", formData.email);
    fd.append("password", formData.password);
    fd.append("role", formData.role);

    startTransition(async () => {
      const res = await createStaffAccountAction(null, fd);
      setFeedback(res);
      if (res.success) {
        setIsCreateOpen(false);
        setFormData({ name: "", email: "", password: "", role: "ADMIN" });
      }
    });
  };

  const handleRoleChange = (staffId: string, newRole: "ADMIN" | "SUPPORT") => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateStaffRoleAction(staffId, newRole);
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
            All active and staff administrative accounts across platform authority tiers
          </p>
        </div>

        {currentUserRole === "SUPER_ADMIN" && (
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
          className={`rounded-xl p-4 text-xs font-medium border flex items-center justify-between ${
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
                <th className="px-5 py-4">Username & Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Permissions Scope</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {initialStaff.map((staff) => {
                const isSuper = staff.role === "SUPER_ADMIN";
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
                              : staff.role === "ADMIN"
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
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
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive border border-destructive/30">
                          SUPER_ADMIN
                        </span>
                      ) : staff.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 border border-sky-500/30">
                          VIEWER / STAFF
                        </span>
                      )}
                    </td>

                    {/* Permissions Scope */}
                    <td className="px-5 py-4 text-[11px] text-muted-foreground max-w-xs">
                      {staff.permissionsScope}
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
                        <span className="text-[11px] italic font-semibold text-muted-foreground">
                          Root Authority
                        </span>
                      ) : currentUserRole === "SUPER_ADMIN" ? (
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Change Role Button */}
                          <button
                            onClick={() => setEditRoleStaff(staff)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Edit2 className="h-3 w-3 text-amber-400" />
                            Change Role
                          </button>

                          {/* Deactivate / Activate Button */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Create Administrative Staff</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground"
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
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@superwarrior30.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                <label className="font-semibold text-foreground">Administrative Role & Scope</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "SUPPORT" })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ADMIN">ADMIN — Full Operations (Courses, Orders, Students, Payouts)</option>
                  <option value="SUPPORT">SUPPORT / VIEWER — Read-Only Customer Support</option>
                </select>
              </div>

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

      {/* Modal: Change Role */}
      {editRoleStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Change Role for {editRoleStaff.name}</h3>
              <button
                onClick={() => setEditRoleStaff(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Select the new permission level for this staff member:</p>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleRoleChange(editRoleStaff.id, "ADMIN")}
                  disabled={isPending}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    editRoleStaff.role === "ADMIN"
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-bold">ADMIN</p>
                    <p className="text-[10px] text-muted-foreground">Manage courses, orders, students & payouts</p>
                  </div>
                  {editRoleStaff.role === "ADMIN" && <CheckCircle2 className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => handleRoleChange(editRoleStaff.id, "SUPPORT")}
                  disabled={isPending}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    editRoleStaff.role === "SUPPORT"
                      ? "border-sky-500 bg-sky-500/10 text-sky-400 font-bold"
                      : "border-border hover:border-sky-500/40 text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-bold">SUPPORT / VIEWER</p>
                    <p className="text-[10px] text-muted-foreground">Read-only monitoring and audit logs</p>
                  </div>
                  {editRoleStaff.role === "SUPPORT" && <CheckCircle2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setEditRoleStaff(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
