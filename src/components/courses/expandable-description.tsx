"use client";

import { useState } from "react";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableDescriptionProps {
  content: string;
  initialMaxHeight?: string;
}

export function ExpandableDescription({
  content,
  initialMaxHeight = "max-h-72",
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If content is very short, no need for Show More toggle
  const isLongContent = content.length > 350 || content.split("\n").length > 7;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-6 md:p-8 shadow-sm space-y-4 max-w-full overflow-hidden">
      <div
        className={cn(
          "relative transition-all duration-300 ease-in-out min-w-0 max-w-full",
          !isExpanded && isLongContent && cn(initialMaxHeight, "overflow-hidden")
        )}
      >
        <MarkdownContent content={content} />

        {/* Gradient fade overlay when collapsed */}
        {!isExpanded && isLongContent && (
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Show More / Show Less Toggle Button */}
      {isLongContent && (
        <div className="pt-2 border-t border-border/40 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs sm:text-sm font-bold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {isExpanded ? (
              <>
                Show Less
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show More
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
