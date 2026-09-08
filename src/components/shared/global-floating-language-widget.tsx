"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export function GlobalFloatingLanguageWidget() {
  const pathname = usePathname();

  // Do not show floating widget on dashboard, admin, or checkout pages where it obstructs content/cards
  const isExcludedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/journal") ||
    pathname.startsWith("/homework") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/learn");

  if (isExcludedRoute) {
    return null;
  }

  return (
    <aside
      aria-label="Language selector"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 print:hidden"
    >
      <LanguageSwitcher variant="floating" />
    </aside>
  );
}
