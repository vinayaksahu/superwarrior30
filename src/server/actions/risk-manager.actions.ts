"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminWrite } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import type {
  AcademyRiskRules,
  CalculatedRiskState,
  StudentRiskData,
  StudentRiskProfile,
} from "@/types/risk-manager";

const SETTING_KEY_RULES = "academy_risk_rules";

export const DEFAULT_ACADEMY_RISK_RULES: AcademyRiskRules = {
  maxConsecutiveLosses: 2,
  maxTradesPerDay: 3,
  minRiskRewardRatio: 3,
  defaultRiskPercent: 4,
  defaultMaxDailyLoss: 6,
  defaultMaxWeeklyLoss: 15,
  revengeBreakMinutes: 15,
  llRuleTitle: "LL Rule",
  llRuleText: "2 consecutive losses → stop trading for the day. No exceptions.",
  noRevengeTitle: "No Revenge",
  noRevengeText: "15 min mandatory break after a loss. Trade only when neutral.",
  maxRiskTitle: "Max Risk",
  maxRiskText: "Max risk per trade (4%). Min 1:3 RRR.",
};

const DEFAULT_STUDENT_PROFILE: StudentRiskProfile = {
  accountBalance: 70,
  riskPerTradePercent: 4,
  maxDailyLoss: 6,
  maxWeeklyLoss: 15,
};

// ==========================================
// 1. GET ACADEMY RISK RULES (ADMIN & STUDENT)
// ==========================================

export async function getAcademyRiskRulesAction(): Promise<AcademyRiskRules> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY_RULES },
    });
    if (!setting?.value) return DEFAULT_ACADEMY_RISK_RULES;
    const parsed = JSON.parse(setting.value);
    return { ...DEFAULT_ACADEMY_RISK_RULES, ...parsed };
  } catch {
    return DEFAULT_ACADEMY_RISK_RULES;
  }
}

// ==========================================
// 2. SAVE ACADEMY RISK RULES (ADMIN ONLY)
// ==========================================

export async function saveAcademyRiskRulesAction(rules: Partial<AcademyRiskRules>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireAdminWrite();

    const current = await getAcademyRiskRulesAction();
    const updated: AcademyRiskRules = {
      ...current,
      ...rules,
      maxConsecutiveLosses: Math.max(1, Number(rules.maxConsecutiveLosses) || 2),
      maxTradesPerDay: Math.max(1, Number(rules.maxTradesPerDay) || 3),
      minRiskRewardRatio: Math.max(1, Number(rules.minRiskRewardRatio) || 3),
      defaultRiskPercent: Math.max(0.5, Math.min(20, Number(rules.defaultRiskPercent) || 4)),
      revengeBreakMinutes: Math.max(5, Number(rules.revengeBreakMinutes) || 15),
    };

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY_RULES },
      update: {
        value: JSON.stringify(updated),
        type: "json",
      },
      create: {
        key: SETTING_KEY_RULES,
        value: JSON.stringify(updated),
        type: "json",
      },
    });

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");
    return { success: true };
  } catch (error) {
    console.error("Error saving academy risk rules:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save risk rules",
    };
  }
}

// ==========================================
// 3. GET STUDENT RISK DATA & LIVE CALCULATIONS
// ==========================================

export async function getStudentRiskDataAction(): Promise<{
  success: boolean;
  data: StudentRiskData;
  error?: string;
}> {
  const fallbackData: StudentRiskData = {
    rules: DEFAULT_ACADEMY_RISK_RULES,
    profile: DEFAULT_STUDENT_PROFILE,
    calculated: {
      riskPerTradeDollars: 2.8,
      maxTradesPerDay: 2,
      dailyBuffer: 3.2,
      usedToday: 0,
      remainingRisk: 6,
      tradesTakenToday: 0,
      consecutiveLossesToday: 0,
      isLLRuleBreached: false,
      isMaxTradesBreached: false,
      status: "SAFE",
      statusMessage: "SAFE — Risk within limits.",
    },
  };

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, data: fallbackData, error: "Unauthorized" };
  }

  try {
    await ensureDatabaseSchemaSync();

    const rules = await getAcademyRiskRulesAction();

    // Fetch student's custom profile from SiteSetting
    let profile = { ...DEFAULT_STUDENT_PROFILE };
    try {
      const studentSettingKey = `student_risk_profile_${user.id}`;
      const studentSetting = await prisma.siteSetting.findUnique({
        where: { key: studentSettingKey },
      });
      if (studentSetting?.value) {
        const parsed = JSON.parse(studentSetting.value);
        profile = {
          accountBalance: Math.max(1, Number(parsed.accountBalance) || 70),
          riskPerTradePercent: Math.max(0.5, Math.min(50, Number(parsed.riskPerTradePercent) || 4)),
          maxDailyLoss: Math.max(1, Number(parsed.maxDailyLoss) || 6),
          maxWeeklyLoss: Math.max(1, Number(parsed.maxWeeklyLoss) || 15),
        };
      }
    } catch {
      // Use fallback
    }

    // Calculate today's range in Indian Standard Time (IST, UTC+5:30)
    const nowUtc = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
    const startOfTodayIst = new Date(
      Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - istOffsetMs
    );

    // Fetch today's logged trades for current user
    const todaysTrades = await prisma.tradeJournal.findMany({
      where: {
        userId: user.id,
        tradedAt: { gte: startOfTodayIst },
      },
      orderBy: { tradedAt: "asc" },
      select: {
        id: true,
        outcome: true,
        pnl: true,
        riskAmount: true,
        tradedAt: true,
      },
    });

    const tradesTakenToday = todaysTrades.length;

    // Calculate used risk today (sum of negative PnL or risk amounts from losses)
    let usedToday = 0;
    for (const trade of todaysTrades) {
      if (trade.pnl !== null && trade.pnl < 0) {
        usedToday += Math.abs(trade.pnl);
      } else if (trade.outcome === "LOSS" && trade.riskAmount) {
        usedToday += Math.abs(trade.riskAmount);
      }
    }
    usedToday = Math.round(usedToday * 100) / 100;

    // Compute consecutive losses at the tail of today's trades (LL Rule)
    let consecutiveLossesToday = 0;
    for (let i = todaysTrades.length - 1; i >= 0; i--) {
      const t = todaysTrades[i];
      if (t.outcome === "LOSS" || (t.pnl !== null && t.pnl < 0)) {
        consecutiveLossesToday++;
      } else if (t.outcome === "WIN" || (t.pnl !== null && t.pnl > 0)) {
        break; // streak broken by a win
      }
    }

    // Formulas matching screenshot:
    // Risk $ / Trade = Account Balance * (Risk % / 100)
    const riskPerTradeDollars =
      Math.round(profile.accountBalance * (profile.riskPerTradePercent / 100) * 100) / 100;

    // Max Trades / Day = Based on Daily Loss divided by risk per trade or admin max
    const calculatedMaxTrades =
      riskPerTradeDollars > 0
        ? Math.max(1, Math.floor(profile.maxDailyLoss / riskPerTradeDollars))
        : rules.maxTradesPerDay;
    const maxTradesPerDay = Math.min(calculatedMaxTrades, rules.maxTradesPerDay || 3);

    // Daily Buffer = Max Daily Loss - Risk $/Trade
    const dailyBuffer = Math.max(
      0,
      Math.round((profile.maxDailyLoss - riskPerTradeDollars) * 100) / 100
    );

    // Remaining Risk = Max Daily Loss - Used Today
    const remainingRisk = Math.max(
      0,
      Math.round((profile.maxDailyLoss - usedToday) * 100) / 100
    );

    // Breach flags
    const isLLRuleBreached = consecutiveLossesToday >= rules.maxConsecutiveLosses;
    const isMaxTradesBreached = tradesTakenToday >= maxTradesPerDay;
    const isDailyLossBreached = remainingRisk <= 0 && usedToday > 0;

    let status: "SAFE" | "WARNING" | "BREACHED" = "SAFE";
    let statusMessage = "SAFE — Risk within limits.";

    if (isLLRuleBreached) {
      status = "BREACHED";
      statusMessage = `LL RULE BREACHED — ${consecutiveLossesToday} consecutive losses! Stop trading for the day.`;
    } else if (isDailyLossBreached) {
      status = "BREACHED";
      statusMessage = "MAX DAILY LOSS REACHED — Stop trading for the day to preserve capital.";
    } else if (isMaxTradesBreached) {
      status = "BREACHED";
      statusMessage = `MAX TRADES REACHED — ${tradesTakenToday}/${maxTradesPerDay} trades completed today.`;
    } else if (usedToday > 0 || tradesTakenToday >= maxTradesPerDay - 1 || consecutiveLossesToday === 1) {
      status = "WARNING";
      statusMessage = "WARNING — Approaching risk limits. Follow discipline rules strictly.";
    }

    const calculated: CalculatedRiskState = {
      riskPerTradeDollars,
      maxTradesPerDay,
      dailyBuffer,
      usedToday,
      remainingRisk,
      tradesTakenToday,
      consecutiveLossesToday,
      isLLRuleBreached,
      isMaxTradesBreached,
      status,
      statusMessage,
    };

    return {
      success: true,
      data: {
        rules,
        profile,
        calculated,
      },
    };
  } catch (error) {
    console.error("Error fetching student risk data:", error);
    return {
      success: false,
      data: fallbackData,
      error: error instanceof Error ? error.message : "Failed to load risk data",
    };
  }
}

// ==========================================
// 4. SAVE STUDENT RISK PROFILE
// ==========================================

export async function saveStudentRiskProfileAction(
  profile: StudentRiskProfile
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const studentSettingKey = `student_risk_profile_${user.id}`;
    const sanitized: StudentRiskProfile = {
      accountBalance: Math.max(1, Math.round(Number(profile.accountBalance) || 70)),
      riskPerTradePercent: Math.max(0.5, Math.min(50, Math.round((Number(profile.riskPerTradePercent) || 4) * 10) / 10)),
      maxDailyLoss: Math.max(1, Math.round(Number(profile.maxDailyLoss) || 6)),
      maxWeeklyLoss: Math.max(1, Math.round(Number(profile.maxWeeklyLoss) || 15)),
    };

    await prisma.siteSetting.upsert({
      where: { key: studentSettingKey },
      update: {
        value: JSON.stringify(sanitized),
        type: "json",
      },
      create: {
        key: studentSettingKey,
        value: JSON.stringify(sanitized),
        type: "json",
      },
    });

    revalidatePath("/dashboard/journal");
    return { success: true };
  } catch (error) {
    console.error("Error saving student risk profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save risk profile",
    };
  }
}
