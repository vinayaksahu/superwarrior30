"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, getCurrentUser } from "@/server/dal/auth";
import type { StudentNotificationItem, EconomicNewsFeedData } from "@/types/economic-news";

const SETTING_KEY_NOTIFS = "student_announcements";
const SETTING_KEY_NEWS = "economic_news_feed";

function parseNotifs(raw: string | null): StudentNotificationItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Get active notifications for students
 * Returns both admin announcements AND auto-detected high-impact economic news within 24h
 */
export async function getStudentNotificationsAction(): Promise<{
  success: boolean;
  notifications: StudentNotificationItem[];
  highImpactCount: number;
  upcomingHighImpactBanner: StudentNotificationItem | null;
}> {
  try {
    const [notifSetting, newsSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: SETTING_KEY_NOTIFS } }),
      prisma.siteSetting.findUnique({ where: { key: SETTING_KEY_NEWS } }),
    ]);

    const adminNotifs = parseNotifs(notifSetting?.value || null);

    // Filter unexpired notifications
    const nowMs = Date.now();
    const activeAdminNotifs = adminNotifs.filter((n) => {
      if (!n.expiresAt) return true;
      return new Date(n.expiresAt).getTime() > nowMs;
    });

    // Detect high-impact news from feed occurring within the next 24 hours
    const autoNewsNotifs: StudentNotificationItem[] = [];
    let bannerItem: StudentNotificationItem | null = null;
    let highImpactCount = 0;

    if (newsSetting?.value) {
      try {
        const feedData: EconomicNewsFeedData = JSON.parse(newsSetting.value);
        if (Array.isArray(feedData.events)) {
          const highEvents = feedData.events.filter((e) => e.impact === "High");
          highImpactCount = highEvents.length;

          // Look for high events between (now - 30min) and (now + 24 hours)
          const windowStart = nowMs - 30 * 60 * 1000;
          const windowEnd = nowMs + 24 * 60 * 60 * 1000;

          for (const ev of highEvents) {
            const evTime = new Date(ev.date).getTime();
            if (evTime >= windowStart && evTime <= windowEnd) {
              const diffMinutes = Math.round((evTime - nowMs) / 60000);
              let timingText = "";
              if (diffMinutes <= 0 && diffMinutes >= -30) {
                timingText = "🔴 LIVE / JUST RELEASED!";
              } else if (diffMinutes <= 60) {
                timingText = `In ${diffMinutes} minutes`;
              } else {
                const hours = Math.round(diffMinutes / 60);
                timingText = `In ~${hours} hours`;
              }

              const notifItem: StudentNotificationItem = {
                id: `auto_${ev.id}`,
                title: `🔴 High Impact: ${ev.country} - ${ev.title}`,
                message: `${timingText} | Forecast: ${ev.forecast || "N/A"} | Previous: ${ev.previous || "N/A"}. High volatility expected!`,
                type: "NEWS_ALERT",
                urgency: "HIGH",
                createdAt: ev.date,
                linkUrl: "/dashboard/journal",
              };

              autoNewsNotifs.push(notifItem);

              // If an event is within next 2 hours, select it for top banner
              if (diffMinutes > -15 && diffMinutes <= 120 && !bannerItem) {
                bannerItem = notifItem;
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // Merge: High impact news alerts first, then admin updates
    const all = [...autoNewsNotifs, ...activeAdminNotifs];

    return {
      success: true,
      notifications: all,
      highImpactCount,
      upcomingHighImpactBanner: bannerItem,
    };
  } catch (err: any) {
    return {
      success: false,
      notifications: [],
      highImpactCount: 0,
      upcomingHighImpactBanner: null,
    };
  }
}

/**
 * Admin action to broadcast an announcement or update
 */
export async function createAdminAnnouncementAction(input: {
  title: string;
  message: string;
  type?: "NEWS_ALERT" | "ADMIN_UPDATE" | "SYSTEM";
  urgency?: "HIGH" | "MEDIUM" | "LOW";
  linkUrl?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const admin = await requireAdminWrite();

  if (!input.title?.trim() || !input.message?.trim()) {
    return { success: false, message: "Title and message are required." };
  }

  try {
    const notifSetting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NOTIFS },
    });
    const current = parseNotifs(notifSetting?.value || null);

    const newNotif: StudentNotificationItem = {
      id: `ann_${Date.now()}`,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type || "ADMIN_UPDATE",
      urgency: input.urgency || "MEDIUM",
      createdAt: new Date().toISOString(),
      linkUrl: input.linkUrl?.trim() || undefined,
    };

    const updated = [newNotif, ...current.slice(0, 49)];

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY_NOTIFS },
      update: { value: JSON.stringify(updated), type: "json" },
      create: { key: SETTING_KEY_NOTIFS, value: JSON.stringify(updated), type: "json" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: "Announcement broadcasted to students successfully!",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to broadcast announcement.",
    };
  }
}

/**
 * Admin action to delete an announcement
 */
export async function deleteAdminAnnouncementAction(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  await requireAdminWrite();

  try {
    const notifSetting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NOTIFS },
    });
    const current = parseNotifs(notifSetting?.value || null);
    const updated = current.filter((n) => n.id !== id);

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY_NOTIFS },
      update: { value: JSON.stringify(updated), type: "json" },
      create: { key: SETTING_KEY_NOTIFS, value: JSON.stringify(updated), type: "json" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/journal");

    return {
      success: true,
      message: "Announcement removed.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to delete announcement.",
    };
  }
}
