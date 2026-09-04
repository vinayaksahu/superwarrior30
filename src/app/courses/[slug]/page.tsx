import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCourseBySlugAction } from "@/server/actions/course.actions";
import { checkUserEnrollment } from "@/server/actions/enrollment.actions";
import { FreePreviewButton } from "@/components/courses/free-preview-modal";
import { ExpandableDescription } from "@/components/courses/expandable-description";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { resolvePublicHomepageEnvironment, withEnvironmentContext } from "@/lib/env-context";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  ShieldCheck,
  Video,
  FileText,
  AlignLeft,
  Lock,
  ArrowLeft,
  Share2,
  PlayCircle,
} from "lucide-react";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pageEnv = await resolvePublicHomepageEnvironment();
  const course = await withEnvironmentContext(pageEnv, async () => {
    return await getPublicCourseBySlugAction(slug);
  });
  if (!course) return { title: "Course Not Found" };

  return {
    title: `${course.title} | Super Warrior 30`,
    description:
      course.shortDescription ||
      `Master professional trading with the ${course.title} course on Super Warrior 30.`,
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;
  const pageEnv = await resolvePublicHomepageEnvironment();
  const course = await withEnvironmentContext(pageEnv, async () => {
    return await getPublicCourseBySlugAction(slug);
  });

  if (!course) {
    notFound();
  }

  const isEnrolled = await withEnvironmentContext(pageEnv, async () => {
    return await checkUserEnrollment(course.id);
  });

  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );
  const discountPct = course.compareAtPrice
    ? Math.round(
        ((Number(course.compareAtPrice) - Number(course.price)) /
          Number(course.compareAtPrice)) *
          100
      )
    : null;

  return (
    <div className="min-h-screen bg-background pb-24 w-full max-w-full overflow-x-hidden">
      <PublicNavbar isTestMode={pageEnv === "TEST"} />
      {/* Top Breadcrumb */}
      <div className="border-b border-border/40 bg-muted/20 py-4">
        <div className="container mx-auto px-4 max-w-6xl w-full min-w-0">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Courses
          </Link>
        </div>
      </div>

      {/* Main Unified Course Page Content */}
      <div className="container mx-auto px-4 max-w-6xl py-6 sm:py-8 md:py-10 w-full min-w-0">
        <div className="grid gap-8 lg:gap-10 lg:grid-cols-3 items-start w-full min-w-0">
          {/* Left Main Column: Hero info, About Course, Curriculum */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0 max-w-full">
            {/* Header / Intro */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  {course.difficulty} Level
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Updated Recently
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground break-words">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed break-words">
                {course.shortDescription ||
                  "Master the market dynamics, chart structures, trade execution, and risk control protocols used by professional traders."}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-1 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span>{course.modules.length} Modules</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span>{totalLessons} Lessons</span>
                </div>
                {course.totalDuration > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>{Math.round(course.totalDuration / 3600)} Hours Content</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description: About This Course */}
            {course.fullDescription && (
              <section className="space-y-4 min-w-0 max-w-full">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-primary shrink-0" />
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    About This Course
                  </h2>
                </div>
                <ExpandableDescription content={course.fullDescription} />
              </section>
            )}

            {/* Curriculum Syllabus */}
            <section className="space-y-4 min-w-0 max-w-full">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-6 w-1 rounded-full bg-primary shrink-0" />
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
                    Course Curriculum
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground font-medium shrink-0">
                  {course.modules.length} modules • {totalLessons} lessons
                </span>
              </div>

              <div className="space-y-3 min-w-0 max-w-full">
                {course.modules.map((module) => (
                  <div
                    key={module.id}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-sm min-w-0"
                  >
                    <div className="border-b border-border bg-muted/40 px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                          {module.position}
                        </span>
                        <h3 className="font-semibold text-foreground text-xs sm:text-base truncate">
                          {module.title}
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium shrink-0">
                        {module.lessons.length} lessons
                      </span>
                    </div>

                    <div className="divide-y divide-border/50 min-w-0">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm transition-colors hover:bg-muted/20 gap-2 min-w-0"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2 sm:mr-3">
                            {lesson.contentType === "VIDEO" ? (
                              <Video className="h-4 w-4 text-primary shrink-0" />
                            ) : lesson.contentType === "PDF" ? (
                              <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <AlignLeft className="h-4 w-4 text-sky-500 shrink-0" />
                            )}

                            <span className="font-medium text-foreground truncate min-w-0">
                              {lesson.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {!lesson.isFreePreview && lesson.durationSec >= 60 && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {Math.round(lesson.durationSec / 60)} min
                              </span>
                            )}

                            {lesson.isFreePreview ? (
                              <FreePreviewButton
                                lessonId={lesson.id}
                                lessonTitle={lesson.title}
                                contentType={lesson.contentType}
                                courseId={course.id}
                                courseSlug={course.slug}
                                coursePrice={course.price ? Number(course.price) : undefined}
                                durationSec={lesson.durationSec}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                                <Lock className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Pricing / Enrollment Sticky Card */}
          <div className="lg:col-span-1 min-w-0 max-w-full">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-6 overflow-hidden max-w-full">
              {(course.thumbnailUrl || course.thumbnailCdnUrl) && (
                <div className="relative -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 aspect-video overflow-hidden border-b border-border bg-muted">
                  <img
                    src={course.thumbnailUrl || course.thumbnailCdnUrl || ""}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lifetime Access
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatCurrency(course.price.toString())}
                  </span>
                  {course.compareAtPrice && (
                    <span className="text-base text-muted-foreground line-through">
                      {formatCurrency(course.compareAtPrice.toString())}
                    </span>
                  )}
                  {discountPct && discountPct > 0 && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-500">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>
              </div>

              {isEnrolled ? (
                <Link
                  href={`/learn/${course.slug}`}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  <PlayCircle className="h-5 w-5" />
                  Start / Continue Learning
                </Link>
              ) : (
                <Link
                  href={`/checkout/${course.id}`}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.01]"
                >
                  Enroll Now
                </Link>
              )}

              <div className="space-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Instant access to all modules & future updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Downloadable PDF cheat sheets & resources</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>High-definition streaming on mobile & desktop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
