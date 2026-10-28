import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rahul Trade Warrior Academy",
    short_name: "Trade Warrior",
    description: "Master professional trading with Rahul Trade Warrior Academy. Learn | Trade | Earn with expert mentorship and proven trading systems.",
    start_url: "/login?source=pwa",
    id: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    lang: "en",
    dir: "ltr",
    categories: ["education", "finance", "business"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "wide",
        label: "Rahul Trade Warrior Academy",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: "Trade Warrior Mobile App",
      },
    ],
  };
}
