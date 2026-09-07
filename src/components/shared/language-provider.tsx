"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

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

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    nav_courses: "Courses",
    nav_testimonials: "Testimonials & Reviews",
    nav_about: "About Methodology",
    nav_faq: "FAQ",
    nav_contact: "Contact",
    nav_signin: "Sign In",
    nav_getstarted: "Get Started",
    nav_dashboard: "Dashboard",
    nav_my_courses: "My Courses",
    nav_trading_journal: "Trading Journal",
    nav_live_trades: "YouTube Live Trades",
    nav_live_classes: "Live Classes",
    nav_rewards: "Rewards & Offers",
    nav_review: "Review",
    nav_affiliate: "Affiliate",
    nav_wallet: "Wallet",
    nav_orders: "Orders",
    nav_support_desk: "Support Desk",
    nav_profile: "Profile",
    nav_browse_catalog: "Browse Catalog",
    nav_sign_out: "Sign Out",
  },
  hi: {
    nav_courses: "Courses",
    nav_testimonials: "Reviews & Testimonials",
    nav_about: "About Methodology",
    nav_faq: "FAQ",
    nav_contact: "Contact",
    nav_signin: "Sign In",
    nav_getstarted: "Get Started",
    nav_dashboard: "Dashboard",
    nav_my_courses: "My Courses",
    nav_trading_journal: "Trading Journal",
    nav_live_trades: "YouTube Live Trades",
    nav_live_classes: "Live Classes",
    nav_rewards: "Rewards & Offers",
    nav_review: "Review",
    nav_affiliate: "Affiliate",
    nav_wallet: "Wallet",
    nav_orders: "Orders",
    nav_support_desk: "Support Desk",
    nav_profile: "Profile",
    nav_browse_catalog: "Browse Catalog",
    nav_sign_out: "Sign Out",
  },
  bn: {
    nav_courses: "কোর্সসমূহ",
    nav_testimonials: "রিভিউ ও প্রশংসাপত্র",
    nav_about: "কাজের পদ্ধতি",
    nav_faq: "সাধারণ জিজ্ঞাসা (FAQ)",
    nav_contact: "যোগাযোগ",
    nav_signin: "লগইন করুন",
    nav_getstarted: "শুরু করুন",
    nav_dashboard: "ড্যাশবোর্ড",
    nav_my_courses: "আমার কোর্স",
    nav_trading_journal: "ট্রেডিং জার্নাল",
    nav_live_trades: "লাইভ ট্রেড",
    nav_live_classes: "লাইভ ক্লাস",
    nav_rewards: "পুরস্কার ও অফার",
    nav_review: "মতামত",
    nav_affiliate: "অ্যাফিলিয়েট",
    nav_wallet: "ওয়ালেট",
    nav_orders: "অর্ডারসমূহ",
    nav_support_desk: "সহায়তা কেন্দ্র",
    nav_profile: "প্রোফাইল",
    nav_browse_catalog: "ক্যাটালগ দেখুন",
    nav_sign_out: "লগআউট",
  },
  ur: {
    nav_courses: "کورسز",
    nav_testimonials: "تعریفات اور جائزے",
    nav_about: "طریقہ کار",
    nav_faq: "عمومی سوالات",
    nav_contact: "رابطہ کریں",
    nav_signin: "سائن ان",
    nav_getstarted: "شروع کریں",
    nav_dashboard: "ڈیش بورڈ",
    nav_my_courses: "میرے کورسز",
    nav_trading_journal: "ٹریڈنگ جرنل",
    nav_live_trades: "لائیو ٹریڈز",
    nav_live_classes: "لائیو کلاسز",
    nav_rewards: "انعامات اور آفرز",
    nav_review: "جائزہ لیں",
    nav_affiliate: "ایفیلی ایٹ",
    nav_wallet: "والیٹ",
    nav_orders: "آرڈرز",
    nav_support_desk: "سپورٹ ڈیسک",
    nav_profile: "پروفائل",
    nav_browse_catalog: "کیٹلاگ دیکھیں",
    nav_sign_out: "سائن آؤٹ",
  },
  ta: {
    nav_courses: "படிப்புகள்",
    nav_testimonials: "விமர்சனங்கள்",
    nav_about: "முறை பற்றி",
    nav_faq: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    nav_contact: "தொடர்பு கொள்க",
    nav_signin: "உள்நுழைக",
    nav_getstarted: "தொடங்குங்கள்",
    nav_dashboard: "டாஷ்போர்டு",
    nav_my_courses: "என் படிப்புகள்",
    nav_trading_journal: "டிரேடிங் ஜர்னல்",
    nav_live_trades: "நேரடி வர்த்தகம்",
    nav_live_classes: "நேரடி வகுப்புகள்",
    nav_rewards: "வெகுமதிகள்",
    nav_review: "விமர்சனம்",
    nav_affiliate: "அஃபிலியேட்",
    nav_wallet: "வாலட்",
    nav_orders: "ஆர்டர்கள்",
    nav_support_desk: "ஆதரவு மையம்",
    nav_profile: "சுயவிவரம்",
    nav_browse_catalog: "பட்டியல் உலாவுக",
    nav_sign_out: "வெளியேறு",
  },
  te: {
    nav_courses: "కోర్సులు",
    nav_testimonials: "సమీక్షలు",
    nav_about: "విధానం గురించి",
    nav_faq: "తరచుగా అడిగే ప్రశ్నలు",
    nav_contact: "సంప్రదించండి",
    nav_signin: "లాగిన్",
    nav_getstarted: "ప్రారంభించండి",
    nav_dashboard: "డ్యాష్‌బోర్డ్",
    nav_my_courses: "నా కోర్సులు",
    nav_trading_journal: "ట్రేడింగ్ జర్నల్",
    nav_live_trades: "లైవ్ ట్రేడ్లు",
    nav_live_classes: "లైవ్ క్లాసులు",
    nav_rewards: "రివార్డులు",
    nav_review: "రివ్యూ",
    nav_affiliate: "అనుబంధం",
    nav_wallet: "వ్యాలెట్",
    nav_orders: "ఆర్డర్లు",
    nav_support_desk: "సపోర్ట్ డెస్క్",
    nav_profile: "ప్రొఫైల్",
    nav_browse_catalog: "కోర్సుల జాబితా",
    nav_sign_out: "లాగౌట్",
  },
  mr: {
    nav_courses: "कोर्सेस",
    nav_testimonials: "पुनरावलोकने व टेस्टिमोनियल्स",
    nav_about: "पद्धती बद्दल",
    nav_faq: "वारंवार विचारले जाणारे प्रश्न",
    nav_contact: "संपर्क साधा",
    nav_signin: "साइन इन",
    nav_getstarted: "सुरू करा",
    nav_dashboard: "डॅशबोर्ड",
    nav_my_courses: "माझे कोर्सेस",
    nav_trading_journal: "ट्रेडिंग जर्नल",
    nav_live_trades: "लाइव्ह ट्रेड्स",
    nav_live_classes: "लाइव्ह क्लासेस",
    nav_rewards: "रिवॉर्ड्स आणि ऑफर्स",
    nav_review: "रिव्ह्यू द्या",
    nav_affiliate: "अॅफिलिएट",
    nav_wallet: "वॉलेट",
    nav_orders: "ऑर्डर्स",
    nav_support_desk: "सपोर्ट डेस्क",
    nav_profile: "प्रोफाइल",
    nav_browse_catalog: "कॅटलॉग पहा",
    nav_sign_out: "साइन आउट",
  },
  gu: {
    nav_courses: "કોર્સ",
    nav_testimonials: "સમીક્ષાઓ અને પ્રશંસાપત્રો",
    nav_about: "પદ્ધતિ વિશે",
    nav_faq: "વારંવાર પૂછાતા પ્રશ્નો",
    nav_contact: "સંપર્ક કરો",
    nav_signin: "સાઇન ઇન",
    nav_getstarted: "શરૂ કરો",
    nav_dashboard: "ડેશબોર્ડ",
    nav_my_courses: "મારા કોર્સ",
    nav_trading_journal: "ટ્રેડિંગ જર્નલ",
    nav_live_trades: "લાઇવ ટ્રેડ્સ",
    nav_live_classes: "લાઇવ વર્ગો",
    nav_rewards: "પુરસ્કારો અને ઑફર્સ",
    nav_review: "સમીક્ષા",
    nav_affiliate: "એફિલિએટ",
    nav_wallet: "વોલેટ",
    nav_orders: "ઓર્ડર્સ",
    nav_support_desk: "સહાયક ડેસ્ક",
    nav_profile: "પ્રોફાઇલ",
    nav_browse_catalog: "કેટલોગ જુઓ",
    nav_sign_out: "સાઇન આઉટ",
  },
  pa: {
    nav_courses: "ਕੋਰਸ",
    nav_testimonials: "ਸਮੀਖਿਆਵਾਂ",
    nav_about: "ਕਾਰਜਪ੍ਰਣਾਲੀ ਬਾਰੇ",
    nav_faq: "ਅਕਸਰ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ",
    nav_contact: "ਸੰਪਰਕ ਕਰੋ",
    nav_signin: "ਸਾਈਨ ਇਨ",
    nav_getstarted: "ਸ਼ੁਰੂ ਕਰੋ",
    nav_dashboard: "ਡੈਸ਼ਬੋਰਡ",
    nav_my_courses: "ਮੇਰੇ ਕੋਰਸ",
    nav_trading_journal: "ਟਰੇਡਿੰਗ ਜਰਨਲ",
    nav_live_trades: "ਲਾਈਵ ਟਰੇਡਸ",
    nav_live_classes: "ਲਾਈਵ ਕਲਾਸਾਂ",
    nav_rewards: "ਇਨਾਮ ਅਤੇ ਪੇਸ਼ਕਸ਼ਾਂ",
    nav_review: "ਸਮੀਖਿਆ",
    nav_affiliate: "ਐਫੀਲੀਏਟ",
    nav_wallet: "ਵਾਲਿਟ",
    nav_orders: "ਆਰਡਰ",
    nav_support_desk: "ਸਹਾਇਤਾ ਡੈਸਕ",
    nav_profile: "ਪ੍ਰੋਫਾਈਲ",
    nav_browse_catalog: "ਕੈਟਾਲਾਗ ਦੇਖੋ",
    nav_sign_out: "ਸਾਈਨ ਆਉਟ",
  },
};

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (langCode: string) => void;
  languages: LanguageOption[];
  isLoaded: boolean;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: "hi",
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
  isLoaded: false,
  t: (_key, fallback) => fallback || _key,
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
  const pathname = usePathname();

  // Helper to get translated string
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const langDict = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi"] || TRANSLATIONS["en"];
      if (langDict && langDict[key]) {
        return langDict[key];
      }
      return fallback || key;
    },
    [currentLanguage]
  );

  // Set Google Translate Cookie properly
  const applyGoogleTranslateCookie = useCallback((langCode: string) => {
    if (typeof window === "undefined") return;

    const cookieVal = `/en/${langCode}`;
    const autoVal = `/auto/${langCode}`;
    const host = window.location.hostname;

    // 1. Standard path cookies
    document.cookie = `googtrans=${cookieVal}; path=/; SameSite=Lax;`;
    document.cookie = `googtrans=${autoVal}; path=/; SameSite=Lax;`;

    // 2. Hostname cookies
    if (host) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; SameSite=Lax;`;
      document.cookie = `googtrans=${autoVal}; path=/; domain=${host}; SameSite=Lax;`;

      if (host.includes(".")) {
        const rootDomain = "." + host.split(".").slice(-2).join(".");
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain}; SameSite=Lax;`;
        document.cookie = `googtrans=${autoVal}; path=/; domain=${rootDomain}; SameSite=Lax;`;
      }
    }

    // 3. Special handling for English (reset/clear)
    if (langCode === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;
      document.cookie = `googtrans=/en/en; path=/; SameSite=Lax;`;
    }
  }, []);

  // Trigger Google Translate Combo
  const triggerGoogleTranslateCombo = useCallback((langCode: string): boolean => {
    if (typeof document === "undefined") return false;

    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      const targetVal = langCode === "en" ? "" : langCode;
      select.value = targetVal;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof select.onchange === "function") {
        (select as any).onchange();
      }
      return true;
    }
    return false;
  }, []);

  // Read saved language on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialLang = "hi"; // Default to Hindi (Hinglish)
    const saved = localStorage.getItem("app_language");

    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      initialLang = saved;
    } else {
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

          // Apply current language after init if not English
          setTimeout(() => {
            const saved = localStorage.getItem("app_language") || "hi";
            if (saved && saved !== "en") {
              triggerGoogleTranslateCombo(saved);
            }
          }, 300);
        } catch (e) {
          console.warn("Google Translate init error:", e);
        }
      }
    };

    // Load Google Translate script
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google && window.google.translate && window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, [triggerGoogleTranslateCombo]);

  // Re-apply language on route change
  useEffect(() => {
    if (currentLanguage && currentLanguage !== "en") {
      applyGoogleTranslateCookie(currentLanguage);
      setTimeout(() => {
        triggerGoogleTranslateCombo(currentLanguage);
      }, 200);
    }
  }, [pathname, currentLanguage, applyGoogleTranslateCookie, triggerGoogleTranslateCombo]);

  // Function to change language
  const setLanguage = useCallback(
    (langCode: string) => {
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

      // Apply cookies across domains
      applyGoogleTranslateCookie(langCode);

      // Attempt immediate combo change
      triggerGoogleTranslateCombo(langCode);

      // Trigger smooth reload to guarantee complete DOM translation across all page components
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },
    [applyGoogleTranslateCookie, triggerGoogleTranslateCombo]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
        isLoaded,
        t,
      }}
    >
      {children}
      {/* Hidden container required by Google Translate */}
      <div id="google_translate_element" aria-hidden="true" />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
