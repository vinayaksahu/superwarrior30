"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, UserCheck, Cloud, Database, Sliders, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const settingsTabs = [
  {
    href: "/admin/settings",
    label: "General & Branding",
    icon: Globe,
    exact: true,
  },
  {
    href: "/admin/settings/profile",
    label: "Profile & Password",
    icon: UserCheck,
    exact: true,
  },
  {
    href: "/admin/settings/email",
    label: "Email & OTP Security",
    icon: Mail,
    exact: true,
  },
  {
    href: "/admin/settings/media-storage",
    label: "Media Storage (Bunny)",
    icon: Cloud,
    exact: false,
  },
  {
    href: "/admin/settings/backups",
    label: "Backups & Database",
    icon: Database,
    exact: true,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4 mb-6">
      {settingsTabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
