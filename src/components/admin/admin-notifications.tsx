"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  CheckCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  ShoppingCart,
  ArrowDownToLine,
  DollarSign,
  LifeBuoy,
  Award,
  Users,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useAdminNotifications } from "@/contexts/admin-notifications-context";
import type { AdminNotificationCategory } from "@/server/actions/admin-notifications.actions";
import { cn } from "@/lib/utils";

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

function getCategoryIcon(cat: AdminNotificationCategory) {
  switch (cat) {
    case "ORDER":
      return ShoppingCart;
    case "WITHDRAWAL":
      return ArrowDownToLine;
    case "DEPOSIT":
      return DollarSign;
    case "SUPPORT":
      return LifeBuoy;
    case "HOMEWORK":
      return Award;
    case "COMMUNITY":
      return Users;
    default:
      return AlertCircle;
  }
}

function getBadgeStyles(variant: string) {
  switch (variant) {
    case "emerald":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "amber":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "rose":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "purple":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "blue":
    default:
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }
}

export function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "FINANCE" | "ORDERS" | "SUPPORT">("ALL");
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    counts,
    readIds,
    unreadCount,
    isLoading,
    soundActive,
    toggleSound,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useAdminNotifications();

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    if (filter === "ORDERS") return item.category === "ORDER";
    if (filter === "FINANCE") return item.category === "WITHDRAWAL" || item.category === "DEPOSIT";
    if (filter === "SUPPORT")
      return item.category === "SUPPORT" || item.category === "HOMEWORK" || item.category === "COMMUNITY";
    return true;
  });

  const hasUrgent = counts.pendingOrders > 0 || counts.pendingWithdrawals > 0 || counts.pendingDeposits > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative rounded-xl p-2.5 transition-all cursor-pointer",
          isOpen
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        aria-label="Admin Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={cn("h-5 w-5", hasUrgent && "text-foreground")} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-black text-white shadow-sm",
              hasUrgent ? "bg-rose-500 animate-pulse" : "bg-amber-500"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin Notifications Center"
          className="fixed inset-x-3 top-18 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 z-50 w-auto sm:w-[420px] md:w-[460px] max-h-[82vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex flex-col border-b border-border/80 bg-muted/30 p-3.5 sm:p-4 shrink-0 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Admin Notifications
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {counts.totalPending} pending action{counts.totalPending === 1 ? "" : "s"} requiring attention
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={cn(
                    "rounded-lg p-1.5 transition-colors cursor-pointer",
                    soundActive
                      ? "text-emerald-500 hover:bg-emerald-500/10"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  title={soundActive ? "Sound enabled (click to mute)" : "Sound muted (click to unmute)"}
                >
                  {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => refresh()}
                  disabled={isLoading}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh notifications"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </button>

                {/* Mark all as read */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer ml-1"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px]",
                  filter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                All ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setFilter("ORDERS")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] flex items-center gap-1",
                  filter === "ORDERS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Orders
                {counts.pendingOrders > 0 && (
                  <span className="rounded-full bg-amber-500 text-black text-[9px] px-1.5 py-0.2 font-black">
                    {counts.pendingOrders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilter("FINANCE")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] flex items-center gap-1",
                  filter === "FINANCE"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Payouts &amp; Fees
                {(counts.pendingWithdrawals > 0 || counts.pendingDeposits > 0) && (
                  <span className="rounded-full bg-rose-500 text-white text-[9px] px-1.5 py-0.2 font-black">
                    {counts.pendingWithdrawals + counts.pendingDeposits}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilter("SUPPORT")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] flex items-center gap-1",
                  filter === "SUPPORT"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Support &amp; Review
                {(counts.openTickets > 0 || counts.pendingHomework > 0 || counts.pendingCommunity > 0) && (
                  <span className="rounded-full bg-purple-500 text-white text-[9px] px-1.5 py-0.2 font-black">
                    {counts.openTickets + counts.pendingHomework + counts.pendingCommunity}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 divide-y divide-border/30">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <CheckCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-foreground">
                  All caught up!
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  No pending orders, withdrawals, or tickets in this filter.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const isRead = readIds.includes(item.id);

                return (
                  <Link
                    key={item.id}
                    href={item.linkUrl}
                    onClick={() => {
                      markAsRead(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl transition-all duration-150 group relative cursor-pointer pt-3",
                      isRead
                        ? "bg-card hover:bg-muted/50 opacity-80"
                        : "bg-accent/40 hover:bg-accent/70 border border-primary/20 shadow-xs"
                    )}
                  >
                    {/* Unread blue dot */}
                    {!isRead && (
                      <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        item.category === "WITHDRAWAL" && "bg-rose-500/10 text-rose-500",
                        item.category === "ORDER" && "bg-amber-500/10 text-amber-500",
                        item.category === "DEPOSIT" && "bg-blue-500/10 text-blue-500",
                        item.category === "SUPPORT" && "bg-purple-500/10 text-purple-500",
                        item.category === "HOMEWORK" && "bg-indigo-500/10 text-indigo-500",
                        item.category === "COMMUNITY" && "bg-emerald-500/10 text-emerald-500"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground leading-tight">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.2 rounded-md border shrink-0",
                            getBadgeStyles(item.badgeVariant)
                          )}
                        >
                          {item.statusBadge}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                        {item.amount && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-foreground">
                              {item.amount}
                            </span>
                          </>
                        )}
                        <span className="ml-auto inline-flex items-center gap-0.5 text-primary font-bold group-hover:translate-x-0.5 transition-transform">
                          Review <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="border-t border-border/80 bg-muted/20 p-2.5 px-3 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="hover:text-primary transition-colors font-medium"
              >
                Orders
              </Link>
              <span>•</span>
              <Link
                href="/admin/withdrawals"
                onClick={() => setIsOpen(false)}
                className="hover:text-primary transition-colors font-medium"
              >
                Withdrawals
              </Link>
              <span>•</span>
              <Link
                href="/admin/copy-trading"
                onClick={() => setIsOpen(false)}
                className="hover:text-primary transition-colors font-medium"
              >
                Copy Trading
              </Link>
            </div>
            <span className="text-[10px] text-muted-foreground">Auto-sync 30s</span>
          </div>
        </div>
      )}
    </div>
  );
}
