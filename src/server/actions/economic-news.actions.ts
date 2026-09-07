"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite } from "@/server/dal/auth";
import type { EconomicNewsEvent, EconomicNewsFeedData } from "@/types/economic-news";

const SETTING_KEY_NEWS = "economic_news_feed";
const SETTING_KEY_NOTIFS = "student_announcements";

const FF_THIS_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const FF_NEXT_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_nextweek.json";

function parseFeedData(raw: string | null): EconomicNewsFeedData {
  if (!raw) {
    return {
      lastSyncedAt: null,
      lastSyncedMs: null,
      syncedBy: null,
      events: [],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      lastSyncedAt: parsed.lastSyncedAt || null,
      lastSyncedMs: parsed.lastSyncedMs || null,
      syncedBy: parsed.syncedBy || null,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return {
      lastSyncedAt: null,
      lastSyncedMs: null,
      syncedBy: null,
      events: [],
    };
  }
}

async function saveFeedData(data: EconomicNewsFeedData) {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY_NEWS },
    update: {
      value: JSON.stringify(data),
      type: "json",
    },
    create: {
      key: SETTING_KEY_NEWS,
      value: JSON.stringify(data),
      type: "json",
    },
  });
}

/**
 * Public/Student & Admin action to get the Economic News Feed
 */
export async function getEconomicNewsAction(): Promise<{
  success: boolean;
  data: EconomicNewsFeedData;
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const data = parseFeedData(setting ? setting.value : null);

    // Sort chronologically
    data.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      data: {
        lastSyncedAt: null,
        lastSyncedMs: null,
        syncedBy: null,
        events: [],
      },
    };
  }
}

/**
 * Admin action to fetch directly from Forex Factory JSON endpoint
 */
export async function syncForexFactoryAction(includeNextWeek: boolean = false): Promise<{
  success: boolean;
  message: string;
  count?: number;
  highCount?: number;
}> {
  const admin = await requireAdminWrite();

  try {
    const urls = [FF_THIS_WEEK_URL];
    if (includeNextWeek) {
      urls.push(FF_NEXT_WEEK_URL);
    }

    let allRawEvents: any[] = [];

    for (const url of urls) {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error(`Forex Factory responded with status ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        allRawEvents = allRawEvents.concat(json);
      }
    }

    if (allRawEvents.length === 0) {
      return { success: false, message: "No events received from Forex Factory feed." };
    }

    // Existing feed
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const currentFeed = parseFeedData(setting ? setting.value : null);

    // Retain manually added events
    const manualEvents = currentFeed.events.filter((e) => e.source === "manual");

    // Convert FF events
    const syncedEvents: EconomicNewsEvent[] = allRawEvents.map((ev: any) => {
      const d = new Date(ev.date);
      let impact: "High" | "Medium" | "Low" | "Holiday" = "Low";
      if (ev.impact === "High") impact = "High";
      else if (ev.impact === "Medium") impact = "Medium";
      else if (ev.impact === "Low") impact = "Low";
      else if (ev.impact === "Holiday") impact = "Holiday";

      const sanitizedTitle = (ev.title || "Economic Event").trim();
      const country = (ev.country || "ALL").trim().toUpperCase();

      return {
        id: `ff_${d.getTime()}_${country}_${sanitizedTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`,
        title: sanitizedTitle,
        country,
        date: d.toISOString(),
        impact,
        forecast: ev.forecast ? String(ev.forecast) : "",
        previous: ev.previous ? String(ev.previous) : "",
        source: "ff" as const,
        createdAt: new Date().toISOString(),
      };
    });

    // Deduplicate
    const seen = new Set<string>();
    const deduped: EconomicNewsEvent[] = [];
    for (const ev of syncedEvents) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        deduped.push(ev);
      }
    }

    const merged = [...manualEvents, ...deduped];
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const now = new Date();
    const formattedSyncTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const newFeed: EconomicNewsFeedData = {
      lastSyncedAt: formattedSyncTime,
      lastSyncedMs: now.getTime(),
      syncedBy: admin.name || admin.email,
      events: merged,
    };

    await saveFeedData(newFeed);

    const highCount = deduped.filter((e) => e.impact === "High").length;

    // Also push an announcement to students about the updated economic calendar
    try {
      const notifSetting = await prisma.siteSetting.findUnique({
        where: { key: SETTING_KEY_NOTIFS },
      });
      let currentNotifs: any[] = [];
      if (notifSetting?.value) {
        try {
          currentNotifs = JSON.parse(notifSetting.value);
        } catch {}
      }

      const newNotif = {
        id: `notif_news_${Date.now()}`,
        title: `📅 Economic Calendar Updated (${formattedSyncTime})`,
        message: `Admin synced ${deduped.length} Forex Factory events (${highCount} High Impact). Check the Economic News tab in your Trading Journal!`,
        type: "NEWS_ALERT",
        urgency: highCount > 0 ? "HIGH" : "MEDIUM",
        createdAt: new Date().toISOString(),
        linkUrl: "/dashboard/journal",
      };

      // Keep last 25 notifications
      const updatedNotifs = [newNotif, ...currentNotifs.slice(0, 24)];
      await prisma.siteSetting.upsert({
        where: { key: SETTING_KEY_NOTIFS },
        update: { value: JSON.stringify(updatedNotifs), type: "json" },
        create: { key: SETTING_KEY_NOTIFS, value: JSON.stringify(updatedNotifs), type: "json" },
      });
    } catch {
      // ignore
    }

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: `Successfully synced ${deduped.length} events from Forex Factory (${highCount} High Impact)!`,
      count: deduped.length,
      highCount,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to auto-sync with Forex Factory. Please use the Manual JSON Paste fallback below.",
    };
  }
}

/**
 * Admin action: Paste raw Forex Factory JSON and import directly (100% Reliable Fallback)
 */
export async function importForexFactoryJsonAction(jsonString: string): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  const admin = await requireAdminWrite();

  const trimmed = jsonString.trim();
  if (!trimmed) {
    return { success: false, message: "Please paste valid JSON text into the box." };
  }

  try {
    const rawEvents = JSON.parse(trimmed);
    if (!Array.isArray(rawEvents)) {
      return { success: false, message: "Invalid format: Expected a JSON array of events." };
    }

    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const currentFeed = parseFeedData(setting ? setting.value : null);
    const manualEvents = currentFeed.events.filter((e) => e.source === "manual");

    const syncedEvents: EconomicNewsEvent[] = rawEvents.map((ev: any) => {
      const d = new Date(ev.date);
      let impact: "High" | "Medium" | "Low" | "Holiday" = "Low";
      if (ev.impact === "High") impact = "High";
      else if (ev.impact === "Medium") impact = "Medium";
      else if (ev.impact === "Low") impact = "Low";
      else if (ev.impact === "Holiday") impact = "Holiday";

      const sanitizedTitle = (ev.title || "Economic Event").trim();
      const country = (ev.country || "ALL").trim().toUpperCase();

      return {
        id: `ff_${d.getTime()}_${country}_${sanitizedTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`,
        title: sanitizedTitle,
        country,
        date: d.toISOString(),
        impact,
        forecast: ev.forecast ? String(ev.forecast) : "",
        previous: ev.previous ? String(ev.previous) : "",
        source: "ff" as const,
        createdAt: new Date().toISOString(),
      };
    });

    const seen = new Set<string>();
    const deduped: EconomicNewsEvent[] = [];
    for (const ev of syncedEvents) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        deduped.push(ev);
      }
    }

    const merged = [...manualEvents, ...deduped];
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const now = new Date();
    const formattedSyncTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const highCount = deduped.filter((e) => e.impact === "High").length;

    const newFeed: EconomicNewsFeedData = {
      lastSyncedAt: formattedSyncTime,
      lastSyncedMs: now.getTime(),
      syncedBy: admin.name || admin.email,
      events: merged,
    };

    await saveFeedData(newFeed);

    // Push announcement
    try {
      const notifSetting = await prisma.siteSetting.findUnique({
        where: { key: SETTING_KEY_NOTIFS },
      });
      let currentNotifs: any[] = [];
      if (notifSetting?.value) {
        try {
          currentNotifs = JSON.parse(notifSetting.value);
        } catch {}
      }

      const newNotif = {
        id: `notif_news_${Date.now()}`,
        title: `📅 Economic Calendar Updated (${formattedSyncTime})`,
        message: `Admin imported ${deduped.length} Forex Factory events (${highCount} High Impact).`,
        type: "NEWS_ALERT",
        urgency: highCount > 0 ? "HIGH" : "MEDIUM",
        createdAt: new Date().toISOString(),
        linkUrl: "/dashboard/journal",
      };

      const updatedNotifs = [newNotif, ...currentNotifs.slice(0, 24)];
      await prisma.siteSetting.upsert({
        where: { key: SETTING_KEY_NOTIFS },
        update: { value: JSON.stringify(updatedNotifs), type: "json" },
        create: { key: SETTING_KEY_NOTIFS, value: JSON.stringify(updatedNotifs), type: "json" },
      });
    } catch {
      // ignore
    }

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: `Successfully imported ${deduped.length} events from JSON (${highCount} High Impact)!`,
      count: deduped.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Invalid JSON format: ${err.message}`,
    };
  }
}

/**
 * Admin action to add a manual custom economic news event
 */
export async function saveManualNewsEventAction(input: {
  title: string;
  country: string;
  date: string;
  impact: "High" | "Medium" | "Low" | "Holiday";
  forecast?: string;
  previous?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  await requireAdminWrite();

  if (!input.title?.trim()) {
    return { success: false, message: "Event title is required." };
  }
  if (!input.date) {
    return { success: false, message: "Date & Time is required." };
  }

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const currentFeed = parseFeedData(setting ? setting.value : null);

    const newEvent: EconomicNewsEvent = {
      id: `manual_${Date.now()}_${input.country.toUpperCase()}`,
      title: input.title.trim(),
      country: (input.country || "USD").toUpperCase().trim(),
      date: new Date(input.date).toISOString(),
      impact: input.impact || "High",
      forecast: input.forecast?.trim() || "",
      previous: input.previous?.trim() || "",
      source: "manual",
      createdAt: new Date().toISOString(),
    };

    currentFeed.events.push(newEvent);
    currentFeed.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    await saveFeedData(currentFeed);

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: "Custom Economic Event added successfully!",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to save event.",
    };
  }
}

/**
 * Admin action to delete a news event
 */
export async function deleteNewsEventAction(eventId: string): Promise<{
  success: boolean;
  message: string;
}> {
  await requireAdminWrite();

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const currentFeed = parseFeedData(setting ? setting.value : null);

    currentFeed.events = currentFeed.events.filter((e) => e.id !== eventId);
    await saveFeedData(currentFeed);

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: "Event deleted successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete event.",
    };
  }
}

/**
 * Admin action to clear all news events
 */
export async function clearAllNewsEventsAction(): Promise<{
  success: boolean;
  message: string;
}> {
  await requireAdminWrite();

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_NEWS },
    });
    const currentFeed = parseFeedData(setting ? setting.value : null);

    currentFeed.events = [];
    currentFeed.lastSyncedAt = null;
    currentFeed.lastSyncedMs = null;
    await saveFeedData(currentFeed);

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return {
      success: true,
      message: "All economic news events cleared.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to clear events.",
    };
  }
}
