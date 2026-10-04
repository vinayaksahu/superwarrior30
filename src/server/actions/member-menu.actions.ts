"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/dal/auth";
import type { ActionState } from "@/types";
import {
  MemberMenuItemConfig,
  DEFAULT_MEMBER_MENU_ITEMS,
} from "@/lib/member-menu-config";

const SETTING_KEY = "member_portal_menu_config";

/**
 * Fetch member menu configuration.
 * Returns the list of menu items with their enabled status.
 */
export async function getMemberMenuSettingsAction(): Promise<{
  items: MemberMenuItemConfig[];
  visibilityMap: Record<string, boolean>;
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    let savedConfig: { key: string; isEnabled: boolean }[] = [];
    if (setting?.value) {
      try {
        savedConfig = JSON.parse(setting.value);
      } catch {
        savedConfig = [];
      }
    }

    const savedMap = new Map<string, boolean>();
    if (Array.isArray(savedConfig)) {
      for (const item of savedConfig) {
        if (item && typeof item.key === "string") {
          savedMap.set(item.key, item.isEnabled !== false);
        }
      }
    }

    const mergedItems: MemberMenuItemConfig[] = DEFAULT_MEMBER_MENU_ITEMS.map((def) => {
      const isEnabled = savedMap.has(def.key) ? Boolean(savedMap.get(def.key)) : def.isEnabled;
      return {
        ...def,
        isEnabled,
      };
    });

    const visibilityMap: Record<string, boolean> = {};
    for (const item of mergedItems) {
      visibilityMap[item.key] = item.isEnabled;
      visibilityMap[item.href] = item.isEnabled;
    }

    return {
      items: mergedItems,
      visibilityMap,
    };
  } catch (error) {
    console.error("Failed to fetch member menu settings:", error);
    const visibilityMap: Record<string, boolean> = {};
    for (const item of DEFAULT_MEMBER_MENU_ITEMS) {
      visibilityMap[item.key] = item.isEnabled;
      visibilityMap[item.href] = item.isEnabled;
    }
    return {
      items: DEFAULT_MEMBER_MENU_ITEMS,
      visibilityMap,
    };
  }
}

/**
 * Save member menu configuration.
 * Only administrators with `settings.general.manage` permission can update.
 */
export async function saveMemberMenuSettingsAction(
  items: { key: string; isEnabled: boolean }[]
): Promise<ActionState<{ success: boolean }>> {
  try {
    const admin = await requirePermission("settings.general.manage");

    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: "Invalid menu configuration data." };
    }

    // Sanitize
    const sanitizedData = items.map((item) => ({
      key: String(item.key).trim(),
      isEnabled: Boolean(item.isEnabled),
    }));

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(sanitizedData),
        type: "json",
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(sanitizedData),
        type: "json",
      },
    });

    // Record audit log if table exists
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "SETTINGS_UPDATED",
          entityType: "SiteSetting",
          entityId: SETTING_KEY,
          newValues: {
            updatedItemsCount: sanitizedData.length,
            disabledItems: sanitizedData.filter((i) => !i.isEnabled).map((i) => i.key),
          },
        },
      });
    } catch {
      // Non-blocking if audit log is disabled or fails
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin/settings/member-menu");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Member portal menu settings saved successfully.",
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Error saving member menu settings:", error);
    return {
      success: false,
      message: error?.message || "Failed to save member menu settings.",
    };
  }
}
