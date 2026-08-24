import { redirect, notFound } from "next/navigation";
import { getEnrolledCourseContentAction } from "@/server/actions/enrollment.actions";

interface CourseLearnIndexProps {
  params: Promise<{ courseSlug: string }>;
}

export default async function CourseLearnIndexPage({
  params,
}: CourseLearnIndexProps) {
  const { courseSlug } = await params;

  let contentData;
  try {
    contentData = await getEnrolledCourseContentAction(courseSlug);
  } catch {
    redirect(`/courses/${courseSlug}`);
  }

  const { course, progressMap } = contentData;

  // Find all published lessons in order
  const allLessons: { id: string }[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      allLessons.push({ id: lesson.id });
    }
  }

  if (allLessons.length === 0) {
    redirect(`/courses/${courseSlug}`);
  }

  // Find first lesson that is NOT completed
  const firstIncompleteLesson = allLessons.find(
    (l) => progressMap[l.id]?.status !== "COMPLETED"
  );

  const targetLessonId = firstIncompleteLesson
    ? firstIncompleteLesson.id
    : allLessons[0].id;

  redirect(`/learn/${courseSlug}/${targetLessonId}`);
}
