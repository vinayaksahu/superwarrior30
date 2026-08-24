"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingCart,
  Tag,
  GitBranch,
  Wallet,
  ArrowDownToLine,
  Settings,
  ShieldCheck,
  ScrollText,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: ("SUPER_ADMIN" | "ADMIN" | "SUPPORT")[];
}

const allSidebarLinks: SidebarLink[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/courses",
    label: "Courses",
    icon: BookOpen,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: Users,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: Tag,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: ArrowDownToLine,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/payment-methods",
    label: "Payment Methods",
    icon: CreditCard,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/referrals",
    label: "Referrals",
    icon: GitBranch,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/wallet",
    label: "Wallet",
    icon: Wallet,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/staff",
    label: "Admin Roles & Staff",
    icon: ShieldCheck,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    allowedRoles: ["SUPER_ADMIN"],
  },
];

interface AdminSidebarProps {
  userRole?: string;
  userEmail?: string;
}

export function AdminSidebar({ userRole = "ADMIN", userEmail = "" }: AdminSidebarProps) {
  const pathname = usePathname();

  const isSuper = userRole === "SUPER_ADMIN" || userEmail === "admin@superwarrior30.com";
  const effectiveRole = isSuper ? "SUPER_ADMIN" : (userRole as "ADMIN" | "SUPPORT");

  // Filter links based on role permissions
  const visibleLinks = allSidebarLinks.filter((link) =>
    link.allowedRoles.includes(effectiveRole)
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background lg:block">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold text-sidebar-primary">SW30</span>
          <span className="text-sm font-medium text-sidebar-foreground">
            {isSuper ? "Super Admin" : "Staff Admin"}
          </span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {visibleLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
