"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  subLabel?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "hi", name: "Hindi", nativeName: "हिंदी", subLabel: "Hinglish (English Mix)" },
  { code: "en", name: "English", nativeName: "English", subLabel: "Default" },
  { code: "bn", name: "Bangla", nativeName: "বাংলা", subLabel: "Bengali" },
  { code: "ur", name: "Urdu", nativeName: "اردو", subLabel: "Urdu" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", subLabel: "Tamil" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", subLabel: "Telugu" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", subLabel: "Marathi" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", subLabel: "Gujarati" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", subLabel: "Punjabi" },
];

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (langCode: string) => void;
  languages: LanguageOption[];
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: "hi",
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
  isLoaded: false,
});

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>("hi");
  const [isLoaded, setIsLoaded] = useState(false);

  // Read saved language or cookies on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialLang = "hi"; // Default to Hindi (Hinglish) as requested
    const saved = localStorage.getItem("app_language");

    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      initialLang = saved;
    } else {
      // Check googtrans cookie if present
      const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
      if (match && match[1]) {
        const parts = match[1].split("/");
        const lang = parts[parts.length - 1];
        if (SUPPORTED_LANGUAGES.some((l) => l.code === lang)) {
          initialLang = lang;
        }
      }
    }

    setCurrentLanguageState(initialLang);
    setIsLoaded(true);

    // Set direction for Urdu
    if (initialLang === "ur") {
      document.documentElement.setAttribute("dir", "rtl");
    } else {
      document.documentElement.removeAttribute("dir");
    }
  }, []);

  // Initialize Google Translate Element
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        try {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,hi,bn,ur,ta,te,mr,gu,pa",
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            "google_translate_element"
          );
        } catch (e) {
          console.warn("Google Translate init error:", e);
        }
      }
    };

    // Load Google Translate script if not already added
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Function to change language
  const setLanguage = useCallback((langCode: string) => {
    if (typeof window === "undefined") return;
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) return;

    setCurrentLanguageState(langCode);
    localStorage.setItem("app_language", langCode);

    // Manage RTL for Urdu
    if (langCode === "ur") {
      document.documentElement.setAttribute("dir", "rtl");
    } else {
      document.documentElement.removeAttribute("dir");
    }

    const host = window.location.hostname;
    const cookieVal = `/auto/${langCode}`;

    // Set Google Translate Cookie
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${host};`;
    if (host.includes(".")) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=.${host};`;
    }

    // Attempt to trigger select element in DOM
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
    } else {
      // Reload page cleanly to re-hydrate with the translated cookie
      window.location.reload();
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
        isLoaded,
      }}
    >
      {children}
      {/* Hidden container required by Google Translate */}
      <div id="google_translate_element" className="hidden pointer-events-none" aria-hidden="true" />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
