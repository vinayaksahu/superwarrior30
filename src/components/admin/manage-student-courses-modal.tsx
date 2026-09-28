"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminStudentEnrollmentsAction,
  adminAssignCourseAction,
  adminRevokeCourseAction,
} from "@/server/actions/admin-student.actions";
import {
  BookOpen,
  X,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface ManageStudentCoursesModalProps {
  studentId: string;
  studentName?: string | null;
  studentEmail: string;
  enrollmentsCount: number;
  size?: "xs" | "sm" | "default";
}

interface StudentCourseItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  isEnrolled: boolean;
  enrollmentId: string | null;
  enrolledAt: Date | null;
  progressPercentage: number;
}

export function ManageStudentCoursesModal({
  studentId,
  studentName,
  studentEmail,
  enrollmentsCount,
  size = "xs",
}: ManageStudentCoursesModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<StudentCourseItem[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAdminStudentEnrollmentsAction(studentId);
      setCourses(res.courses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load courses";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadData();
  };

  const handleClose = () => {
    setIsOpen(false);
    router.refresh();
  };

  const handleAssign = (courseId: string, courseTitle: string) => {
    setActiveCourseId(courseId);
    startTransition(async () => {
      const res = await adminAssignCourseAction(studentId, courseId);
      if (res.success) {
        toast.success(res.message);
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, isEnrolled: true, enrolledAt: new Date() }
              : c
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to assign course");
      }
      setActiveCourseId(null);
    });
  };

  const handleRevoke = (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Revoke access to "${courseTitle}" for ${studentName || studentEmail}?`)) {
      return;
    }

    setActiveCourseId(courseId);
    startTransition(async () => {
      const res = await adminRevokeCourseAction(studentId, courseId);
      if (res.success) {
        toast.success(res.message);
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, isEnrolled: false, enrolledAt: null }
              : c
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to revoke course access");
      }
      setActiveCourseId(null);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          size === "xs"
            ? "inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            : "inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        }
        title={`Manage Courses for ${studentName || studentEmail}`}
      >
        <GraduationCap className="h-3 w-3" />
        <span>Courses ({enrollmentsCount})</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-bold text-foreground truncate">
                  Manage Courses & Enrollments
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {studentName || "Student"} • {studentEmail}
                </p>
              </div>
            </div>

            {/* Course List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {loading ? (
                <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Loading course enrollments...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No courses found in platform.
                </div>
              ) : (
                courses.map((course) => {
                  const isActionLoading = isPending && activeCourseId === course.id;

                  return (
                    <div
                      key={course.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs gap-3 transition-colors ${
                        course.isEnrolled
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border/70 bg-background/50 hover:bg-muted/10"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground truncate">{course.title}</p>
                          {course.isEnrolled ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              Enrolled
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                              Not Enrolled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            {course.price ? `₹${course.price}` : "Free"}
                          </span>
                          {course.isEnrolled && course.enrolledAt && (
                            <span>
                              Enrolled:{" "}
                              {new Date(course.enrolledAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {course.isEnrolled ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRevoke(course.id, course.title)}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleAssign(course.id, course.title)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            <span>Assign Access</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border flex justify-end shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
