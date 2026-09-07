"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { getStudentNotificationsAction } from "@/server/actions/notifications.actions";
import type { StudentNotificationItem } from "@/types/economic-news";

const STORAGE_KEY_READ = "sw30_read_notifications";

export function StudentNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"ALL" | "NEWS" | "UPDATES">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_READ);
      if (saved) {
        setReadIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await getStudentNotificationsAction();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 90 seconds for fresh news / announcements
    const interval = setInterval(fetchNotifications, 90000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;
  const hasHighUrgency = notifications.some(
    (n) => !readIds.includes(n.id) && n.urgency === "HIGH"
  );

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleMarkItemRead = (id: string) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "NEWS") return n.type === "NEWS_ALERT";
    if (filter === "UPDATES") return n.type === "ADMIN_UPDATE" || n.type === "SYSTEM";
    return true;
  });

  const newsCount = notifications.filter((n) => n.type === "NEWS_ALERT").length;
  const updatesCount = notifications.filter((n) => n.type !== "NEWS_ALERT").length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground cursor-pointer"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black text-white shadow ${
              hasHighUrgency ? "bg-red-500 animate-pulse" : "bg-amber-500"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-black tracking-tight text-foreground">
                Notifications &amp; Alerts
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.2 text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  Read All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border/60 bg-card px-3 py-1.5 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filter === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("NEWS")}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filter === "NEWS"
                  ? "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              🔴 News ({newsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("UPDATES")}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filter === "UPDATES"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              📢 Admin ({updatesCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-foreground">No alerts right now</p>
                <p className="text-[11px] text-muted-foreground">
                  You're all caught up! High-impact economic news alerts and mentor updates will show up here.
                </p>
              </div>
            ) : (
              filteredNotifs.map((item) => {
                const isRead = readIds.includes(item.id);
                const isNews = item.type === "NEWS_ALERT";
                const isHigh = item.urgency === "HIGH";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkItemRead(item.id)}
                    className={`p-3.5 transition-colors cursor-pointer hover:bg-muted/30 ${
                      !isRead
                        ? isHigh
                          ? "bg-red-500/5 border-l-2 border-red-500"
                          : "bg-amber-500/5 border-l-2 border-amber-500"
                        : "opacity-80"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs ${
                          isNews
                            ? isHigh
                              ? "bg-red-500/20 text-red-500"
                              : "bg-amber-500/20 text-amber-500"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {isNews ? (isHigh ? "🔴" : "📅") : "📢"}
                      </span>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-foreground leading-snug">
                            {item.title}
                          </p>
                          {!isRead && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>

                        {item.linkUrl && (
                          <Link
                            href={item.linkUrl}
                            onClick={() => {
                              handleMarkItemRead(item.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline pt-0.5"
                          >
                            Open Event in Journal <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/80 bg-muted/20 px-3 py-2 text-center">
            <Link
              href="/dashboard/journal"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Go to Trading Journal &amp; Economic Calendar <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Top Notification Bar / Banner for High Impact News or Urgent Admin Alerts
 */
export function StudentTopAlertBanner() {
  const [banner, setBanner] = useState<StudentNotificationItem | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStudentNotificationsAction().then((res) => {
      if (mounted && res.success && res.upcomingHighImpactBanner) {
        setBanner(res.upcomingHighImpactBanner);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!banner || isDismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-600 text-white px-3 sm:px-4 py-2 shadow-md flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2 truncate">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/30 text-white font-black text-xs">
          ⚠️
        </span>
        <span className="truncate">
          <strong className="tracking-wide uppercase font-black mr-1.5">
            HIGH IMPACT NEWS WARNING:
          </strong>
          {banner.title} &mdash; {banner.message}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/dashboard/journal"
          className="rounded-lg bg-black/40 hover:bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white transition-colors"
        >
          View Calendar
        </Link>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="rounded-lg p-1 hover:bg-black/20 text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
