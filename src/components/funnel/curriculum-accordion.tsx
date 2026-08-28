"use client";

import { useState } from "react";
import { ChevronDown, Video, FileText, Layers } from "lucide-react";

interface ModuleData {
  id: string;
  title: string;
  position: number;
  lessons: { id: string; title: string; contentType: string; durationSec: number }[];
}

const FALLBACK_MODULES = [
  { position: 1, title: "Trading Foundation", lessons: [] },
  { position: 2, title: "Market Trend", lessons: [] },
  { position: 3, title: "Support & Resistance", lessons: [] },
  { position: 4, title: "Liquidity Trading", lessons: [] },
  { position: 5, title: "Candlestick Confirmation", lessons: [] },
  { position: 6, title: "Entry & Exit Strategy", lessons: [] },
  { position: 7, title: "Risk Management", lessons: [] },
  { position: 8, title: "Live Market Practice", lessons: [] },
  { position: 9, title: "Forex, Crypto & Gold Analysis", lessons: [] },
  { position: 10, title: "Trading Psychology", lessons: [] },
];

interface CurriculumAccordionProps {
  modules?: ModuleData[];
}

export function CurriculumAccordion({ modules }: CurriculumAccordionProps) {
  const [openId, setOpenId] = useState<string | number | null>(null);

  const displayModules = modules && modules.length > 0
    ? modules
    : FALLBACK_MODULES.map((m, i) => ({ ...m, id: `fallback-${i}` }));

  const totalLessons = displayModules.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  );

  return (
    <section id="curriculum" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            Course Curriculum
          </h2>
          <p className="text-sm text-muted-foreground">
            {displayModules.length} Modules
            {totalLessons > 0 && <> • {totalLessons} Lessons</>}
            {" "}— Structured path from basics to professional execution
          </p>
        </div>

        <div className="space-y-3">
          {displayModules.map((module) => {
            const key = module.id || module.position;
            const isOpen = openId === key;
            const hasLessons = module.lessons && module.lessons.length > 0;

            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all hover:border-primary/30"
              >
                <button
                  type="button"
                  onClick={() => hasLessons && setOpenId(isOpen ? null : key)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors ${hasLessons ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {String(module.position).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {module.title}
                      </h3>
                      {hasLessons && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {module.lessons.length} lessons
                        </p>
                      )}
                    </div>
                  </div>

                  {hasLessons && (
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {isOpen && hasLessons && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between px-5 py-3 text-sm"
                      >
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          {lesson.contentType === "VIDEO" ? (
                            <Video className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span className="text-foreground text-xs font-medium">
                            {lesson.title}
                          </span>
                        </div>
                        {lesson.durationSec > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {Math.round(lesson.durationSec / 60)} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
