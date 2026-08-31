"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingCart,
  GitBranch,
  Wallet,
  ArrowDownToLine,
  Settings,
  ShieldCheck,
  ScrollText,
  CreditCard,
  Trash2,
  ContactRound,
  BarChart3,
  Star,
  Radio,
  Sparkles,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Globe,
  UserCheck,
  Cloud,
  Database,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSubLink {
  href: string;
  label: string;
  exact?: boolean;
  icon?: LucideIcon;
}

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: ("SUPER_ADMIN" | "ADMIN" | "SUPPORT")[];
  children?: SidebarSubLink[];
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
    href: "/admin/live-sessions",
    label: "Live Sessions",
    icon: Radio,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: Users,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/referrals",
    label: "Affiliate",
    icon: GitBranch,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/support",
    label: "Support Desk",
    icon: LifeBuoy,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: ArrowDownToLine,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/wallet",
    label: "Wallet",
    icon: Wallet,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/broker-offers",
    label: "Offers & Discounts",
    icon: Sparkles,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/payment-methods",
    label: "Payment Methods",
    icon: CreditCard,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/leads",
    label: "Leads",
    icon: ContactRound,
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  },
  {
    href: "/admin/funnel",
    label: "Funnel Analytics",
    icon: BarChart3,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/testimonials",
    label: "Testimonials",
    icon: Star,
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
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
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    children: [
      { href: "/admin/settings", label: "General & Branding", exact: true, icon: Globe },
      { href: "/admin/settings/profile", label: "Profile & Password", exact: true, icon: UserCheck },
      { href: "/admin/settings/media-storage", label: "Media Storage (Bunny)", exact: false, icon: Cloud },
      { href: "/admin/settings/backups", label: "Backups & Database", exact: true, icon: Database },
    ],
  },
  {
    href: "/admin/recycle-bin",
    label: "Recycle Bin",
    icon: Trash2,
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

  // Keep settings sub-menu open by default or when on settings routes
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Filter links based on role permissions
  const visibleLinks = allSidebarLinks.filter((link) =>
    link.allowedRoles.includes(effectiveRole)
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background lg:block">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-9 rounded-full object-contain border border-amber-500/40 bg-black shrink-0 shadow"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-black tracking-tight text-foreground">
              TRADE <span className="text-amber-400">WARRIOR</span>
            </span>
            <span className="text-[9px] font-bold text-amber-500/80 uppercase">
              {isSuper ? "Super Admin" : "Staff Admin"}
            </span>
          </div>
        </Link>
      </div>
      <nav className="space-y-1 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {visibleLinks.map((link) => {
          const hasChildren = Boolean(link.children && link.children.length > 0);
          const isParentActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href)) ||
            (link.href === "/admin/broker-offers" && pathname.startsWith("/admin/coupons"));

          if (hasChildren) {
            return (
              <div key={link.href} className="space-y-1">
                <div
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer select-none",
                    isParentActive
                      ? "bg-sidebar-accent/60 text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </div>
                  {settingsOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Sub-menu items */}
                {settingsOpen && (
                  <div className="ml-4 pl-3 border-l border-border/60 space-y-1 pt-0.5">
                    {link.children!.map((child) => {
                      const isChildActive = child.exact
                        ? pathname === child.href
                        : pathname.startsWith(child.href);
                      const SubIcon = child.icon;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            isChildActive
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {SubIcon && <SubIcon className="h-3 w-3 shrink-0" />}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isParentActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
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
