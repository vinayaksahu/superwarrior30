"use client";

import { useState } from "react";
import {
  revokeDeviceAction,
  revokeAllStudentDevicesAction,
  unblockStudentAccountAction,
} from "@/server/actions/device.actions";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  PowerOff,
  Loader2,
  RotateCcw,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ==========================================
// CUSTOM WEB APP CONFIRMATION MODAL DIALOG
// ==========================================
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "destructive" | "warning" | "success" | "primary";
  icon?: "power" | "shield" | "alert" | "rotate";
  loading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm Action",
  confirmVariant = "destructive",
  icon = "power",
  loading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !loading && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200 space-y-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                confirmVariant === "destructive"
                  ? "bg-destructive/15 border-destructive/30 text-destructive"
                  : confirmVariant === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-primary/15 border-primary/30 text-primary"
              }`}
            >
              {icon === "power" && <PowerOff className="h-5 w-5" />}
              {icon === "alert" && <AlertTriangle className="h-5 w-5" />}
              {icon === "shield" && <ShieldCheck className="h-5 w-5" />}
              {icon === "rotate" && <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Super Warrior 30 Security</p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description Body */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
          {description}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              confirmVariant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20"
                : confirmVariant === "success"
                ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// REVOKE DEVICE BUTTON WITH MODAL
// ==========================================
export function RevokeDeviceButton({
  deviceId,
  deviceName,
  isRevoked,
}: {
  deviceId: string;
  deviceName: string;
  isRevoked: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isRevoked) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive/80 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
        Revoked
      </span>
    );
  }

  const handleConfirmRevoke = async () => {
    setLoading(true);
    try {
      const res = await revokeDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message);
        setModalOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to revoke device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
        title="Revoke active session for this device"
      >
        <PowerOff className="h-3 w-3" />
        Revoke
      </button>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmRevoke}
        loading={loading}
        title="Revoke Device Session"
        description={`Are you sure you want to revoke the active session for "${deviceName}"? The student will be logged out immediately on this device.`}
        confirmText="Revoke Device"
        confirmVariant="destructive"
        icon="power"
      />
    </>
  );
}

// ==========================================
// STUDENT SECURITY CONTROLS WITH MODALS
// ==========================================
export function StudentSecurityControls({
  studentId,
  studentEmail,
  isBlocked,
}: {
  studentId: string;
  studentEmail: string;
  isBlocked: boolean;
}) {
  const [unblockResetOpen, setUnblockResetOpen] = useState(false);
  const [unblockOnlyOpen, setUnblockOnlyOpen] = useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnblock = async (resetDevices: boolean) => {
    setLoading(true);
    try {
      const res = await unblockStudentAccountAction(studentId, resetDevices);
      if (res.success) {
        toast.success(res.message);
        setUnblockResetOpen(false);
        setUnblockOnlyOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to unblock student.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    setLoading(true);
    try {
      const res = await revokeAllStudentDevicesAction(studentId);
      if (res.success) {
        toast.success(res.message);
        setRevokeAllOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to revoke all sessions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUnblockResetOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-black shadow-sm transition-all hover:bg-emerald-400 cursor-pointer"
              title="Unblock account and reset device slots"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Unblock & Reset Devices
            </button>

            <button
              type="button"
              onClick={() => setUnblockOnlyOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              Unblock Only
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevokeAllOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5" />
            Revoke All Sessions
          </button>
        )}
      </div>

      {/* 1. Unblock & Reset Devices Modal */}
      <ConfirmationModal
        isOpen={unblockResetOpen}
        onClose={() => setUnblockResetOpen(false)}
        onConfirm={() => handleUnblock(true)}
        loading={loading}
        title="Unblock Account & Reset Devices"
        description={`Unblock student account (${studentEmail}) AND reset all registered device slots? This allows the student to register up to 2 brand new devices upon logging in.`}
        confirmText="Unblock & Reset Slots"
        confirmVariant="success"
        icon="rotate"
      />

      {/* 2. Unblock Only Modal */}
      <ConfirmationModal
        isOpen={unblockOnlyOpen}
        onClose={() => setUnblockOnlyOpen(false)}
        onConfirm={() => handleUnblock(false)}
        loading={loading}
        title="Unblock Student Account"
        description={`Unblock student account (${studentEmail})? The account status will be restored to ACTIVE. Existing recognized devices will remain in history.`}
        confirmText="Unblock Student"
        confirmVariant="success"
        icon="shield"
      />

      {/* 3. Revoke All Sessions Modal */}
      <ConfirmationModal
        isOpen={revokeAllOpen}
        onClose={() => setRevokeAllOpen(false)}
        onConfirm={handleRevokeAll}
        loading={loading}
        title="Revoke All Sessions"
        description={`Are you sure you want to revoke ALL active sessions and devices for ${studentEmail}? The student will be immediately signed out from all laptops and phones.`}
        confirmText="Revoke All Sessions"
        confirmVariant="destructive"
        icon="alert"
      />
    </>
  );
}
