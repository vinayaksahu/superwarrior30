import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getEnrolledCourseContentAction } from "@/server/actions/enrollment.actions";
import { CourseSidebar } from "@/components/learning/course-sidebar";
import { LessonContentViewer } from "@/components/learning/lesson-content-viewer";

interface CourseLearnLessonProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

export async function generateMetadata({
  params,
}: CourseLearnLessonProps): Promise<Metadata> {
  const { courseSlug } = await params;
  return {
    title: `Learning | ${courseSlug.replace(/-/g, " ")} | Super Warrior 30`,
  };
}

export default async function CourseLearnLessonPage({
  params,
}: CourseLearnLessonProps) {
  const { courseSlug, lessonId } = await params;

  let contentData;
  try {
    contentData = await getEnrolledCourseContentAction(courseSlug);
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

  const isCompleted = progressMap[lessonId]?.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        <CourseSidebar
          courseSlug={course.slug}
          courseTitle={course.title}
          activeLessonId={lessonId}
          modules={course.modules}
          progressMap={progressMap}
          progressPercentage={stats.progressPercentage}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <LessonContentViewer
            courseSlug={course.slug}
            lessonId={lessonId}
            isCompleted={isCompleted}
            prevLessonId={prevLessonId}
            nextLessonId={nextLessonId}
          />
        </main>
      </div>
    </div>
  );
}
