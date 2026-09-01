"use client";

import { useState } from "react";
import {
  type AdminRoleType,
  ROLE_PRESETS,
  ALL_MODULES,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";
import { type StaffMember } from "@/server/actions/staff.actions";
import {
  X,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface StaffRoleModalProps {
  staff: StaffMember;
  onClose: () => void;
  onConfirm: (staffId: string, newRole: AdminRoleType, customPermissions: string[]) => void;
  isPending: boolean;
}

export function StaffRoleModal({
  staff,
  onClose,
  onConfirm,
  isPending,
}: StaffRoleModalProps) {
  const [step, setStep] = useState<"SELECT_ROLE" | "CONFIRM">("SELECT_ROLE");
  const [selectedRole, setSelectedRole] = useState<AdminRoleType>(
    staff.adminRole === "SUPER_ADMIN" ? "FULL_ACCESS_ADMIN" : staff.adminRole
  );

  // Custom permissions state
  const [customPerms, setCustomPerms] = useState<Set<string>>(
    new Set(staff.customPermissions && staff.customPermissions.length > 0 ? staff.customPermissions : ROLE_PRESETS.FULL_ACCESS_ADMIN.defaultPermissions)
  );

  // Available roles for selection (SUPER_ADMIN cannot be assigned)
  const assignableRoles: AdminRoleType[] = [
    "FULL_ACCESS_ADMIN",
    "SUPPORT",
    "VIEWER",
    "FINANCE",
    "MARKETING",
    "CUSTOM_ROLE",
  ];

  const handleTogglePermission = (key: string) => {
    setCustomPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setCustomPerms(new Set(ALL_PERMISSION_KEYS));
  };

  const handleClearAll = () => {
    setCustomPerms(new Set(["dashboard.view", "settings.profile.manage"]));
  };

  const handleProceedToConfirm = () => {
    if (selectedRole === "CUSTOM_ROLE" && customPerms.size === 0) {
      alert("Please select at least one permission for the Custom Role.");
      return;
    }
    setStep("CONFIRM");
  };

  const handleFinalSubmit = () => {
    onConfirm(staff.id, selectedRole, Array.from(customPerms));
  };

  const oldPreset = ROLE_PRESETS[staff.adminRole] || ROLE_PRESETS.FULL_ACCESS_ADMIN;
  const newPreset = ROLE_PRESETS[selectedRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground leading-tight">
                Change Role &amp; Permissions
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modifying access scope for <span className="font-semibold text-foreground">{staff.name}</span> ({staff.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "SELECT_ROLE" ? (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Role Options */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Administrative Role
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignableRoles.map((roleKey) => {
                  const preset = ROLE_PRESETS[roleKey];
                  const isSelected = selectedRole === roleKey;

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setSelectedRole(roleKey)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card/60 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {preset.displayName}
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {preset.shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${preset.badgeColorClass}`}>
                          {preset.badgeLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {roleKey === "CUSTOM_ROLE" ? `${customPerms.size} selected` : `${preset.defaultPermissions.length} perms`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Role Granular Permission Matrix */}
            {selectedRole === "CUSTOM_ROLE" && (
              <div className="space-y-4 rounded-xl border border-border/80 bg-background/50 p-4 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-400" />
                      Granular Permission Matrix
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Select specific modules and authorized actions for this custom role
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                      {customPerms.size} / {ALL_PERMISSION_KEYS.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 text-[11px] font-semibold text-foreground rounded-lg border border-border hover:bg-accent cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground rounded-lg border border-border hover:bg-accent cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {ALL_MODULES.map((module) => {
                    const modulePerms = module.permissions;
                    const allInModuleSelected = modulePerms.every((p) => customPerms.has(p.key));
                    const someInModuleSelected = modulePerms.some((p) => customPerms.has(p.key));

                    const toggleEntireModule = () => {
                      setCustomPerms((prev) => {
                        const next = new Set(prev);
                        if (allInModuleSelected) {
                          modulePerms.forEach((p) => next.delete(p.key));
                        } else {
                          modulePerms.forEach((p) => next.add(p.key));
                        }
                        return next;
                      });
                    };

                    return (
                      <div
                        key={module.id}
                        className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={toggleEntireModule}
                            className="flex items-center gap-2 text-left font-bold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                          >
                            {allInModuleSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : someInModuleSelected ? (
                              <Square className="h-4 w-4 text-amber-400" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{module.name}</span>
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {modulePerms.filter((p) => customPerms.has(p.key)).length} / {modulePerms.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1">
                          {modulePerms.map((perm) => {
                            const isChecked = customPerms.has(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                                  isChecked
                                    ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                                    : "border-border/40 text-muted-foreground hover:bg-accent/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                                />
                                <div>
                                  <p className="font-semibold text-foreground">{perm.name}</p>
                                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{perm.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToConfirm}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
              >
                Review &amp; Confirm Change
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation Screen */
          <div className="p-6 space-y-6 animate-in fade-in">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-300">Confirm Role &amp; Permission Update</p>
                <p className="text-amber-200/80 leading-relaxed">
                  Updating this staff member&apos;s role will immediately adjust their backend permissions and invalidate any active login sessions to enforce the new authority level.
                </p>
              </div>
            </div>

            {/* Old vs New Role Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border/80 bg-background/60 space-y-2">
                <p className="text-[11px] uppercase font-bold text-muted-foreground">Current Role</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${oldPreset.badgeColorClass}`}>
                    {staff.badgeLabel}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">{staff.displayName}</p>
                <p className="text-[11px] text-muted-foreground">{staff.permissionsScope}</p>
              </div>

              <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-2">
                <p className="text-[11px] uppercase font-bold text-primary">New Assigned Role</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${newPreset.badgeColorClass}`}>
                    {newPreset.badgeLabel}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">{newPreset.displayName}</p>
                <p className="text-[11px] text-muted-foreground">{newPreset.shortDescription}</p>
              </div>
            </div>

            {/* Summary Details */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Access Summary
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                <li>Total authorized permissions: <span className="font-bold text-foreground">{selectedRole === "CUSTOM_ROLE" ? customPerms.size : newPreset.defaultPermissions.length}</span></li>
                <li>Audit log record will be created under your Super Admin ID</li>
                <li>Immediate session token refresh will take effect</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={() => setStep("SELECT_ROLE")}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Back to Role Selection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Role Change
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
