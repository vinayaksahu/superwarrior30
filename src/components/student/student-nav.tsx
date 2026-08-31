"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  Wallet,
  ShoppingCart,
  User,
  Radio,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/live", label: "Live Classes", icon: Radio },
  { href: "/dashboard/cashbacks", label: "Broker Cashbacks", icon: Sparkles },
  { href: "/referrals", label: "Affiliate", icon: GitBranch },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/profile", label: "Profile", icon: User },
];

export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:block lg:w-56 lg:shrink-0 space-y-1">
      {navLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
