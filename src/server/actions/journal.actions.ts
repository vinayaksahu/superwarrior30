"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import type { CreateTradeInput } from "@/types";


// ==========================================
// 1. STUDENT: GET JOURNAL & STATS
// ==========================================

export async function getStudentJournalAction({
  page = 1,
  pageSize = 20,
}: { page?: number; pageSize?: number } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    return { trades: [], stats: null, total: 0, page, pageSize, totalPages: 0 };
  }

  await ensureDatabaseSchemaSync();

  try {
    const where = { userId: user.id };

    const [trades, total, allTradesForStats] = await Promise.all([
      prisma.tradeJournal.findMany({
        where,
        orderBy: { tradedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tradeJournal.count({ where }),
      prisma.tradeJournal.findMany({
        where,
        select: {
          outcome: true,
          status: true,
          pnl: true,
          riskRewardRatio: true,
          emotions: true,
        },
      }),
    ]);

    // Compute Stats
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let openCount = 0;
    let disciplinedCount = 0;

    for (const t of allTradesForStats) {
      if (t.pnl) totalPnL += t.pnl;
      if (t.outcome === "WIN") wins++;
      if (t.outcome === "LOSS") losses++;
      if (t.outcome === "BREAKEVEN") breakevens++;
      if (t.status === "OPEN") openCount++;
      if (t.emotions === "DISCIPLINED" || t.emotions === "CALM") disciplinedCount++;
    }

    const closedCount = wins + losses + breakevens;
    const winRate = closedCount > 0 ? Math.round((wins / closedCount) * 100) : 0;
    const disciplineScore = allTradesForStats.length > 0
      ? Math.round((disciplinedCount / allTradesForStats.length) * 100)
      : 100;

    return {
      trades,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        totalTrades: allTradesForStats.length,
        openTrades: openCount,
        wins,
        losses,
        breakevens,
        winRate,
        totalPnL: Math.round(totalPnL * 100) / 100,
        disciplineScore,
      },
    };
  } catch (error) {
    console.error("Error fetching student journal:", error);
    return { trades: [], stats: null, total: 0, page, pageSize, totalPages: 0 };
  }
}

// ==========================================
// 2. STUDENT: LOG NEW TRADE
// ==========================================

export async function createTradeEntryAction(data: CreateTradeInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Please log in to record your trade." };
  }

  await ensureDatabaseSchemaSync();

  if (!data.instrument || !data.direction || !data.entryPrice || !data.stopLoss || !data.takeProfit) {
    return { success: false, message: "Instrument, Direction, Entry Price, Stop Loss, and Take Profit are required." };
  }

  try {
    // Calculate R:R if not provided
    let calculatedRR = data.riskRewardRatio;
    if (!calculatedRR && data.entryPrice && data.stopLoss && data.takeProfit) {
      const risk = Math.abs(data.entryPrice - data.stopLoss);
      const reward = Math.abs(data.takeProfit - data.entryPrice);
      if (risk > 0) {
        calculatedRR = `1:${(reward / risk).toFixed(1)}`;
      }
    }

    const trade = await prisma.tradeJournal.create({
      data: {
        userId: user.id,
        instrument: data.instrument.toUpperCase().trim(),
        market: data.market || "FOREX",
        direction: data.direction,
        entryPrice: Number(data.entryPrice),
        exitPrice: data.exitPrice ? Number(data.exitPrice) : null,
        stopLoss: Number(data.stopLoss),
        takeProfit: Number(data.takeProfit),
        lotSize: data.lotSize ? Number(data.lotSize) : null,
        riskAmount: data.riskAmount ? Number(data.riskAmount) : null,
        pnl: data.pnl ? Number(data.pnl) : null,
        status: data.status || "OPEN",
        outcome: data.outcome || (data.status === "CLOSED" ? (data.pnl && data.pnl > 0 ? "WIN" : "LOSS") : "PENDING"),
        riskRewardRatio: calculatedRR,
        setupReason: data.setupReason || null,
        emotions: data.emotions || "CALM",
        mistakes: data.mistakes || "NONE",
        notes: data.notes || null,
        screenshotUrl: data.screenshotUrl || null,
        tradedAt: data.tradedAt ? new Date(data.tradedAt) : new Date(),
      },
    });

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");

    return { success: true, message: "Trade logged in journal successfully!", tradeId: trade.id };
  } catch (error) {
    console.error("Error creating trade entry:", error);
    return { success: false, message: "Failed to log trade into journal." };
  }
}

// ==========================================
// 3. STUDENT: UPDATE / CLOSE TRADE
// ==========================================

export async function updateTradeEntryAction(
  tradeId: string,
  data: Partial<CreateTradeInput>
) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in." };
  }

  await ensureDatabaseSchemaSync();

  try {
    const existing = await prisma.tradeJournal.findFirst({
      where: { id: tradeId, userId: user.id },
    });

    if (!existing) {
      return { success: false, message: "Trade record not found." };
    }

    // Recalculate R:R if prices change
    let calculatedRR = data.riskRewardRatio;
    const entry = data.entryPrice !== undefined ? Number(data.entryPrice) : existing.entryPrice;
    const sl = data.stopLoss !== undefined ? Number(data.stopLoss) : existing.stopLoss;
    const tp = data.takeProfit !== undefined ? Number(data.takeProfit) : existing.takeProfit;

    if (!calculatedRR && entry && sl && tp) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        calculatedRR = `1:${(reward / risk).toFixed(1)}`;
      }
    }

    // When student edits a trade, it resets isFeatured: false so Admin must re-approve it for public showcase
    await prisma.tradeJournal.update({
      where: { id: tradeId },
      data: {
        ...(data.instrument ? { instrument: data.instrument.toUpperCase().trim() } : {}),
        ...(data.market ? { market: data.market } : {}),
        ...(data.direction ? { direction: data.direction } : {}),
        ...(data.entryPrice !== undefined ? { entryPrice: Number(data.entryPrice) } : {}),
        ...(data.exitPrice !== undefined ? { exitPrice: Number(data.exitPrice) } : {}),
        ...(data.stopLoss !== undefined ? { stopLoss: Number(data.stopLoss) } : {}),
        ...(data.takeProfit !== undefined ? { takeProfit: Number(data.takeProfit) } : {}),
        ...(data.lotSize !== undefined ? { lotSize: Number(data.lotSize) } : {}),
        ...(data.pnl !== undefined ? { pnl: Number(data.pnl) } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.emotions ? { emotions: data.emotions } : {}),
        ...(data.mistakes ? { mistakes: data.mistakes } : {}),
        ...(data.setupReason !== undefined ? { setupReason: data.setupReason } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.screenshotUrl !== undefined ? { screenshotUrl: data.screenshotUrl } : {}),
        ...(calculatedRR ? { riskRewardRatio: calculatedRR } : {}),
        isFeatured: false, // Must be re-approved by mentor/admin to showcase
      },
    });

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Trade updated successfully! (Showcase requires mentor approval)" };
  } catch (error) {
    console.error("Error updating trade:", error);
    return { success: false, message: "Failed to update trade." };
  }
}

// ==========================================
// 4. ADMIN ONLY: DELETE TRADE
// ==========================================

export async function deleteTradeEntryAction(tradeId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    const existing = await prisma.tradeJournal.findUnique({
      where: { id: tradeId },
      select: { userId: true },
    });

    if (!existing) {
      return { success: false, message: "Trade not found." };
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && existing.userId !== user.id) {
      return { success: false, message: "Unauthorized to delete this trade." };
    }

    await prisma.tradeJournal.delete({
      where: { id: tradeId },
    });

    revalidatePath("/dashboard/journal");
    revalidatePath("/admin/journal");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Trade entry removed by Admin." };
  } catch (error) {
    console.error("Error deleting trade:", error);
    return { success: false, message: "Failed to delete trade." };
  }
}

// ==========================================
// 4B. ADMIN: UPDATE TRADE ENTRY (FULL EDIT)
// ==========================================

export async function adminUpdateTradeAction(
  tradeId: string,
  data: Partial<CreateTradeInput> & { isFeatured?: boolean; mentorFeedback?: string }
) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Invalid trade ID." };
  }

  try {
    const existing = await prisma.tradeJournal.findUnique({
      where: { id: tradeId },
    });

    if (!existing) {
      return { success: false, message: "Trade not found." };
    }

    let calculatedRR = data.riskRewardRatio;
    const entry = data.entryPrice !== undefined ? Number(data.entryPrice) : existing.entryPrice;
    const sl = data.stopLoss !== undefined ? Number(data.stopLoss) : existing.stopLoss;
    const tp = data.takeProfit !== undefined ? Number(data.takeProfit) : existing.takeProfit;

    if (!calculatedRR && entry && sl && tp) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        calculatedRR = `1:${(reward / risk).toFixed(1)}`;
      }
    }

    await prisma.tradeJournal.update({
      where: { id: tradeId },
      data: {
        ...(data.instrument ? { instrument: data.instrument.toUpperCase().trim() } : {}),
        ...(data.market ? { market: data.market } : {}),
        ...(data.direction ? { direction: data.direction } : {}),
        ...(data.entryPrice !== undefined ? { entryPrice: Number(data.entryPrice) } : {}),
        ...(data.exitPrice !== undefined ? { exitPrice: Number(data.exitPrice) } : {}),
        ...(data.stopLoss !== undefined ? { stopLoss: Number(data.stopLoss) } : {}),
        ...(data.takeProfit !== undefined ? { takeProfit: Number(data.takeProfit) } : {}),
        ...(data.lotSize !== undefined ? { lotSize: Number(data.lotSize) } : {}),
        ...(data.pnl !== undefined ? { pnl: Number(data.pnl) } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.emotions ? { emotions: data.emotions } : {}),
        ...(data.mistakes ? { mistakes: data.mistakes } : {}),
        ...(data.setupReason !== undefined ? { setupReason: data.setupReason } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.screenshotUrl !== undefined ? { screenshotUrl: data.screenshotUrl } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.mentorFeedback !== undefined ? { mentorFeedback: data.mentorFeedback } : {}),
        ...(calculatedRR ? { riskRewardRatio: calculatedRR } : {}),
      },
    });

    revalidatePath("/admin/journal");
    revalidatePath("/dashboard/journal");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Trade updated by Admin successfully!" };
  } catch (error) {
    console.error("Error updating trade as admin:", error);
    return { success: false, message: "Failed to update trade." };
  }
}

// ==========================================
// 5. ADMIN: VIEW ALL STUDENTS' JOURNALS
// ==========================================

export async function getAdminJournalsAction({
  page = 1,
  pageSize = 25,
  search,
  outcome,
  emotion,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  outcome?: string;
  emotion?: string;
} = {}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  try {
    const where: Record<string, unknown> = {};

    if (outcome && outcome !== "all") {
      where.outcome = outcome;
    }
    if (emotion && emotion !== "all") {
      where.emotions = emotion;
    }
    if (search) {
      where.OR = [
        { instrument: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [trades, total] = await Promise.all([
      prisma.tradeJournal.findMany({
        where,
        orderBy: { tradedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.tradeJournal.count({ where }),
    ]);

    return {
      trades,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Error fetching admin journals:", error);
    return { trades: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

// ==========================================
// 6. ADMIN: GIVE MENTOR FEEDBACK ON A TRADE
// ==========================================

export async function addMentorFeedbackAction(tradeId: string, feedback: string) {
  const admin = await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!tradeId || !feedback.trim()) {
    return { success: false, message: "Feedback cannot be empty." };
  }

  try {
    await prisma.tradeJournal.update({
      where: { id: tradeId },
      data: {
        mentorFeedback: feedback.trim(),
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/admin/journal");
    revalidatePath("/dashboard/journal");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Mentor feedback saved and sent to student!" };
  } catch (error) {
    console.error("Error adding mentor feedback:", error);
    return { success: false, message: "Failed to save mentor feedback." };
  }
}

// ==========================================
// 7. ADMIN: TOGGLE FEATURED ON LANDING / HOME
// ==========================================

export async function toggleTradeFeaturedAction(tradeId: string, isFeatured: boolean) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Invalid trade ID." };
  }

  try {
    const updated = await prisma.tradeJournal.update({
      where: { id: tradeId },
      data: { isFeatured },
    });

    revalidatePath("/admin/journal");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return {
      success: true,
      message: isFeatured
        ? "Trade marked as Featured on Landing & Home page!"
        : "Trade removed from Featured showcase.",
      isFeatured: updated.isFeatured,
    };
  } catch (error) {
    console.error("Error toggling featured trade:", error);
    return { success: false, message: "Failed to update featured status." };
  }
}

// ==========================================
// 8. PUBLIC: GET FEATURED TRADES FOR HOME / LANDING
// ==========================================

export async function getFeaturedTradesAction(limit = 8) {
  await ensureDatabaseSchemaSync();

  try {
    const trades = await prisma.tradeJournal.findMany({
      where: {
        isFeatured: true,
        screenshotUrl: { not: null },
      },
      orderBy: { tradedAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return trades;
  } catch (error) {
    console.error("Error fetching featured trades:", error);
    return [];
  }
}

