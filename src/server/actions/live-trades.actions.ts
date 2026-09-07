"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import type { LiveTradeProofInput } from "@/types";


const DEFAULT_SAMPLE_TRADES = [
  {
    id: "sample-yt-1",
    title: "XAUUSD Gold 15 Pips Minor SL to 180 Pips Blast",
    instrument: "XAUUSD (GOLD)",
    market: "GOLD",
    tradeDirection: "BUY",
    sessionType: "YouTube Live London Open",
    youtubeUrl: "https://www.youtube.com/@rahultradewarrior",
    screenshotUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80",
    slPips: 15,
    gainPips: 180,
    riskRewardRatio: "1:12",
    status: "PROFIT_BOOKED",
    profitAmount: "+180 Pips (+₹54,000)",
    notes: "YouTube Live Session me London Open ke waqt 15m Liquidity sweep identify kiya. Sirf 15 Pips ka minor SL tha aur target 180 Pips poora hit hua. Zero psychological stress!",
    showOnHome: true,
    showOnLanding: true,
    showOnDashboard: true,
    isFeatured: true,
    tradedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-yt-2",
    title: "EURUSD Institutional Sweep - 18 Pips SL to 108 Pips Target",
    instrument: "EURUSD",
    market: "FOREX",
    tradeDirection: "SELL",
    sessionType: "YouTube Live New York Session",
    youtubeUrl: "https://www.youtube.com/@rahultradewarrior",
    screenshotUrl: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80",
    slPips: 18,
    gainPips: 108,
    riskRewardRatio: "1:6",
    status: "PROFIT_BOOKED",
    profitAmount: "+108 Pips (+₹32,400)",
    notes: "Live stream par sabhi students ke saamne Asian Session High ke fakeout par Sell entry execute ki. 1:6 R:R ke sath pura profit book karwaya.",
    showOnHome: true,
    showOnLanding: true,
    showOnDashboard: true,
    isFeatured: true,
    tradedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-yt-3",
    title: "GBPUSD Massive 20 Pips SL to 240 Pips Running Move",
    instrument: "GBPUSD",
    market: "FOREX",
    tradeDirection: "BUY",
    sessionType: "YouTube Live Masterclass Stream",
    youtubeUrl: "https://www.youtube.com/@rahultradewarrior",
    screenshotUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1000&auto=format&fit=crop&q=80",
    slPips: 20,
    gainPips: 240,
    riskRewardRatio: "1:12",
    status: "RUNNING_PROFIT",
    profitAmount: "+240 Pips (Running Profit)",
    notes: "Strict 20 Pips Stop Loss. Trail SL trigger ho chuka hai, trade already risk-free hai. Sky High is the limit ka live proof!",
    showOnHome: true,
    showOnLanding: true,
    showOnDashboard: true,
    isFeatured: true,
    tradedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ==========================================
// 1. ADMIN: GET ALL LIVE TRADE PROOFS
// ==========================================
export async function getAdminLiveTradesAction({
  page = 1,
  pageSize = 30,
  search = "",
  status = "all",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
} = {}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  try {
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { instrument: { contains: search.trim(), mode: "insensitive" } },
        { notes: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [trades, total] = await Promise.all([
      prisma.liveTradeProof.findMany({
        where,
        orderBy: [{ tradedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.liveTradeProof.count({ where }),
    ]);

    // If database has 0 trades, seed the default sample trades so admin can manage them immediately
    if (total === 0 && !search.trim() && status === "all") {
      for (const sample of DEFAULT_SAMPLE_TRADES) {
        await prisma.liveTradeProof.create({
          data: {
            title: sample.title,
            instrument: sample.instrument,
            market: sample.market,
            tradeDirection: sample.tradeDirection,
            sessionType: sample.sessionType,
            youtubeUrl: sample.youtubeUrl,
            screenshotUrl: sample.screenshotUrl,
            slPips: sample.slPips,
            gainPips: sample.gainPips,
            riskRewardRatio: sample.riskRewardRatio,
            status: sample.status,
            profitAmount: sample.profitAmount,
            notes: sample.notes,
            showOnHome: sample.showOnHome,
            showOnLanding: sample.showOnLanding,
            showOnDashboard: sample.showOnDashboard,
            isFeatured: sample.isFeatured,
            tradedAt: sample.tradedAt,
          },
        }).catch(() => null);
      }

      const refreshed = await prisma.liveTradeProof.findMany({
        orderBy: { tradedAt: "desc" },
      });
      return {
        trades: refreshed,
        total: refreshed.length,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    return {
      trades,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  } catch (error) {
    console.error("Error fetching admin live trade proofs:", error);
    return { trades: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

// ==========================================
// 2. ADMIN: CREATE LIVE TRADE PROOF
// ==========================================
export async function createLiveTradeProofAction(data: LiveTradeProofInput) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!data.title?.trim() || !data.instrument?.trim() || !data.screenshotUrl?.trim()) {
    return { success: false, message: "Title, Instrument, and Screenshot are required." };
  }

  const sl = Number(data.slPips) || 15;
  const gain = Number(data.gainPips) || 60;

  // Auto-generate Risk:Reward if not manually customized
  let rr = data.riskRewardRatio?.trim();
  if (!rr && sl > 0 && gain > 0) {
    const ratio = (gain / sl).toFixed(1);
    rr = `1:${ratio.endsWith(".0") ? ratio.slice(0, -2) : ratio}`;
  }

  try {
    const trade = await prisma.liveTradeProof.create({
      data: {
        title: data.title.trim(),
        instrument: data.instrument.toUpperCase().trim(),
        market: data.market?.toUpperCase() || "FOREX",
        tradeDirection: data.tradeDirection || "BUY",
        sessionType: data.sessionType?.trim() || "YouTube Live Session",
        youtubeUrl: data.youtubeUrl?.trim() || null,
        screenshotUrl: data.screenshotUrl.trim(),
        slPips: sl,
        gainPips: gain,
        riskRewardRatio: rr || "1:3",
        status: data.status || "PROFIT_BOOKED",
        profitAmount: data.profitAmount?.trim() || `+${gain} Pips`,
        notes: data.notes?.trim() || null,
        showOnHome: data.showOnHome ?? true,
        showOnLanding: data.showOnLanding ?? true,
        showOnDashboard: data.showOnDashboard ?? true,
        isFeatured: data.isFeatured ?? true,
        tradedAt: data.tradedAt ? new Date(data.tradedAt) : new Date(),
      },
    });

    revalidatePath("/admin/live-trade-proofs");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/live-proofs");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "YouTube Live Trade Proof published successfully!", tradeId: trade.id };
  } catch (error) {
    console.error("Error creating live trade proof:", error);
    return { success: false, message: "Failed to save live trade proof." };
  }
}

// ==========================================
// 3. ADMIN: UPDATE LIVE TRADE PROOF
// ==========================================
export async function updateLiveTradeProofAction(
  id: string,
  data: Partial<LiveTradeProofInput>
) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!id) {
    return { success: false, message: "Trade proof ID is required." };
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.instrument !== undefined) updateData.instrument = data.instrument.toUpperCase().trim();
    if (data.market !== undefined) updateData.market = data.market.toUpperCase();
    if (data.tradeDirection !== undefined) updateData.tradeDirection = data.tradeDirection;
    if (data.sessionType !== undefined) updateData.sessionType = data.sessionType.trim();
    if (data.youtubeUrl !== undefined) updateData.youtubeUrl = data.youtubeUrl?.trim() || null;
    if (data.screenshotUrl !== undefined) updateData.screenshotUrl = data.screenshotUrl.trim();
    if (data.slPips !== undefined) updateData.slPips = Number(data.slPips);
    if (data.gainPips !== undefined) updateData.gainPips = Number(data.gainPips);
    if (data.riskRewardRatio !== undefined) updateData.riskRewardRatio = data.riskRewardRatio.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.profitAmount !== undefined) updateData.profitAmount = data.profitAmount?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.showOnHome !== undefined) updateData.showOnHome = Boolean(data.showOnHome);
    if (data.showOnLanding !== undefined) updateData.showOnLanding = Boolean(data.showOnLanding);
    if (data.showOnDashboard !== undefined) updateData.showOnDashboard = Boolean(data.showOnDashboard);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.tradedAt !== undefined) updateData.tradedAt = new Date(data.tradedAt);

    await prisma.liveTradeProof.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/live-trade-proofs");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/live-proofs");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Trade proof updated successfully!" };
  } catch (error) {
    console.error("Error updating live trade proof:", error);
    return { success: false, message: "Failed to update trade proof." };
  }
}

// ==========================================
// 4. ADMIN: DELETE LIVE TRADE PROOF
// ==========================================
export async function deleteLiveTradeProofAction(id: string) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!id) {
    return { success: false, message: "Trade proof ID is required." };
  }

  try {
    await prisma.liveTradeProof.delete({
      where: { id },
    });

    revalidatePath("/admin/live-trade-proofs");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/live-proofs");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");

    return { success: true, message: "Trade proof deleted successfully." };
  } catch (error) {
    console.error("Error deleting live trade proof:", error);
    return { success: false, message: "Failed to delete trade proof." };
  }
}

// ==========================================
// 5. PUBLIC & STUDENT: GET LIVE TRADE PROOFS
// ==========================================
export async function getPublicLiveTradesAction({
  destination = "ALL",
  limit = 20,
}: {
  destination?: "HOME" | "LANDING" | "DASHBOARD" | "ALL";
  limit?: number;
} = {}) {
  await ensureDatabaseSchemaSync();

  try {
    const where: Record<string, unknown> = {};

    if (destination === "HOME") {
      where.showOnHome = true;
    } else if (destination === "LANDING") {
      where.showOnLanding = true;
    } else if (destination === "DASHBOARD") {
      where.showOnDashboard = true;
    }

    const trades = await prisma.liveTradeProof.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { tradedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    if (trades.length === 0) {
      return DEFAULT_SAMPLE_TRADES.slice(0, limit);
    }

    return trades;
  } catch (error) {
    console.error("Error fetching public live trade proofs:", error);
    return DEFAULT_SAMPLE_TRADES.slice(0, limit);
  }
}
