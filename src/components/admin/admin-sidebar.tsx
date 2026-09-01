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
  Mail,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSubLink {
  href: string;
  label: string;
  exact?: boolean;
  icon?: LucideIcon;
  requiredPermission?: string;
}

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredPermission?: string;
  allowedRoles?: ("SUPER_ADMIN" | "ADMIN" | "SUPPORT")[];
  children?: SidebarSubLink[];
}

export const allSidebarLinks: SidebarLink[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiredPermission: "dashboard.view",
  },
  {
    href: "/admin/courses",
    label: "Courses",
    icon: BookOpen,
    requiredPermission: "courses.view",
  },
  {
    href: "/admin/live-sessions",
    label: "Live Sessions",
    icon: Radio,
    requiredPermission: "live_sessions.view",
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: Users,
    requiredPermission: "students.view",
  },
  {
    href: "/admin/referrals",
    label: "Affiliate",
    icon: GitBranch,
    requiredPermission: "affiliate.view",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    requiredPermission: "orders.view",
  },
  {
    href: "/admin/support",
    label: "Support Desk",
    icon: LifeBuoy,
    requiredPermission: "support.view",
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: ArrowDownToLine,
    requiredPermission: "withdrawals.view",
  },
  {
    href: "/admin/wallet",
    label: "Wallet",
    icon: Wallet,
    requiredPermission: "wallet.view",
  },
  {
    href: "/admin/broker-offers",
    label: "Offers & Discounts",
    icon: Sparkles,
    requiredPermission: "offers.view",
  },
  {
    href: "/admin/payment-methods",
    label: "Payment Methods",
    icon: CreditCard,
    requiredPermission: "payment_methods.view",
  },
  {
    href: "/admin/leads",
    label: "Leads",
    icon: ContactRound,
    requiredPermission: "leads.view",
  },
  {
    href: "/admin/funnel",
    label: "Funnel Analytics",
    icon: BarChart3,
    requiredPermission: "funnel.view",
  },
  {
    href: "/admin/testimonials",
    label: "Testimonials",
    icon: Star,
    requiredPermission: "testimonials.view",
  },
  {
    href: "/admin/staff",
    label: "Admin Roles & Staff",
    icon: ShieldCheck,
    requiredPermission: "staff.view",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    children: [
      { href: "/admin/settings", label: "General & Branding", exact: true, icon: Globe, requiredPermission: "settings.general.manage" },
      { href: "/admin/settings/profile", label: "Profile & Security", exact: true, icon: UserCheck, requiredPermission: "settings.profile.manage" },
      { href: "/admin/settings/email", label: "Email & OTP Security", exact: true, icon: Mail, requiredPermission: "settings.email_otp.manage" },
      { href: "/admin/settings/media-storage", label: "Media Storage (Bunny)", exact: false, icon: Cloud, requiredPermission: "settings.media_storage.manage" },
      { href: "/admin/settings/backups", label: "Backups & Database", exact: true, icon: Database, requiredPermission: "settings.backups.manage" },
    ],
  },
  {
    href: "/admin/recycle-bin",
    label: "Recycle Bin",
    icon: Trash2,
    requiredPermission: "recycle_bin.view",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    requiredPermission: "audit_logs.view",
  },
];

interface AdminSidebarProps {
  userRole?: string;
  userEmail?: string;
  userPermissions?: string[];
  userDisplayName?: string;
  userBadgeLabel?: string;
  userBadgeColorClass?: string;
}

export function AdminSidebar({
  userRole = "ADMIN",
  userEmail = "",
  userPermissions = [],
  userBadgeLabel,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isSuper =
    userRole === "SUPER_ADMIN" ||
    userEmail === "vinayaksahu3@gmail.com" ||
    userEmail === "admin@superwarrior30.com";

  const permsSet = new Set(userPermissions);

  // Keep settings sub-menu open by default or when on settings routes
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Filter links based on granular permissions or Super Admin authority
  const visibleLinks = allSidebarLinks
    .map((link) => {
      // If link has children (like Settings), filter visible children
      if (link.children) {
        const visibleChildren = isSuper
          ? link.children
          : link.children.filter(
              (child) => !child.requiredPermission || permsSet.has(child.requiredPermission)
            );

        if (visibleChildren.length === 0) return null;

        return {
          ...link,
          children: visibleChildren,
        };
      }

      // Check single link permission
      if (isSuper) return link;
      if (link.requiredPermission && !permsSet.has(link.requiredPermission)) {
        return null;
      }
      return link;
    })
    .filter(Boolean) as SidebarLink[];

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
              {userBadgeLabel || (isSuper ? "SUPER ADMIN" : "ADMIN PORTAL")}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {visibleLinks.map((link) => {
          const Icon = link.icon;

          if (link.children && link.children.length > 0) {
            const isSettingsActive = pathname.startsWith("/admin/settings");

            return (
              <div key={link.href} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                    isSettingsActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </div>
                  {settingsOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {settingsOpen && (
                  <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-3">
                    {link.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = child.exact
                        ? pathname === child.href
                        : pathname.startsWith(child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
