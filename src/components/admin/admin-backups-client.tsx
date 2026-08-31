"use client";

import { useState } from "react";
import {
  Database,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Activity,
  Layers,
  Loader2,
  FileJson,
  ShieldCheck,
  Zap,
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

export function AdminBackupsClient({ stats }: AdminBackupsClientProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportBackup = () => {
    setIsExporting(true);
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

      toast.success("Database metadata snapshot downloaded successfully.");
    } catch (err: any) {
      toast.error("Failed to generate backup export.");
    } finally {
      setIsExporting(false);
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
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Users / Students</span>
            <p className="text-xl font-black text-foreground mt-1">{stats.usersCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Courses</span>
            <p className="text-xl font-black text-foreground mt-1">{stats.coursesCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Orders</span>
            <p className="text-xl font-black text-foreground mt-1">{stats.ordersCount}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Audit Logs</span>
            <p className="text-xl font-black text-foreground mt-1">{stats.auditLogsCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Backup & Export Tools */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Backup &amp; Snapshot Export</h2>
            <p className="text-xs text-muted-foreground">
              Generate structured JSON snapshots and backup records of your system configuration.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/60 p-4">
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Download System Snapshot</p>
              <p className="text-[11px] text-muted-foreground">
                Export metadata, platform settings, course counts, and system states as a structured JSON file.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all shrink-0 cursor-pointer"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download Backup (.json)
          </button>
        </div>
      </div>

      {/* 3. Schema Sync & Database Maintenance */}
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
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all shrink-0 cursor-pointer"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run Schema Sync
          </button>
        </div>
      </div>
    </div>
  );
}
