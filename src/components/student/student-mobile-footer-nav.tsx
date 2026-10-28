"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  Wallet,
  LayoutGrid,
  X,
  Radio,
  BookMarked,
  Award,
  Video,
  Gift,
  Users,
  ShoppingCart,
  User,
  LifeBuoy,
  Star,
  LogOut,
  ChevronRight,
  Send,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth.actions";
import { useLanguage } from "@/components/shared/language-provider";

interface StudentMobileFooterNavProps {
  user?: {
    name: string | null;
    email: string;
    isTestData?: boolean;
  };
  isCommunityMember?: boolean;
  visibilityMap?: Record<string, boolean>;
}

export function StudentMobileFooterNav({
  user,
  isCommunityMember = false,
  visibilityMap,
}: StudentMobileFooterNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  // Close the sheet when navigating to another route
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Lock body scroll and handle Escape key when the bottom sheet is open
  useEffect(() => {
    if (!isMoreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMoreOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMoreOpen]);

  const isVisible = (href: string) => {
    if (visibilityMap && visibilityMap[href] === false) return false;
    return true;
  };

  // Primary 4 Tabs config
  const primaryTabs = [
    {
      id: "dashboard",
      href: "/dashboard",
      label: t("nav_dashboard", "Dashboard"),
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
      visible: isVisible("/dashboard"),
    },
    {
      id: "courses",
      href: "/dashboard/courses",
      label: t("nav_courses", "Courses"),
      icon: BookOpen,
      isActive:
        pathname === "/dashboard/courses" ||
        pathname.startsWith("/dashboard/courses/"),
      visible: isVisible("/dashboard/courses"),
    },
    {
      id: "affiliate",
      href: "/referrals",
      label: t("nav_affiliate", "Affiliate"),
      icon: GitBranch,
      isActive: pathname.startsWith("/referrals"),
      visible: isVisible("/referrals"),
    },
    {
      id: "wallet",
      href: "/wallet",
      label: t("nav_wallet", "Wallet"),
      icon: Wallet,
      isActive: pathname.startsWith("/wallet"),
      visible: isVisible("/wallet"),
    },
  ];

  // Check if current route belongs to one of the secondary/sheet items
  const isSecondaryRouteActive =
    !primaryTabs.some((tab) => tab.isActive) && pathname !== "/";

  // Secondary tools displayed inside the "More" bottom sheet
  const secondaryTools = [
    {
      href: "/dashboard/live",
      label: t("nav_live_classes", "Live Classes"),
      description: "Interactive market sessions",
      icon: Radio,
      badge: "Live",
      badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      visible: isVisible("/dashboard/live"),
    },
    {
      href: "/dashboard/journal",
      label: t("nav_trading_journal", "Trading Journal"),
      description: "Log trades & review analytics",
      icon: BookMarked,
      visible: isVisible("/dashboard/journal"),
    },
    {
      href: "/dashboard/homework",
      label: "Homework & Tasks",
      description: "Chart analysis & assignments",
      icon: Award,
      visible: isVisible("/dashboard/homework"),
    },
    {
      href: "/dashboard/copy-trading",
      label: "Copy Trading",
      description: "Automated trade mirroring",
      icon: Share2,
      visible: isVisible("/dashboard/copy-trading"),
    },
    {
      href: "/dashboard/live-proofs",
      label: t("nav_live_trades", "YouTube Live Trades"),
      description: "Watch verified real trade execution",
      icon: Video,
      visible: isVisible("/dashboard/live-proofs"),
    },
    {
      href: "/dashboard/cashbacks",
      label: t("nav_rewards", "Rewards & Offers"),
      description: "Exclusive rebates and perks",
      icon: Gift,
      visible: isVisible("/dashboard/cashbacks"),
    },
    {
      href: "/orders",
      label: t("nav_orders", "My Orders"),
      description: "Invoices & billing records",
      icon: ShoppingCart,
      visible: isVisible("/orders"),
    },
    {
      href: "/dashboard/support",
      label: t("nav_support_desk", "Support Desk"),
      description: "Ticket desk & quick help",
      icon: LifeBuoy,
      visible: isVisible("/dashboard/support"),
    },
    {
      href: "/profile",
      label: t("nav_profile", "My Profile"),
      description: "Account credentials & KYC",
      icon: User,
      visible: isVisible("/profile"),
    },
    {
      href: "/dashboard/testimonials",
      label: t("nav_review", "Leave Review"),
      description: "Share feedback & win perks",
      icon: Star,
      visible: isVisible("/dashboard/testimonials"),
    },
  ];

  const visibleSecondaryTools = secondaryTools.filter((tool) => tool.visible);

  return (
    <>
      {/* =========================================================================
          STICKY BOTTOM NAVIGATION BAR (Mobile & Tablet: < lg)
         ========================================================================= */}
      <aside
        aria-label="Student Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] select-none"
      >
        <div className="mx-auto max-w-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <nav className="grid grid-cols-5 items-center gap-1">
            {primaryTabs.map((tab) => {
              if (!tab.visible) return null;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 group relative",
                    tab.isActive
                      ? "text-primary dark:text-amber-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  )}
                >
                  {/* Active highlight pill behind the icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                      tab.isActive
                        ? "bg-primary/15 dark:bg-amber-400/20 text-primary dark:text-amber-300"
                        : "group-hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] leading-tight mt-0.5 tracking-tight truncate max-w-full">
                    {tab.label}
                  </span>
                  {tab.isActive && (
                    <span className="absolute top-0.5 w-1 h-1 rounded-full bg-primary dark:bg-amber-400" />
                  )}
                </Link>
              );
            })}

            {/* "More" Trigger Tab */}
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-label="Open More Menu"
              aria-expanded={isMoreOpen}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 group relative",
                isMoreOpen || isSecondaryRouteActive
                  ? "text-primary dark:text-amber-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                  isMoreOpen || isSecondaryRouteActive
                    ? "bg-primary/15 dark:bg-amber-400/20 text-primary dark:text-amber-300"
                    : "group-hover:bg-muted text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-4.5 w-4.5 shrink-0 stroke-[2.2]" />
              </div>
              <span className="text-[11px] leading-tight mt-0.5 tracking-tight">
                More
              </span>
              {(isMoreOpen || isSecondaryRouteActive) && (
                <span className="absolute top-0.5 w-1 h-1 rounded-full bg-primary dark:bg-amber-400" />
              )}
            </button>
          </nav>
        </div>
      </aside>

      {/* =========================================================================
          "MORE" BOTTOM SHEET DRAWER
         ========================================================================= */}
      {isMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsMoreOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Sliding Bottom Sheet */}
          <div className="relative z-50 w-full max-h-[85vh] bg-background border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle Header */}
            <div className="flex flex-col items-center pt-3 pb-2 px-4 border-b border-border/50 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-3" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {user?.name || "Student"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || "Student Portal"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* VIP Community Card */}
              {isVisible("/dashboard/join-community") && (
                <Link
                  href="/dashboard/join-community"
                  onClick={() => setIsMoreOpen(false)}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {isCommunityMember
                            ? "VIP Trading Community"
                            : "Join VIP Telegram"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {isCommunityMember ? "Active" : "Free"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Live trade calls, chart breakdowns & mentors
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>
              )}

              {/* Grid of Student Tools */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Learning & Trading Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {visibleSecondaryTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          "flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-150 active:scale-[0.98]",
                          isActive
                            ? "bg-accent border-primary/40 text-foreground"
                            : "border-border/60 bg-card hover:bg-accent/60 text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold leading-tight truncate">
                              {tool.label}
                            </span>
                            {tool.badge && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.2 rounded-full border",
                                  tool.badgeColor
                                )}
                              >
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Browse Catalog link */}
              <div className="pt-1">
                <Link
                  href="/courses"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">
                      {t("nav_browse_catalog", "Browse All Courses")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="pt-2">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 active:scale-[0.98] transition-all cursor-pointer border border-destructive/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("nav_sign_out", "Sign Out")}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}