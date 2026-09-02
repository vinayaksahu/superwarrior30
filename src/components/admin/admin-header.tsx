"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth.actions";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Film,
  Users,
  ShoppingCart,
  GitBranch,
  Wallet,
  ArrowDownToLine,
  Settings,
  ShieldCheck,
  ScrollText,
  CreditCard,
  ContactRound,
  BarChart3,
  Star,
  LifeBuoy,
  Radio,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

import { EnvironmentSwitcher } from "@/components/admin/environment-switcher";
import type { AppEnvironment } from "@/lib/env-context";

interface AdminHeaderProps {
  user: {
    name: string | null;
    email: string;
    role: string;
    adminRole?: string | null;
    customPermissions?: unknown;
    permissions?: string[];
    displayName?: string;
    badgeLabel?: string;
    badgeColorClass?: string;
  };
  currentEnvironment?: AppEnvironment;
  staffTestingAllowed?: boolean;
  isSuperAdmin?: boolean;
  testVisibilityScope?: import("@/lib/env-context").TestVisibilityScope;
}

interface MobileNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredPermission?: string;
}

const mobileNavLinks: MobileNavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, requiredPermission: "dashboard.view" },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, requiredPermission: "courses.view" },
  { href: "/admin/media", label: "Media Library", icon: Film, requiredPermission: "media.view" },
  { href: "/admin/live-sessions", label: "Live Sessions", icon: Radio, requiredPermission: "live_sessions.view" },
  { href: "/admin/students", label: "Students", icon: Users, requiredPermission: "students.view" },
  { href: "/admin/referrals", label: "Affiliate", icon: GitBranch, requiredPermission: "affiliate.view" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, requiredPermission: "orders.view" },
  { href: "/admin/support", label: "Support Desk", icon: LifeBuoy, requiredPermission: "support.view" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine, requiredPermission: "withdrawals.view" },
  { href: "/admin/wallet", label: "Wallet", icon: Wallet, requiredPermission: "wallet.view" },
  { href: "/admin/broker-offers", label: "Offers & Discounts", icon: Sparkles, requiredPermission: "offers.view" },
  { href: "/admin/payment-methods", label: "Payment Methods", icon: CreditCard, requiredPermission: "payment_methods.view" },
  { href: "/admin/leads", label: "Leads", icon: ContactRound, requiredPermission: "leads.view" },
  { href: "/admin/funnel", label: "Funnel Analytics", icon: BarChart3, requiredPermission: "funnel.view" },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star, requiredPermission: "testimonials.view" },
  { href: "/admin/staff", label: "Admin Roles & Staff", icon: ShieldCheck, requiredPermission: "staff.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings, requiredPermission: "settings.general.manage" },
  { href: "/admin/recycle-bin", label: "Recycle Bin", icon: Trash2, requiredPermission: "recycle_bin.view" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, requiredPermission: "audit_logs.view" },
];

export function AdminHeader({
  user,
  currentEnvironment,
  staffTestingAllowed = false,
  isSuperAdmin: isSuperAdminProp,
  testVisibilityScope = "ADMINS_ONLY",
}: AdminHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const isSuper =
    isSuperAdminProp !== undefined
      ? isSuperAdminProp
      : user.role === "SUPER_ADMIN" ||
        user.adminRole === "SUPER_ADMIN" ||
        user.email.toLowerCase() === "vinayaksahu3@gmail.com" ||
        user.email.toLowerCase() === "admin@superwarrior30.com";

  const permsSet = new Set(user.permissions || []);

  const visibleLinks = mobileNavLinks.filter((link) => {
    if (isSuper) return true;
    if (!link.requiredPermission) return true;
    return permsSet.has(link.requiredPermission);
  });

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden cursor-pointer"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-base font-bold text-primary">SW30 Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <EnvironmentSwitcher
            currentEnvironment={currentEnvironment || "LIVE"}
            isSuperAdmin={isSuper}
            isStaffAdmin={!isSuper}
            staffTestingAllowed={staffTestingAllowed}
            initialVisibilityScope={testVisibilityScope}
          />
          <ThemeToggle />
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {user.name || user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="relative flex w-full max-w-xs flex-1 flex-col bg-background p-4 shadow-xl border-r border-border animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-3">
              <span className="text-sm font-bold text-primary">Administration</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
