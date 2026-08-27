"use client";

import { useEffect, useState } from "react";
import { getStudentMyDevicesAction } from "@/server/actions/device.actions";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

interface DeviceItem {
  id: string;
  deviceName: string | null;
  browser: string | null;
  operatingSystem: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  revokedAt: Date | null;
}

export function StudentDevicesCard() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);

  useEffect(() => {
    getStudentMyDevicesAction()
      .then((res) => {
        setDevices(res.devices as unknown as DeviceItem[]);
        setRegisteredCount(res.registeredCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading device security profile...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-bold text-foreground">Login Devices & Security</h3>
            <p className="text-xs text-muted-foreground">
              Manage your recognized learning devices and active sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
            {registeredCount} of 2 Allowed Devices Registered
          </span>
        </div>
      </div>

      {/* Security Notice */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Single Active Session Policy:</strong> Super Warrior 30 allows learning on a maximum of{" "}
          <span className="font-bold text-foreground">2 distinct devices</span>. Only 1 active session is permitted at a time. Accessing your account from a 3rd distinct device will{" "}
          <span className="text-destructive font-semibold">automatically lock your account for security</span>.
        </p>
      </div>

      {/* Devices List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {devices.map((device, idx) => {
          const isMobile =
            device.deviceName?.toLowerCase().includes("mobile") ||
            device.deviceName?.toLowerCase().includes("phone") ||
            device.operatingSystem?.toLowerCase().includes("ios") ||
            device.operatingSystem?.toLowerCase().includes("android");

          return (
            <div
              key={device.id}
              className={`rounded-xl border p-4 transition-all ${
                device.isActive
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      device.isActive
                        ? "bg-primary/20 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {device.deviceName || `Device #${idx + 1}`}
                      </p>
                      {device.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[9px] font-extrabold text-emerald-400">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          ACTIVE NOW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {device.browser || "Web Browser"} • {device.operatingSystem || "OS"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[10px] text-muted-foreground">
                <span>
                  First registered: {new Date(device.firstSeenAt).toLocaleDateString("en-IN")}
                </span>
                <span>
                  Last active: {new Date(device.lastSeenAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
