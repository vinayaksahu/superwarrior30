"use client";

import { useState, useRef } from "react";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Activity,
  Loader2,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  Users,
  BookOpen,
  ShoppingBag,
  Sliders,
  X,
  FileCheck,
  Trash2,
} from "lucide-react";
import { triggerDatabaseSyncAction } from "@/server/actions/admin.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface BackupStats {
  usersCount: number;
  coursesCount: number;
  ordersCount: number;
  settingsCount: number;
  claimsCount: number;
  couponsCount: number;
  auditLogsCount: number;
  exportedAt: string;
}

interface AdminBackupsClientProps {
  stats: BackupStats;
  operatorEmail?: string;
}

interface ParsedBackupFile {
  file: File;
  fileType: "json" | "xlsx";
  fileName: string;
  fileSize: number;
  summary: {
    users?: number;
    courses?: number;
    orders?: number;
    enrollments?: number;
    settings?: number;
    [key: string]: any;
  };
  payload: any;
}

export function AdminBackupsClient({
  stats,
  operatorEmail = "admin@superwarrior30.com",
}: AdminBackupsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Mode: "clean" = Clean & Restore (wipes conflicting records), "safe" = Safe Merge / Upsert
  const [restoreMode, setRestoreMode] = useState<"clean" | "safe">("clean");

  const [selectedBackup, setSelectedBackup] = useState<ParsedBackupFile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreResults, setRestoreResults] = useState<Record<string, number> | null>(null);

  // 1. Schema Sync
  const handleRunSchemaSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerDatabaseSyncAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run schema sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Download JSON Backup
  const handleDownloadJson = async () => {
    setIsDownloadingJson(true);
    try {
      toast.loading("Exporting complete system JSON...", { id: "backup-dl" });
      const res = await fetch("/api/admin/backups/export", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `superwarrior30_full_backup_${new Date().toISOString().split("T")[0]}.json`;

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Full system JSON backup downloaded.", { id: "backup-dl" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download JSON backup.", { id: "backup-dl" });
    } finally {
      setIsDownloadingJson(false);
    }
  };

  // 3. Download Excel (.xlsx) Backup
  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      toast.loading("Generating Multi-Sheet Excel backup...", { id: "excel-dl" });
      const res = await fetch("/api/admin/backups/export-excel", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `superwarrior30_excel_backup_${new Date().toISOString().split("T")[0]}.xlsx`;

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Multi-sheet Excel backup downloaded.", { id: "excel-dl" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download Excel backup.", { id: "excel-dl" });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // 4. Handle File Drop / Select (.json or .xlsx)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".json") && !lowerName.endsWith(".xlsx")) {
      toast.error("Unsupported file format: Please upload a .json or .xlsx backup file.");
      return;
    }

    try {
      if (lowerName.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        const summary = parsed.summary || {
          users: parsed.data?.users?.length || parsed.metrics?.usersCount || 0,
          courses: parsed.data?.courses?.length || parsed.metrics?.coursesCount || 0,
          orders: parsed.data?.orders?.length || parsed.metrics?.ordersCount || 0,
          enrollments: parsed.data?.courseEnrollments?.length || 0,
          settings: parsed.data?.siteSettings?.length || parsed.metrics?.settingsCount || 0,
        };

        setSelectedBackup({
          file,
          fileType: "json",
          fileName: file.name,
          fileSize: file.size,
          summary,
          payload: parsed,
        });

        toast.success(`Loaded JSON backup: ${file.name}`);
      } else if (lowerName.endsWith(".xlsx")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });

        const rawSheets: Record<string, any[]> = {};
        for (const sheetName of wb.SheetNames) {
          rawSheets[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        }

        const summary = {
          users: rawSheets["Users"]?.length || 0,
          courses: rawSheets["Courses"]?.length || 0,
          orders: rawSheets["Orders"]?.length || 0,
          enrollments: rawSheets["Enrollments"]?.length || 0,
          settings: rawSheets["Settings"]?.length || 0,
        };

        setSelectedBackup({
          file,
          fileType: "xlsx",
          fileName: file.name,
          fileSize: file.size,
          summary,
          payload: { data: rawSheets },
        });

        toast.success(`Loaded Excel backup: ${file.name} (${wb.SheetNames.length} sheets)`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to parse file: " + (err.message || "Unknown error"));
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedBackup(null);
    setRestoreResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 5. Execute Restore
  const handleExecuteRestore = async () => {
    if (!selectedBackup) return;

    setShowConfirmModal(false);
    setIsRestoring(true);
    setRestoreResults(null);

    const toastId = toast.loading(
      restoreMode === "clean"
        ? "Wiping old data & restoring clean database state..."
        : "Merging and upserting backup records into database..."
    );

    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: selectedBackup.payload,
          options: {
            mode: restoreMode,
            preserveCurrentAdmin: true,
            includeTestData: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Database restore failed on server.");
      }

      toast.success(data.message || "Database restoration completed successfully!", { id: toastId });
      setRestoreResults(data.restoredCounts || null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to restore database from backup.", { id: toastId });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. Database Health & Table Counts Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Database Storage &amp; Health</h2>
              <p className="text-xs text-muted-foreground">
                Live statistics and table counts across your PostgreSQL production database.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
            <Activity className="h-3.5 w-3.5" /> Healthy
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Users / Students
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{stats.usersCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Courses
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{stats.coursesCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Orders
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{stats.ordersCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" /> Settings
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{stats.settingsCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Cards (Export Locally vs Restore/Populate) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: Export & Download Backup Locally */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Download className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-foreground">Export &amp; Download Backup Locally</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Generate a snapshot of your entire database right now. Download it in{" "}
                <strong className="text-foreground">JSON</strong> (for exact system restore) or{" "}
                <strong className="text-foreground">Excel (.xlsx)</strong> (for human review and spreadsheets).
              </p>
            </div>

            {/* Sub-item 1: Full System JSON */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-foreground">Full System JSON (.json)</p>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-500/30 uppercase">
                      Recommended for Restore
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Includes all 7+ tables with relations, passwords, decimals, and timestamps.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={isDownloadingJson}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingJson ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download JSON
              </button>
            </div>

            {/* Sub-item 2: Multi-Sheet Excel */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-foreground">Multi-Sheet Excel (.xlsx)</p>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30 uppercase">
                      Human-Readable
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    7 Worksheets: Users, Courses, Curriculum, Orders, Enrollments, Wallets, Settings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isDownloadingExcel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Excel
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              Export snapshot is generated securely with Operator credentials:{" "}
              <span className="font-semibold text-foreground">{operatorEmail}</span>
            </p>
          </div>
        </div>

        {/* RIGHT CARD: Restore / Populate New Database */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Upload className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-foreground">Restore / Populate New Database</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Upload a previously exported <code className="text-foreground font-mono">.json</code> or{" "}
                <code className="text-foreground font-mono">.xlsx</code> backup file to restore or populate your database.
              </p>
            </div>

            {/* Restoration Mode Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">Restoration Mode:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Clean & Restore Mode */}
                <button
                  type="button"
                  onClick={() => setRestoreMode("clean")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    restoreMode === "clean"
                      ? "border-rose-500/80 bg-rose-500/10 shadow-sm"
                      : "border-border/80 bg-background/50 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    Clean &amp; Restore
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                    Best for Fresh Database. Wipes conflicting records and restores exact state.
                  </p>
                </button>

                {/* Safe Merge / Upsert Mode */}
                <button
                  type="button"
                  onClick={() => setRestoreMode("safe")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    restoreMode === "safe"
                      ? "border-blue-500/80 bg-blue-500/10 shadow-sm"
                      : "border-border/80 bg-background/50 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Safe Merge / Upsert
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                    Updates existing and inserts new entries without clearing database.
                  </p>
                </button>
              </div>
            </div>

            {/* File Upload Box / Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json,.xlsx"
              className="hidden"
            />

            {!selectedBackup ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border/80 bg-background/40 hover:border-primary/60 hover:bg-primary/5 p-6 transition-all cursor-pointer text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Click to select or drag &amp; drop backup file
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports <span className="font-mono text-foreground">.json</span> and{" "}
                    <span className="font-mono text-foreground">.xlsx</span> files up to 50MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-primary/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
                      {selectedBackup.fileType.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                        {selectedBackup.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(selectedBackup.fileSize / 1024).toFixed(1)} KB &bull; Mode:{" "}
                        <span className={restoreMode === "clean" ? "text-rose-400 font-bold" : "text-blue-400 font-bold"}>
                          {restoreMode === "clean" ? "Clean & Restore" : "Safe Merge"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelectedFile}
                    disabled={isRestoring}
                    className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                    title="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Detected counts preview */}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded bg-background/80 p-2 border border-border">
                    <span className="text-muted-foreground block text-[10px]">Students / Users:</span>
                    <span className="font-bold text-foreground text-sm">{selectedBackup.summary.users || 0}</span>
                  </div>
                  <div className="rounded bg-background/80 p-2 border border-border">
                    <span className="text-muted-foreground block text-[10px]">Courses:</span>
                    <span className="font-bold text-foreground text-sm">{selectedBackup.summary.courses || 0}</span>
                  </div>
                  <div className="rounded bg-background/80 p-2 border border-border">
                    <span className="text-muted-foreground block text-[10px]">Orders:</span>
                    <span className="font-bold text-foreground text-sm">{selectedBackup.summary.orders || 0}</span>
                  </div>
                </div>

                {/* Restore Trigger Button */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClearSelectedFile}
                    disabled={isRestoring}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isRestoring}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold shadow-md transition-all cursor-pointer ${
                      restoreMode === "clean"
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Restoring...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" /> Start Restore
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Two-pass referral resolution ensures user network trees (&apos;sponsorId&apos; / referral closures) are linked
              without foreign key violations.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Post-Restore Results Card */}
      {restoreResults && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <span>Database Restoration Completed Successfully!</span>
          </div>
          <p className="text-xs text-muted-foreground">
            All tables have been synchronized with your PostgreSQL database. Breakdown of restored records:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Users / Students</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.users ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Courses</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.courses ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Curriculum (Modules &amp; Lessons)</span>
              <span className="font-bold text-foreground text-sm">
                {(restoreResults.modules ?? 0) + (restoreResults.lessons ?? 0)}
              </span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Orders</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.orders ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Enrollments</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.courseEnrollments ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Settings</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.siteSettings ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Wallets</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.wallets ?? 0}</span>
            </div>
            <div className="rounded bg-background/60 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px]">Coupons</span>
              <span className="font-bold text-foreground text-sm">{restoreResults.coupons ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Database Schema Sync Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Database Schema Verification &amp; Sync</h2>
            <p className="text-xs text-muted-foreground">
              Run real-time schema validation to verify that all database tables, columns, and indexes are in sync.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/60 p-4">
          <div>
            <p className="text-xs font-bold text-foreground">Run Automatic Schema Verification</p>
            <p className="text-[11px] text-muted-foreground">
              Executes idempotent column checks, index repairs, and schema alignments safely without data loss.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunSchemaSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run Schema Sync
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  restoreMode === "clean" ? "bg-rose-500/20 text-rose-400" : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {restoreMode === "clean" ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Confirm {restoreMode === "clean" ? "Clean & Restore" : "Safe Merge / Upsert"}
                </h3>
                <p className="text-xs text-muted-foreground">High-privilege database operation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {restoreMode === "clean" ? (
                <>
                  <span className="text-rose-400 font-bold block mb-1">
                    ⚠️ Clean mode selected: Conflicting records will be wiped before restoring.
                  </span>
                  Your currently logged-in Super Admin account (
                  <strong className="text-foreground">{operatorEmail}</strong>) is protected and will never be deleted.
                </>
              ) : (
                <>
                  Records will be merged and upserted into the database without deleting existing data.
                </>
              )}
            </p>

            <div className="rounded-xl border border-border bg-background/60 p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>File to restore:</span>
                <span className="font-bold text-foreground">{selectedBackup?.fileName}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Students / Users:</span>
                <span className="font-bold text-foreground">{selectedBackup?.summary.users || 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Courses:</span>
                <span className="font-bold text-foreground">{selectedBackup?.summary.courses || 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Restoration Mode:</span>
                <span className={restoreMode === "clean" ? "font-bold text-rose-400" : "font-bold text-blue-400"}>
                  {restoreMode === "clean" ? "Clean & Restore" : "Safe Merge / Upsert"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                  restoreMode === "clean" ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                Yes, Proceed With Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
