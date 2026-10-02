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
  ShieldCheck,
  Zap,
  Users,
  BookOpen,
  ShoppingBag,
  Sliders,
  Wallet,
  X,
  FileCheck,
  Info,
} from "lucide-react";
import { triggerDatabaseSyncAction } from "@/server/actions/admin.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
}

interface ParsedBackupFile {
  file: File;
  version: string;
  platform: string;
  exportedAt: string;
  summary: {
    users?: number;
    students?: number;
    admins?: number;
    courses?: number;
    modules?: number;
    lessons?: number;
    orders?: number;
    courseEnrollments?: number;
    siteSettings?: number;
    wallets?: number;
    coupons?: number;
    [key: string]: any;
  };
  payload: any;
}

export function AdminBackupsClient({ stats }: AdminBackupsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [isExportingMeta, setIsExportingMeta] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [selectedBackup, setSelectedBackup] = useState<ParsedBackupFile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreResults, setRestoreResults] = useState<Record<string, number> | null>(null);

  // 1. Run Schema Sync
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

  // 2. Download Full Database Backup (.json)
  const handleDownloadFullBackup = async () => {
    setIsExportingFull(true);
    try {
      toast.loading("Generating full database backup snapshot...", { id: "backup-dl" });
      const res = await fetch("/api/admin/backups/export", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with ${res.status}`);
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

      toast.success("Full database backup downloaded successfully!", { id: "backup-dl" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download full database backup.", { id: "backup-dl" });
    } finally {
      setIsExportingFull(false);
    }
  };

  // 3. Download Metadata Snapshot (.json)
  const handleExportMetadata = () => {
    setIsExportingMeta(true);
    try {
      const backupData = {
        platform: "SuperWarrior30 LMS",
        version: "2.0.0",
        exportTimestamp: new Date().toISOString(),
        metrics: stats,
        systemEnvironment: "Production",
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `superwarrior30_backup_meta_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success("System metadata snapshot downloaded.");
    } catch (err: any) {
      toast.error("Failed to generate metadata snapshot.");
    } finally {
      setIsExportingMeta(false);
    }
  };

  // 4. Handle Backup File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file type: Please select a valid .json backup file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.data && !parsed.metrics) {
          toast.error("Unrecognized backup format: Missing database payload.");
          return;
        }

        const summary = parsed.summary || {
          users: parsed.data?.users?.length || parsed.metrics?.usersCount || 0,
          courses: parsed.data?.courses?.length || parsed.metrics?.coursesCount || 0,
          orders: parsed.data?.orders?.length || parsed.metrics?.ordersCount || 0,
          courseEnrollments: parsed.data?.courseEnrollments?.length || 0,
          siteSettings: parsed.data?.siteSettings?.length || parsed.metrics?.settingsCount || 0,
          wallets: parsed.data?.wallets?.length || 0,
        };

        setSelectedBackup({
          file,
          version: parsed.version || "1.0.0",
          platform: parsed.platform || "SuperWarrior30 LMS",
          exportedAt: parsed.exportedAt || parsed.exportTimestamp || new Date().toISOString(),
          summary,
          payload: parsed,
        });

        toast.success(`Backup file loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        toast.error("Corrupted JSON file: " + (err.message || "Failed to parse file."));
      }
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setSelectedBackup(null);
    setRestoreResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 5. Execute 1-Click Database Restore
  const handleExecuteRestore = async () => {
    if (!selectedBackup) return;

    setShowConfirmModal(false);
    setIsRestoring(true);
    setRestoreResults(null);

    const toastId = toast.loading("Restoring database tables... Please do not close this window.");

    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: selectedBackup.payload,
          options: {
            preserveCurrentAdmin: true,
            includeTestData: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Database restore failed on server.");
      }

      toast.success("Database restored successfully!", { id: toastId });
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
    <div className="space-y-6 max-w-4xl">
      {/* 1. Database Health & Table Counts */}
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
              <Sliders className="h-3.5 w-3.5 text-primary" /> System Settings
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{stats.settingsCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Full Database Backup & Snapshot Export */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Backup &amp; Snapshot Export</h2>
            <p className="text-xs text-muted-foreground">
              Generate structured JSON snapshots and complete backups of your entire system and student data.
            </p>
          </div>
        </div>

        {/* Option A: Full Database Backup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
              JSON
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">Download Full Database Backup</p>
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary border border-primary/30 uppercase">
                  Complete Data
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exports all students (passwords preserved), curriculum, orders, enrollments, settings, and wallets.
                Use this to safely migrate to a new Neon database at any time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadFullBackup}
            disabled={isExportingFull}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isExportingFull ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download Backup (.json)
          </button>
        </div>

        {/* Option B: Metadata Snapshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/60 p-4">
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Download Metadata Snapshot</p>
              <p className="text-[11px] text-muted-foreground">
                Export lightweight table counts and system metrics snapshot.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportMetadata}
            disabled={isExportingMeta}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isExportingMeta ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Metadata Snapshot
          </button>
        </div>
      </div>

      {/* 3. 1-Click Database Restore / Upload */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Restore Database from Backup (.json)</h2>
              <p className="text-xs text-muted-foreground">
                Migrate or restore students, courses, settings, and orders into this database in 1-click.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
            <Zap className="h-3.5 w-3.5" /> 1-Click Restore
          </span>
        </div>

        {/* Upload Box */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {!selectedBackup ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-background/40 hover:border-primary/60 hover:bg-primary/5 p-8 transition-all cursor-pointer text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Click to select or drop your <span className="text-primary font-mono">.json</span> backup file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a previously downloaded <code className="text-foreground">superwarrior30_full_backup_*.json</code> file.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-start justify-between gap-3 border-b border-primary/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{selectedBackup.file.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    Size: {(selectedBackup.file.size / 1024).toFixed(1)} KB &bull; Exported:{" "}
                    {new Date(selectedBackup.exportedAt).toLocaleDateString()} at{" "}
                    {new Date(selectedBackup.exportedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearFile}
                disabled={isRestoring}
                className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                title="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content summary grid */}
            <div>
              <p className="text-xs font-bold text-foreground mb-2">Detected Data in Backup File:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                  <span className="text-muted-foreground font-medium">Students / Users</span>
                  <p className="text-base font-black text-foreground mt-0.5">
                    {selectedBackup.summary.students ?? selectedBackup.summary.users ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                  <span className="text-muted-foreground font-medium">Courses</span>
                  <p className="text-base font-black text-foreground mt-0.5">
                    {selectedBackup.summary.courses ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                  <span className="text-muted-foreground font-medium">Orders</span>
                  <p className="text-base font-black text-foreground mt-0.5">
                    {selectedBackup.summary.orders ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                  <span className="text-muted-foreground font-medium">Enrollments</span>
                  <p className="text-base font-black text-foreground mt-0.5">
                    {selectedBackup.summary.courseEnrollments ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Safeguard banner */}
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Super Admin Safeguard:</span> Your current Super Admin account credentials
                will remain active and untouched, so you will not be logged out. Existing records will be safely updated
                without duplicates.
              </div>
            </div>

            {/* Restore Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearFile}
                disabled={isRestoring}
                className="w-full sm:w-auto rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isRestoring}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Restoring Database...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Start 1-Click Database Restore
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Restore Result Report */}
        {restoreResults && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Database Restore Completed Successfully!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All records have been synchronized into your PostgreSQL database. Here is what was restored:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Users / Students:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.users ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Courses:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.courses ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Modules &amp; Lessons:</span>{" "}
                <span className="font-bold text-foreground">
                  {(restoreResults.modules ?? 0) + (restoreResults.lessons ?? 0)}
                </span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Orders:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.orders ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Enrollments:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.courseEnrollments ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Settings:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.siteSettings ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Wallets:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.wallets ?? 0}</span>
              </div>
              <div className="rounded bg-background/60 p-2 border border-border">
                <span className="text-muted-foreground">Coupons:</span>{" "}
                <span className="font-bold text-foreground">{restoreResults.coupons ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Schema Sync & Database Maintenance */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Database Restore</h3>
                <p className="text-xs text-muted-foreground">High-privilege operation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You are about to restore data from{" "}
              <span className="font-semibold text-foreground">{selectedBackup?.file.name}</span>. All students,
              curriculum, settings, and orders will be synchronized into your database.
            </p>

            <div className="rounded-xl border border-border bg-background/60 p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Students / Users to sync:</span>
                <span className="font-bold text-foreground">
                  {selectedBackup?.summary.students ?? selectedBackup?.summary.users ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Courses to sync:</span>
                <span className="font-bold text-foreground">{selectedBackup?.summary.courses ?? 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Orders to sync:</span>
                <span className="font-bold text-foreground">{selectedBackup?.summary.orders ?? 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Current Super Admin:</span>
                <span className="font-bold text-emerald-400">Preserved (safe)</span>
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
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                Yes, Restore Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
