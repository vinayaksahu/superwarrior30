"use client";

import { useState } from "react";
import {
  revokeDeviceAction,
  revokeAllStudentDevicesAction,
  unblockStudentAccountAction,
} from "@/server/actions/device.actions";
import { ShieldCheck, ShieldAlert, Ban, PowerOff, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function RevokeDeviceButton({
  deviceId,
  deviceName,
  isRevoked,
}: {
  deviceId: string;
  deviceName: string;
  isRevoked: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (isRevoked) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive/80 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
        Revoked
      </span>
    );
  }

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke session for "${deviceName}"? The student will be logged out on this device.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await revokeDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message);
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
    <button
      type="button"
      disabled={loading}
      onClick={handleRevoke}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer disabled:opacity-50"
      title="Revoke active session for this device"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <PowerOff className="h-3 w-3" />}
      Revoke
    </button>
  );
}

export function StudentSecurityControls({
  studentId,
  studentEmail,
  isBlocked,
}: {
  studentId: string;
  studentEmail: string;
  isBlocked: boolean;
}) {
  const [unblocking, setUnblocking] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const handleUnblock = async (resetDevices: boolean) => {
    const msg = resetDevices
      ? `Unblock ${studentEmail} AND clear device history so they can register 2 new devices?`
      : `Unblock ${studentEmail}? (Existing recognized devices will remain in history, requiring re-login).`;

    if (!confirm(msg)) return;

    setUnblocking(true);
    try {
      const res = await unblockStudentAccountAction(studentId, resetDevices);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to unblock student.");
    } finally {
      setUnblocking(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm(`Revoke ALL active devices and sessions for ${studentEmail}? The student must log in again.`)) {
      return;
    }

    setRevokingAll(true);
    try {
      const res = await revokeAllStudentDevicesAction(studentId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to revoke all sessions.");
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isBlocked ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={unblocking}
            onClick={() => handleUnblock(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-black shadow-sm transition-all hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
            title="Unblock account and reset device slots"
          >
            {unblocking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Unblock & Reset Devices
          </button>

          <button
            type="button"
            disabled={unblocking}
            onClick={() => handleUnblock(false)}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            Unblock Only
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={revokingAll}
          onClick={handleRevokeAll}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer disabled:opacity-50"
        >
          {revokingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Ban className="h-3.5 w-3.5" />
          )}
          Revoke All Sessions
        </button>
      )}
    </div>
  );
}
