import type { Metadata } from "next";
import { getCourseByIdAction } from "@/server/actions/course.actions";
import { CourseForm } from "@/components/admin/course-form";
import { CourseBuilder } from "@/components/admin/course-builder";
import { requireAdmin } from "@/server/dal/auth";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Course",
};

export default async function AdminEditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let course;
  try {
    course = await getCourseByIdAction(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-16">
      {/* 1. Course Details Section */}
      <section>
        <CourseForm
          isEdit
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            shortDescription: course.shortDescription,
            fullDescription: course.fullDescription,
            thumbnailKey: course.thumbnailKey,
            price: course.price.toString(),
            compareAtPrice: course.compareAtPrice?.toString() || null,
            status: course.status,
            difficulty: course.difficulty,
            isFeatured: course.isFeatured,
            isReferralEligible: course.isReferralEligible,
          }}
        />
      </section>

      <hr className="border-border" />

      {/* 2. Course Curriculum Builder Section */}
      <section>
        <CourseBuilder
          courseId={course.id}
          modules={course.modules.map((m) => ({
            id: m.id,
            courseId: m.courseId,
            title: m.title,
            position: m.position,
            isPublished: m.isPublished,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              moduleId: l.moduleId,
              title: l.title,
              slug: l.slug,
              position: l.position,
              contentType: l.contentType,
              videoKey: l.videoKey,
              pdfKey: l.pdfKey,
              textContent: l.textContent,
              durationSec: l.durationSec,
              isFreePreview: l.isFreePreview,
              isPublished: l.isPublished,
            })),
          }))}
        />
      </section>
    </div>
  );
}
