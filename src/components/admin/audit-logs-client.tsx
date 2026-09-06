"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Monitor,
  Smartphone,
  Globe,
  MapPin,
  Copy,
  Check,
  Info,
  ChevronRight,
  X,
  CreditCard,
  FileText,
  Settings,
  Users,
  Key,
  Server,
  Filter,
} from "lucide-react";
import { parseAuditClientInfo, formatISTDateTime } from "@/lib/audit-helpers";

export interface AuditLogItem {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

interface AuditLogsClientProps {
  initialLogs: AuditLogItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  actionFilter: string;
}

export function AuditLogsClient({
  initialLogs,
  total,
  currentPage,
  totalPages,
  searchQuery,
  actionFilter,
}: AuditLogsClientProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "PAYMENT" | "LOGIN" | "STAFF" | "SETTINGS" | "COURSE">("ALL");

  const copyToClipboard = (text: string, type: "id" | "ip") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedIp(text);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  // Client side filtering for quick exploration
  const filteredLogs = initialLogs.filter((log) => {
    if (categoryFilter === "PAYMENT") {
      const isPayment =
        log.entityType.toLowerCase().includes("payment") ||
        log.action.toLowerCase().includes("payment") ||
        log.action.toLowerCase().includes("order");
      if (!isPayment) return false;
    } else if (categoryFilter === "LOGIN") {
      const isLogin =
        log.action.includes("LOGIN") ||
        log.action.includes("DEVICE") ||
        log.entityType === "UserDevice";
      if (!isLogin) return false;
    } else if (categoryFilter === "STAFF") {
      if (!log.action.includes("STAFF")) return false;
    } else if (categoryFilter === "SETTINGS") {
      const isSetting =
        log.action.includes("SETTINGS") ||
        log.action.includes("ENVIRONMENT") ||
        log.entityType.includes("Setting");
      if (!isSetting) return false;
    } else if (categoryFilter === "COURSE") {
      const isCourse =
        log.entityType.includes("Course") ||
        log.action.includes("COURSE") ||
        log.action.includes("MEDIA");
      if (!isCourse) return false;
    }

    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase();
    return (
      log.actorEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
      JSON.stringify(log.newValues || {}).toLowerCase().includes(q)
    );
  });

  const getActionBadgeStyle = (action: string) => {
    if (action.includes("PAYMENT") || action.includes("ORDER")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (action.includes("LOGIN_SUCCESS")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("FAILED") || action.includes("UNAUTHORIZED") || action.includes("DEACTIVATED")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (action.includes("STAFF") || action.includes("ROLE")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
    if (action.includes("COURSE") || action.includes("MEDIA")) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "ADMIN":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "SUPPORT":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "STUDENT":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "SYSTEM":
        return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Audited Events</p>
              <h3 className="text-xl font-bold text-foreground">{total}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verified Geographic Zone</p>
              <h3 className="text-sm font-semibold text-foreground">Raipur, CG, India</h3>
              <p className="text-[10px] text-muted-foreground">Reliance Jio Network</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Primary Client Systems</p>
              <h3 className="text-sm font-semibold text-foreground">Windows PC & Android</h3>
              <p className="text-[10px] text-muted-foreground">Google Chrome / Mobile</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Gateways & Seed</p>
              <h3 className="text-sm font-semibold text-foreground">Razorpay + 3 Manual</h3>
              <p className="text-[10px] text-muted-foreground">Fully Logged & Audited</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Comprehensive Audit & Security Event Stream
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed record including Indian Standard Time (IST), IP Geolocation, OS, Browser & Audit ID
              </p>
            </div>

            {/* Search inputs */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by actor, IP, action, ID..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Events ({initialLogs.length})
            </button>
            <button
              onClick={() => setCategoryFilter("PAYMENT")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "PAYMENT"
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              Payments & Finance
            </button>
            <button
              onClick={() => setCategoryFilter("LOGIN")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "LOGIN"
                  ? "bg-emerald-500 text-black font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Key className="h-3 w-3" />
              Logins & Devices
            </button>
            <button
              onClick={() => setCategoryFilter("STAFF")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "STAFF"
                  ? "bg-blue-500 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Users className="h-3 w-3" />
              Staff & Permissions
            </button>
            <button
              onClick={() => setCategoryFilter("SETTINGS")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "SETTINGS"
                  ? "bg-purple-500 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Settings className="h-3 w-3" />
              Broker & Settings
            </button>
            <button
              onClick={() => setCategoryFilter("COURSE")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === "COURSE"
                  ? "bg-indigo-500 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FileText className="h-3 w-3" />
              Course & Media
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <Info className="h-6 w-6 mx-auto text-muted-foreground/60" />
            <p>No audit events match your active search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/25 text-muted-foreground">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Timestamp (IST)</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Audit Log ID</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Actor & Role</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Action Performed</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Target Entity</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">IP & Location</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">System & Browser</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log) => {
                  const clientInfo = parseAuditClientInfo(log.ipAddress, log.userAgent, log.newValues);
                  const ist = formatISTDateTime(log.createdAt);

                  return (
                    <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                      {/* 1. Timestamp (IST) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{ist.timeStr}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground pl-4.5">{ist.dateStr}</span>
                      </td>

                      {/* 2. Audit Log ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/60">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {log.id.length > 14 ? `${log.id.slice(0, 10)}...` : log.id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(log.id, "id")}
                            title="Copy Audit Log ID"
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          >
                            {copiedId === log.id ? (
                              <Check className="h-2.5 w-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 3. Actor & Role */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{log.actorEmail}</div>
                        <span
                          className={`inline-block mt-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadgeStyle(
                            log.actorRole
                          )}`}
                        >
                          {log.actorRole}
                        </span>
                      </td>

                      {/* 4. Action */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold border ${getActionBadgeStyle(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* 5. Entity Target */}
                      <td className="px-4 py-3 font-mono text-[11px] text-foreground whitespace-nowrap">
                        <span>{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-muted-foreground ml-1 text-[10px]">
                            #{log.entityId.length > 8 ? log.entityId.slice(-6) : log.entityId}
                          </span>
                        )}
                      </td>

                      {/* 6. IP & Location */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.ipAddress ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[11px] font-medium text-foreground">
                                {log.ipAddress}
                              </span>
                              <button
                                onClick={() => copyToClipboard(log.ipAddress!, "ip")}
                                title="Copy IP"
                                className="text-muted-foreground hover:text-foreground p-0.5"
                              >
                                {copiedIp === log.ipAddress ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400/90">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span>{clientInfo.location}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                            <Server className="h-3 w-3" />
                            <span>Server / Internal</span>
                          </div>
                        )}
                      </td>

                      {/* 7. System & Browser */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          {clientInfo.isMobile ? (
                            <Smartphone className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{clientInfo.os}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground pl-4.5 block">
                          {clientInfo.browser}
                        </span>
                      </td>

                      {/* 8. Details Button */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/40 hover:bg-muted text-foreground border border-border/60 text-[11px] font-medium transition-colors"
                        >
                          <Info className="h-3 w-3 text-primary" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground bg-muted/10">
            <span>
              Showing Page <strong className="text-foreground">{currentPage}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong> ({total} total logs)
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/audit-logs?page=${currentPage - 1}${
                    searchQuery ? `&search=${searchQuery}` : ""
                  }${actionFilter !== "all" ? `&action=${actionFilter}` : ""}`}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/audit-logs?page=${currentPage + 1}${
                    searchQuery ? `&search=${searchQuery}` : ""
                  }${actionFilter !== "all" ? `&action=${actionFilter}` : ""}`}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold border ${getActionBadgeStyle(
                      selectedLog.action
                    )}`}
                  >
                    {selectedLog.action}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {selectedLog.id}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Timestamp (IST): {formatISTDateTime(selectedLog.createdAt).fullIST}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Actor Email</span>
                  <span className="font-semibold text-foreground">{selectedLog.actorEmail}</span>
                  <span className="text-[10px] ml-1.5 text-primary font-mono">({selectedLog.actorRole})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Target Entity</span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.entityType} #{selectedLog.entityId}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">IP & Geolocation</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedLog.ipAddress || "Internal Server"}
                  </span>
                  <span className="text-[10px] block text-emerald-400">
                    {parseAuditClientInfo(selectedLog.ipAddress, selectedLog.userAgent).location}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">System / Browser</span>
                  <span className="font-semibold text-foreground">
                    {parseAuditClientInfo(selectedLog.ipAddress, selectedLog.userAgent).os}
                  </span>
                  <span className="text-[10px] block text-muted-foreground">
                    {parseAuditClientInfo(selectedLog.ipAddress, selectedLog.userAgent).browser}
                  </span>
                </div>
              </div>

              {/* Full Raw User-Agent */}
              {selectedLog.userAgent && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                    Raw User-Agent Header
                  </label>
                  <p className="font-mono text-[11px] p-2.5 rounded-lg bg-background border border-border text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Payload Values (newValues) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Audit Event Payload (newValues JSON)
                  </label>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.newValues, null, 2), "id")
                    }
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy JSON
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-background border border-border font-mono text-[11px] text-foreground overflow-x-auto max-h-56">
                  {selectedLog.newValues
                    ? JSON.stringify(selectedLog.newValues, null, 2)
                    : "No payload captured."}
                </pre>
              </div>

              {/* Old Values if any */}
              {selectedLog.oldValues && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">
                    Previous State (oldValues JSON)
                  </label>
                  <pre className="p-3 rounded-xl bg-background border border-border font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
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
