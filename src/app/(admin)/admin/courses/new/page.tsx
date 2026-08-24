import type { Metadata } from "next";
import { CourseForm } from "@/components/admin/course-form";
import { requireAdmin } from "@/server/dal/auth";

export const metadata: Metadata = {
  title: "New Course",
};

export default async function AdminNewCoursePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CourseForm />
    </div>
  );
}
