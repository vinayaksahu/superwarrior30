import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = APP_URL || "https://superwarrior30.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses", "/courses/*", "/about", "/faq", "/contact", "/terms", "/privacy", "/refund-policy"],
        disallow: ["/admin", "/admin/*", "/dashboard", "/dashboard/*", "/learn", "/learn/*", "/wallet", "/referrals", "/orders", "/checkout", "/checkout/*", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
