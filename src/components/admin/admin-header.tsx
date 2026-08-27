"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth.actions";
import {
  Menu,
  X,
  LogOut,
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
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface AdminHeaderProps {
  user: {
    name: string | null;
    email: string;
    role: string;
  };
}

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: ("SUPER_ADMIN" | "ADMIN" | "SUPPORT")[];
}

const allSidebarLinks: SidebarLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { href: "/admin/students", label: "Students", icon: Users, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { href: "/admin/devices", label: "Device Security", icon: ShieldCheck, allowedRoles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, allowedRoles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine, allowedRoles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/payment-methods", label: "Payment Methods", icon: CreditCard, allowedRoles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/referrals", label: "Referrals", icon: GitBranch, allowedRoles: ["SUPER_ADMIN"] },
  { href: "/admin/wallet", label: "Wallet", icon: Wallet, allowedRoles: ["SUPER_ADMIN"] },
  { href: "/admin/staff", label: "Admin Roles & Staff", icon: ShieldCheck, allowedRoles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, allowedRoles: ["SUPER_ADMIN"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, allowedRoles: ["SUPER_ADMIN"] },
];

export function AdminHeader({ user }: AdminHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isSuper = user.role === "SUPER_ADMIN" || user.email === "admin@superwarrior30.com";
  const effectiveRole = isSuper ? "SUPER_ADMIN" : (user.role as "ADMIN" | "SUPPORT");

  const visibleLinks = allSidebarLinks.filter((link) =>
    link.allowedRoles.includes(effectiveRole)
  );

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-base font-bold text-primary">SW30 Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {user.name || user.email}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  isSuper
                    ? "bg-destructive/15 text-destructive border border-destructive/30"
                    : user.role === "ADMIN"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                }`}
              >
                {effectiveRole}
              </span>
            </div>
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
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-card border-r border-border p-5 shadow-2xl z-50">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">SW30 Admin</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {visibleLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border pt-4 mt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
