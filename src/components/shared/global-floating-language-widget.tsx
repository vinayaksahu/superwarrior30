"use client";

import { LanguageSwitcher } from "@/components/shared/language-switcher";

export function GlobalFloatingLanguageWidget() {
  return (
    <aside
      aria-label="Language selector"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 print:hidden"
    >
      <LanguageSwitcher variant="floating" />
    </aside>
  );
}
