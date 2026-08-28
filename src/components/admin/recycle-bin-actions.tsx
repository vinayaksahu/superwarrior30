"use client";

import { useState, useTransition } from "react";
import {
  restoreCourseAction,
  permanentDeleteCourseAction,
} from "@/server/actions/course.actions";
import { RotateCcw, Trash2, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface RecycleBinActionsProps {
  courseId: string;
  courseTitle: string;
  enrollmentsCount: number;
}

export function RecycleBinActions({
  courseId,
  courseTitle,
  enrollmentsCount,
}: RecycleBinActionsProps) {
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isPermanentOpen, setIsPermanentOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      try {
        const res = await restoreCourseAction(courseId);
        if (!res.success) {
          toast.error(res.message || "Failed to restore course");
        } else {
          toast.success(res.message || "Course restored successfully");
          setIsRestoreOpen(false);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to restore course";
        toast.error(message);
      }
    });
  };

  const handlePermanentDelete = () => {
    startTransition(async () => {
      try {
        const res = await permanentDeleteCourseAction(courseId, confirmInput);
        if (!res.success) {
          toast.error(res.message || "Failed to permanently delete course");
        } else {
          toast.success(res.message || "Course permanently deleted");
          setIsPermanentOpen(false);
          setConfirmInput("");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to permanently delete course";
        toast.error(message);
      }
    });
  };

  const isConfirmed =
    confirmInput.trim().toLowerCase() === courseTitle.trim().toLowerCase() ||
    confirmInput.trim() === "DELETE";

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {/* Restore Button */}
        <button
          onClick={() => setIsRestoreOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
          title="Restore course to active list"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>

        {/* Permanent Delete Button */}
        <button
          onClick={() => {
            setConfirmInput("");
            setIsPermanentOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 hover:text-destructive-foreground"
          title="Permanently delete course"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Permanently
        </button>
      </div>

      {/* Restore Confirmation Dialog */}
      {isRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Restore Course
                </h3>
                <p className="text-xs text-muted-foreground">
                  Return course to active catalog
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Are you sure you want to restore{" "}
              <span className="font-semibold text-foreground">
                &quot;{courseTitle}&quot;
              </span>
              ?
            </p>

            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300/90">
              ✓ All original modules, lessons, video/PDF links, active
              enrollments ({enrollmentsCount}), and student completion records
              will be completely preserved and functional.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsRestoreOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRestore}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Restoring..." : "Restore Course"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Strong Confirmation Dialog */}
      {isPermanentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-destructive">
                  Permanently Delete Course?
                </h3>
                <p className="text-xs text-muted-foreground">
                  IRREVERSIBLE ACTION — SUPER_ADMIN ONLY
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground/90 space-y-1">
              <p className="font-semibold text-destructive">
                ⚠️ Warning: This action CANNOT be undone!
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>The course record, modules, and lessons will be removed.</li>
                <li>Associated Bunny Stream videos & Bunny Storage files will be cleaned up.</li>
                <li>{enrollmentsCount} active enrollment record(s) will be cleared.</li>
                <li>Past financial Order records are preserved for audit history.</li>
              </ul>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                To confirm permanent deletion, type the exact course title{" "}
                <span className="font-semibold text-foreground select-all">
                  &quot;{courseTitle}&quot;
                </span>{" "}
                or <span className="font-semibold text-foreground">DELETE</span>:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type course title or DELETE to confirm"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsPermanentOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isConfirmed || isPending}
                onClick={handlePermanentDelete}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Deleting Permanently..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}