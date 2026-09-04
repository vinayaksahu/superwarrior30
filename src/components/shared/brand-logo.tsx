import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  showText?: boolean;
  isTestMode?: boolean;
}

export function BrandLogo({
  className,
  size = "md",
  href = "/",
  showText = true,
  isTestMode = false,
}: BrandLogoProps) {
  const dimensions =
    size === "sm"
      ? { width: 32, height: 32, textClass: "text-xs font-bold", subClass: "text-[8px]" }
      : size === "lg"
      ? { width: 54, height: 54, textClass: "text-base sm:text-lg font-black", subClass: "text-[10px]" }
      : { width: 42, height: 42, textClass: "text-xs sm:text-base font-extrabold", subClass: "text-[9px]" };

  const content = (
    <div className={cn("flex items-center gap-2 sm:gap-3 min-w-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Rahul Trade Warrior Academy"
        width={dimensions.width}
        height={dimensions.height}
        className={cn(
          "rounded-full shadow-lg shadow-amber-500/10 object-contain border border-amber-500/40 bg-black shrink-0",
          size === "md" ? "w-8 h-8 sm:w-[42px] sm:h-[42px]" : ""
        )}
      />
      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("tracking-tight text-foreground truncate", dimensions.textClass)}>
              RAHUL <span className="text-amber-400">TRADE WARRIOR</span>
            </span>
            {isTestMode && (
              <span className="rounded-full border border-amber-500/50 bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-amber-400 shadow-sm animate-pulse shrink-0">
                TEST
              </span>
            )}
          </div>
          <span className={cn("font-bold tracking-widest text-muted-foreground uppercase hidden sm:block", dimensions.subClass)}>
            ACADEMY • LEARN | TRADE | EARN
          </span>
        </div>
      )}
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
