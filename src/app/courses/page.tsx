import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCoursesAction } from "@/server/actions/course.actions";
import { formatCurrency } from "@/lib/utils";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { Search, Clock, BookOpen, Layers, Star, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trading Courses",
  description: "Explore our comprehensive library of professional stock market and derivatives trading courses.",
};

export default async function PublicCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; difficulty?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const difficulty = params.difficulty || "all";

  const courses = await getPublicCoursesAction({ search, difficulty });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PublicNavbar />
      {/* Top Banner / Header */}
      <div className="border-b border-border/40 bg-muted/20 py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Trading Courses & Curricula
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Structured step-by-step masterclasses designed to transform beginners into confident, profitable traders.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <form className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Search by topic, pattern, or strategy..."
                className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Levels" },
                { id: "BEGINNER", label: "Beginner" },
                { id: "INTERMEDIATE", label: "Intermediate" },
                { id: "ADVANCED", label: "Advanced" },
              ].map(({ id, label }) => (
                <Link
                  key={id}
                  href={`/courses?difficulty=${id}${search ? `&search=${search}` : ""}`}
                  className={`inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium transition-colors ${
                    difficulty === id
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 max-w-6xl mt-12">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No courses found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {search
                ? "No matching courses found. Try searching with different keywords."
                : "Courses are currently being updated. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const totalLessons = course.modules.reduce(
                (sum, m) => sum + m._count.lessons,
                0
              );

              return (
                <div
                  key={course.id}
                  className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
                >
                  <div>
                    {/* Thumbnail Image or Gradient Box */}
                    <div className="relative aspect-video w-full bg-gradient-to-br from-muted/80 to-muted/30 border-b border-border/40 flex items-center justify-center text-center overflow-hidden">
                      {course.thumbnailCdnUrl ? (
                        <img
                          src={course.thumbnailCdnUrl}
                          alt={course.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="p-6">
                          <span className="text-xl font-bold tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                            {course.title}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary backdrop-blur-sm">
                          {course.difficulty}
                        </span>
                        {course.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 backdrop-blur-sm">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            Featured
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
                      </h3>

                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.shortDescription ||
                          "Master trading strategies, risk management, and market psychology with practical examples."}
                      </p>

                      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/40 pt-4">
                        <span className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          {course.modules.length} Modules
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          {totalLessons} Lessons
                        </span>
                        {course.totalDuration > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {Math.round(course.totalDuration / 3600)}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and CTA */}
                  <div className="border-t border-border/40 bg-muted/20 px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-foreground">
                          {formatCurrency(course.price.toString())}
                        </span>
                        {course.compareAtPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(course.compareAtPrice.toString())}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
