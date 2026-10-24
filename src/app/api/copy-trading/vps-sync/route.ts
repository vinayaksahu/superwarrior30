import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

interface VpsSlotStatus {
  slotNumber: number;
  accountNumber: string;
  brokerName?: string;
  serverName?: string;
  isOnline: boolean;
  balance: number;
  equity: number;
  latencyMs: number;
  openPositionsCount: number;
}

interface VpsTradeEvent {
  tradeTicket: string;
  symbol: string;
  orderType: string;
  masterLots: number;
  copiedLots: number;
  masterOpenPrice: number;
  childOpenPrice: number;
  masterClosePrice?: number;
  childClosePrice?: number;
  slippagePips: number;
  latencyMs: number;
  profit: number;
  status: string;
  accountNumber: string;
  slotNumber: number;
}

interface VpsSyncPayload {
  secretKey: string;
  vpsNodeName: string;
  masterStatus?: {
    accountNumber: string;
    brokerName: string;
    serverName: string;
    isOnline: boolean;
    balance: number;
    equity: number;
    totalOpenPositions: number;
  };
  slots?: VpsSlotStatus[];
  recentTrades?: VpsTradeEvent[];
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchemaSync();

    const body: VpsSyncPayload = await req.json();

    // Verify Secret Key
    const expectedSecret = process.env.VPS_SYNC_SECRET_KEY || "SuperWarrior30@CloudVPS#SyncKey2026";
    if (!body.secretKey || body.secretKey !== expectedSecret) {
      return NextResponse.json({ success: false, message: "Unauthorized sync key" }, { status: 401 });
    }

    const nodeName = body.vpsNodeName || "SW30-CloudNode-01";

    // 1. Update Master Account Status if reported
    let masterRecord = null;
    if (body.masterStatus) {
      masterRecord = await prisma.copyTradingMaster.findFirst({
        where: { accountNumber: body.masterStatus.accountNumber },
      });

      if (masterRecord) {
        await prisma.copyTradingMaster.update({
          where: { id: masterRecord.id },
          data: {
            isActive: body.masterStatus.isOnline,
            lastHeartbeat: new Date(),
            vpsNodeName: nodeName,
          },
        });
      }
    } else {
      masterRecord = await prisma.copyTradingMaster.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
    }

    // 2. Update Student Slots Status
    if (Array.isArray(body.slots)) {
      for (const slot of body.slots) {
        // Find subscription by accountNumber or vpsSlotNumber
        const sub = await prisma.copyTradingSubscription.findFirst({
          where: {
            OR: [
              { accountNumber: String(slot.accountNumber) },
              { vpsSlotNumber: slot.slotNumber },
            ],
          },
        });

        if (sub) {
          await prisma.copyTradingSubscription.update({
            where: { id: sub.id },
            data: {
              isOnline: slot.isOnline,
              balance: slot.balance,
              equity: slot.equity,
              vpsSlotNumber: slot.slotNumber,
              lastSyncedAt: new Date(),
            },
          });
        }
      }
    }

    // 3. Log real trades if reported by VPS
    if (Array.isArray(body.recentTrades) && body.recentTrades.length > 0) {
      for (const trade of body.recentTrades) {
        // Find subscription for this trade
        const sub = await prisma.copyTradingSubscription.findFirst({
          where: {
            OR: [
              { accountNumber: String(trade.accountNumber) },
              { vpsSlotNumber: trade.slotNumber },
            ],
          },
        });

        // Upsert trade log to avoid duplicates
        const existingLog = await prisma.copyTradeLog.findFirst({
          where: {
            tradeTicket: trade.tradeTicket,
            subscriptionId: sub?.id || undefined,
          },
        });

        if (!existingLog && masterRecord) {
          await prisma.copyTradeLog.create({
            data: {
              masterId: masterRecord.id,
              subscriptionId: sub?.id || null,
              tradeTicket: trade.tradeTicket,
              symbol: trade.symbol,
              orderType: trade.orderType,
              masterLots: trade.masterLots || 0.01,
              copiedLots: trade.copiedLots || 0.01,
              masterOpenPrice: trade.masterOpenPrice,
              childOpenPrice: trade.childOpenPrice,
              masterClosePrice: trade.masterClosePrice,
              childClosePrice: trade.childClosePrice,
              slippagePips: trade.slippagePips || 0.0,
              latencyMs: trade.latencyMs || 2,
              profit: trade.profit || 0.0,
              status: trade.status || "EXECUTED",
              openedAt: new Date(),
              closedAt: trade.childClosePrice ? new Date() : null,
            },
          });
        }
      }
    }

    // 4. Return Pending Commands for VPS (e.g. Pause, Resume, or New Slot Assignments)
    // Query active subscriptions with their desired status
    const allSubscriptions = await prisma.copyTradingSubscription.findMany({
      select: {
        id: true,
        accountNumber: true,
        serverName: true,
        brokerName: true,
        vpsSlotNumber: true,
        status: true,
        multiplier: true,
        fixedLot: true,
        riskMode: true,
        maxDrawdownGuard: true,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      commands: {
        subscriptions: allSubscriptions.map((s) => ({
          subscriptionId: s.id,
          accountNumber: s.accountNumber,
          serverName: s.serverName,
          brokerName: s.brokerName,
          slotNumber: s.vpsSlotNumber,
          targetStatus: s.status, // "ACTIVE", "PAUSED", "DISCONNECTED"
          multiplier: s.multiplier,
          fixedLot: s.fixedLot,
          riskMode: s.riskMode,
        })),
      },
    });
  } catch (error: any) {
    console.error("VPS Sync API Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
