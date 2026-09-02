import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getEnrolledCourseContentAction } from "@/server/actions/enrollment.actions";
import { resolvePublicHomepageEnvironment, withEnvironmentContext } from "@/lib/env-context";
import { CourseClassroomView } from "@/components/learning/course-classroom-view";

export const dynamic = "force-dynamic";

interface CourseLearnLessonProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

export async function generateMetadata({
  params,
}: CourseLearnLessonProps): Promise<Metadata> {
  const { courseSlug } = await params;
  return {
    title: `Learning | ${courseSlug.replace(/-/g, " ")} | Rahul Trade Warrior Academy`,
  };
}

export default async function CourseLearnLessonPage({
  params,
}: CourseLearnLessonProps) {
  const { courseSlug, lessonId } = await params;
  const pageEnv = await resolvePublicHomepageEnvironment();

  let contentData;
  try {
    contentData = await withEnvironmentContext(pageEnv, async () => {
      return await getEnrolledCourseContentAction(courseSlug);
    });
  } catch {
    redirect(`/courses/${courseSlug}`);
  }

  const { course, progressMap, stats } = contentData;

  // Flatten lessons to compute previous and next pointers
  const flatLessons: { id: string }[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      flatLessons.push({ id: lesson.id });
    }
  }

  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  if (currentIndex === -1) {
    notFound();
  }

  const prevLessonId = currentIndex > 0 ? flatLessons[currentIndex - 1].id : undefined;
  const nextLessonId =
    currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1].id : undefined;

  return (
    <div className="min-h-screen bg-background">
      <CourseClassroomView
        courseSlug={course.slug}
        courseTitle={course.title}
        activeLessonId={lessonId}
        modules={course.modules}
        initialProgressMap={progressMap}
        initialProgressPercentage={stats.progressPercentage}
        prevLessonId={prevLessonId}
        nextLessonId={nextLessonId}
      />
    </div>
  );
}
