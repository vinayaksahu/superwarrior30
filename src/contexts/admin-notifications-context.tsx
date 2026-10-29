"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  getAdminNotificationsAction,
  type AdminNotificationItem,
  type AdminNotificationsPayload,
} from "@/server/actions/admin-notifications.actions";
import {
  isSoundEnabled,
  setSoundEnabled,
  playIncomeSound,
  playNotificationSound,
} from "@/lib/sound/notification-sound";

const STORAGE_READ_KEY = "sw30_admin_read_notifications";
const STORAGE_SOUND_KEY = "sw30_admin_sound_enabled";

interface AdminNotificationsContextValue {
  notifications: AdminNotificationItem[];
  counts: AdminNotificationsPayload["counts"];
  readIds: string[];
  unreadCount: number;
  isLoading: boolean;
  soundActive: boolean;
  toggleSound: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
}

const defaultCounts: AdminNotificationsPayload["counts"] = {
  totalPending: 0,
  pendingOrders: 0,
  pendingWithdrawals: 0,
  pendingDeposits: 0,
  openTickets: 0,
  pendingHomework: 0,
  pendingCommunity: 0,
};

const AdminNotificationsContext = createContext<AdminNotificationsContextValue>({
  notifications: [],
  counts: defaultCounts,
  readIds: [],
  unreadCount: 0,
  isLoading: false,
  soundActive: true,
  toggleSound: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  refresh: async () => {},
});

export function AdminNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [counts, setCounts] = useState<AdminNotificationsPayload["counts"]>(defaultCounts);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  const knownIdsRef = useRef<string[]>([]);
  const isInitialLoadDoneRef = useRef(false);

  // Initialize sound preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SOUND_KEY);
      if (saved !== null) {
        setSoundActive(saved !== "false");
      } else {
        setSoundActive(isSoundEnabled());
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize read notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_READ_KEY);
      if (saved) {
        setReadIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_SOUND_KEY, next ? "true" : "false");
        setSoundEnabled(next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [id, ...prev].slice(0, 500);
      try {
        localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((currentNotifs) => {
      const allIds = currentNotifs.map((n) => n.id);
      setReadIds((prev) => {
        const combined = Array.from(new Set([...allIds, ...prev])).slice(0, 500);
        try {
          localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(combined));
        } catch {
          // ignore
        }
        return combined;
      });
      return currentNotifs;
    });
  }, []);

  const fetchAlerts = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    try {
      const res = await getAdminNotificationsAction();
      if (res.success) {
        setNotifications(res.notifications);
        setCounts(res.counts);

        // Sound alert for genuinely new urgent incoming items
        if (isInitialLoadDoneRef.current && res.notifications.length > 0) {
          const prevSet = new Set(knownIdsRef.current);
          const newItems = res.notifications.filter((n) => !prevSet.has(n.id));

          if (newItems.length > 0) {
            const hasUrgentFinancial = newItems.some(
              (n) => n.category === "ORDER" || n.category === "WITHDRAWAL" || n.category === "DEPOSIT"
            );

            if (hasUrgentFinancial) {
              playIncomeSound();
            } else {
              playNotificationSound();
            }
          }
        }

        knownIdsRef.current = res.notifications.map((n) => n.id);
        isInitialLoadDoneRef.current = true;
      }
    } catch (err) {
      console.error("[AdminNotificationsProvider] fetch error:", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  // Initial fetch and 30s background interval
  useEffect(() => {
    fetchAlerts(false);

    const interval = setInterval(() => {
      fetchAlerts(true);
    }, 30000);

    const handleFocus = () => {
      fetchAlerts(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchAlerts]);

  // Compute unread count
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <AdminNotificationsContext.Provider
      value={{
        notifications,
        counts,
        readIds,
        unreadCount,
        isLoading,
        soundActive,
        toggleSound,
        markAsRead,
        markAllAsRead,
        refresh: () => fetchAlerts(false),
      }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  return useContext(AdminNotificationsContext);
}
