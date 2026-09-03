import { cn } from "@/lib/utils";

interface TestUserBadgeProps {
  isTestData?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function TestUserBadge(_props: TestUserBadgeProps) {
  // Permanently disabled: physical dual database architecture replaces inline badges
  return null;
}
