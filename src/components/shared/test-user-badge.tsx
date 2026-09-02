import { cn } from "@/lib/utils";

interface TestUserBadgeProps {
  isTestData?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function TestUserBadge({ isTestData, className, size = "xs" }: TestUserBadgeProps) {
  if (!isTestData) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-black tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 select-none shadow-xs shrink-0",
        size === "xs" && "px-1.5 py-0.5 text-[9px] leading-tight",
        size === "sm" && "px-2 py-0.5 text-[10px] leading-tight",
        size === "md" && "px-2.5 py-1 text-xs leading-normal",
        className
      )}
      title="Testing Environment Account"
    >
      TEST
    </span>
  );
}
