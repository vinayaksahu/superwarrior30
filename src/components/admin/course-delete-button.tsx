"use client";

import { useState, useTransition } from "react";
import { deleteCourseAction } from "@/server/actions/course.actions";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CourseDeleteButtonProps {
  courseId: string;
  courseTitle: string;
  hasEnrollments: boolean;
}

export function CourseDeleteButton({
  courseId,
  courseTitle,
  hasEnrollments,
}: CourseDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteCourseAction(courseId);
        if (!res.success) {
          toast.error(res.message || "Failed to delete course");
        } else {
          toast.success("Course deleted successfully");
          setIsOpen(false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete course";
        toast.error(message);
      }
    });
  };

  if (hasEnrollments) {
    return (
      <button
        disabled
        title="Cannot delete course with active enrollments"
        className="rounded-md p-1.5 text-muted-foreground/40 cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Delete course"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-semibold text-foreground">Delete Course</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{courseTitle}&quot;</span>? This will permanently delete all its modules, lessons, and uploaded files from storage. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
