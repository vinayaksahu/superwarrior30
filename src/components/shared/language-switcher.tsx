"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/components/shared/language-provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "header" | "floating" | "mobile";
  className?: string;
}

export function LanguageSwitcher({ variant = "header", className }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, isLoaded } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeOption = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === "header" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm backdrop-blur transition-all hover:bg-accent hover:border-primary/40 focus:outline-none cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Change Language / भाषा बदलें"
        >
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline-block max-w-[80px] truncate">
            {activeOption.nativeName}
          </span>
          <span className="sm:hidden uppercase text-[11px]">
            {activeOption.code}
          </span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      )}

      {variant === "mobile" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span>Language / भाषा: <strong className="text-primary">{activeOption.nativeName}</strong></span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      )}

      {variant === "floating" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 px-3 py-2 text-xs font-black text-foreground shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:border-primary hover:bg-card active:scale-95 cursor-pointer shadow-primary/10"
          aria-expanded={isOpen}
          title="Change Language / भाषा बदलें"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-extrabold tracking-wide">
            {activeOption.nativeName}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-64 rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150",
            variant === "floating" ? "bottom-full mb-2 left-0" : "right-0"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-primary" />
                Select Language
              </span>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                9 Languages
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer",
                    isSelected
                      ? "bg-primary/15 text-primary font-bold shadow-xs"
                      : "text-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                  role="menuitem"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      {lang.nativeName}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        ({lang.name})
                      </span>
                    </span>
                    {lang.subLabel && (
                      <span className="text-[10px] text-muted-foreground/80 font-normal">
                        {lang.subLabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
