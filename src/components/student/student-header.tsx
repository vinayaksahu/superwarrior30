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
  GitBranch,
  Wallet,
  ShoppingCart,
  User,
  Radio,
  Sparkles,
  LifeBuoy,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { TestUserBadge } from "@/components/shared/test-user-badge";

interface StudentHeaderProps {
  user: {
    name: string | null;
    email: string;
    isTestData?: boolean;
  };
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/live", label: "Live Classes", icon: Radio },
  { href: "/dashboard/cashbacks", label: "Broker Cashbacks", icon: Sparkles },
  { href: "/dashboard/testimonials", label: "Review", icon: Star },
  { href: "/referrals", label: "Affiliate", icon: GitBranch },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/support", label: "Support Desk", icon: LifeBuoy },
  { href: "/profile", label: "Profile", icon: User },
];

export function StudentHeader({ user }: StudentHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Rahul Trade Warrior Academy"
                className="h-8 w-8 rounded-full object-contain border border-amber-500/40 bg-black shrink-0 shadow"
              />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black tracking-tight text-foreground">
                  TRADE <span className="text-amber-400">WARRIOR</span>
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">
                  Student Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/courses"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hidden sm:inline-block"
            >
              Browse Courses
            </Link>
            <ThemeToggle />
            <div className="text-right hidden sm:flex items-center gap-2">
              <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                {user.name || user.email.split("@")[0]}
              </p>
              <TestUserBadge isTestData={user.isTestData} />
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
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-80 max-w-[85vw] flex-col bg-card border-r border-border p-6 shadow-2xl z-50 animate-in slide-in-from-left duration-250">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-9 w-9 rounded-full object-contain border border-amber-500/40 bg-black shrink-0 shadow-sm"
                />
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-black tracking-tight text-foreground">
                    TRADE <span className="text-amber-400">WARRIOR</span>
                  </span>
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase mt-0.5">
                    Student Portal
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student Profile Overview */}
            <div className="mb-5 rounded-2xl bg-muted/40 p-3.5 border border-border flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground text-sm shadow-sm">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground truncate">
                    {user.name || "Student"}
                  </p>
                  <TestUserBadge isTestData={user.isTestData} />
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-medium">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
                    )}
                  >
                    <link.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <div className="border-t border-border/80 pt-3 mt-3">
                <Link
                  href="/courses"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span>Browse Catalog</span>
                </Link>
              </div>
            </nav>

            {/* Logout Button */}
            <div className="border-t border-border/80 pt-4 mt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-xs font-extrabold text-destructive hover:bg-destructive/20 active:scale-[0.98] transition-all cursor-pointer border border-destructive/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
