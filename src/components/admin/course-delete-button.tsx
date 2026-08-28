"use client";

import { useState, useTransition } from "react";
import { softDeleteCourseAction } from "@/server/actions/course.actions";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CourseDeleteButtonProps {
  courseId: string;
  courseTitle: string;
  isSuperAdmin?: boolean;
  enrollmentsCount?: number;
}

export function CourseDeleteButton({
  courseId,
  courseTitle,
  isSuperAdmin = true,
  enrollmentsCount = 0,
}: CourseDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await softDeleteCourseAction(courseId);
        if (!res.success) {
          toast.error(res.message || "Failed to move course to Recycle Bin");
        } else {
          toast.success(res.message || "Course moved to Recycle Bin");
          setIsOpen(false);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to move course to Recycle Bin";
        toast.error(message);
      }
    });
  };

  if (!isSuperAdmin) {
    return (
      <button
        disabled
        title="Only SUPER_ADMIN can delete courses"
        className="rounded-md p-1.5 text-muted-foreground/30 cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500"
        title="Move to Recycle Bin"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Move to Recycle Bin
                </h3>
                <p className="text-xs text-muted-foreground">
                  Soft-delete protection
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Are you sure you want to move{" "}
              <span className="font-semibold text-foreground">
                &quot;{courseTitle}&quot;
              </span>{" "}
              to the Recycle Bin?
            </p>

            {enrollmentsCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                ⚠️ This course has{" "}
                <strong>{enrollmentsCount} active enrollment(s)</strong>.
                Student progress and enrollment records will be safely preserved,
                and the course can be restored at any time.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Moving..." : "Move to Recycle Bin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
