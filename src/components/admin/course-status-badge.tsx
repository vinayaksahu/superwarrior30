import { cn } from "@/lib/utils";

interface CourseStatusBadgeProps {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  className?: string;
}

export function CourseStatusBadge({ status, className }: CourseStatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "DRAFT":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "ARCHIVED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        getBadgeStyle(),
        className
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
