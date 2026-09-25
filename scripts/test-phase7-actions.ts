import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../src/generated/prisma";
import { extractTradeEventsFromSegments } from "../src/lib/youtube-trades/terminology";
import { reconstructTradeCandidates } from "../src/lib/youtube-trades/state-machine";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_PRISMA_URL is missing in environment!");
}

const pool = new pg.Pool({
  connectionString: connectionString.includes("sslmode=require")
    ? connectionString.replace("sslmode=require", "sslmode=verify-full")
    : connectionString,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function testPhase7() {
  console.log("=== Testing Phase 7: Trade Story Timeline Flow ===");

  // Ensure tables exist
  console.log("\n0. Ensuring database tables exist...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "youtube_streams" (
      "id" TEXT PRIMARY KEY,
      "youtubeVideoId" TEXT UNIQUE NOT NULL,
      "url" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "thumbnail" TEXT,
      "channel" TEXT DEFAULT 'Rahul Trade Warrior Academy',
      "publishedAt" TIMESTAMP(3),
      "duration" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'QUEUED',
      "transcriptStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "tradesCount" INTEGER NOT NULL DEFAULT 0,
      "clipsCount" INTEGER NOT NULL DEFAULT 0,
      "transcriptText" TEXT,
      "transcriptJson" JSONB,
      "isTestData" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "youtube_streams_youtubeVideoId_idx" ON "youtube_streams"("youtubeVideoId");
    CREATE INDEX IF NOT EXISTS "youtube_streams_status_idx" ON "youtube_streams"("status");

    CREATE TABLE IF NOT EXISTS "trade_candidates" (
      "id" TEXT PRIMARY KEY,
      "streamId" TEXT NOT NULL REFERENCES "youtube_streams"("id") ON DELETE CASCADE,
      "tradeNumber" INTEGER NOT NULL DEFAULT 1,
      "instrument" TEXT NOT NULL,
      "direction" TEXT NOT NULL,
      "marketContext" TEXT,
      "liquidity" JSONB,
      "marketStructure" JSONB,
      "priceAction" TEXT,
      "candleConfirmation" JSONB,
      "entryCriteria" TEXT,
      "plannedEntry" JSONB,
      "actualEntry" JSONB,
      "stopLoss" JSONB,
      "takeProfit" JSONB,
      "plannedRR" TEXT DEFAULT '1:3',
      "currentR" TEXT,
      "realizedR" TEXT,
      "riskStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
      "result" TEXT NOT NULL DEFAULT 'TP',
      "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
      "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.90,
      "clipStart" INTEGER,
      "clipEnd" INTEGER,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "trade_candidates_streamId_idx" ON "trade_candidates"("streamId");

    CREATE TABLE IF NOT EXISTS "trade_events" (
      "id" TEXT PRIMARY KEY,
      "tradeId" TEXT NOT NULL REFERENCES "trade_candidates"("id") ON DELETE CASCADE,
      "eventType" TEXT NOT NULL,
      "timestamp" INTEGER NOT NULL,
      "endTimestamp" INTEGER,
      "text" TEXT NOT NULL,
      "price" DOUBLE PRECISION,
      "confidence" TEXT NOT NULL DEFAULT 'HIGH',
      "source" TEXT NOT NULL DEFAULT 'TRANSCRIPT',
      "visualVerified" BOOLEAN NOT NULL DEFAULT false,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "trade_events_tradeId_timestamp_idx" ON "trade_events"("tradeId", "timestamp");
  `);
  console.log("✓ Database tables verified.");

  // 1. Create a dummy test stream with transcript segments
  console.log("\n1. Creating test stream record in database...");
  const dummyStream = await prisma.youTubeStream.create({
    data: {
      id: "test_phase7_stream_id",
      youtubeVideoId: "test_phase7_stream",
      url: "https://www.youtube.com/watch?v=test_phase7_stream",
      title: "LIVE TRADING: Gold London Sweep & Break of Structure",
      channel: "Rahul Trade Warrior Academy",
      duration: 3600,
      status: "INGESTED",
      transcriptStatus: "EXTRACTED",
      analysisStatus: "PENDING",
      isTestData: true,
      transcriptJson: [
        {
          start: 120,
          end: 125,
          text: "Asian low sweep hui hai liquidity grab kiya market ne",
        },
        {
          start: 180,
          end: 185,
          text: "5 minute chart pe COC confirm ho gaya change of character",
        },
        {
          start: 240,
          end: 245,
          text: "Bullish hammer candle form hui hai rejection ke sath",
        },
        {
          start: 300,
          end: 305,
          text: "Red candle ka high break hone par hum buy karenge",
        },
        {
          start: 360,
          end: 365,
          text: "Maine buy entry le li hai gold me 2385 pe order executed",
        },
        {
          start: 420,
          end: 425,
          text: "Target 1 hit ho gaya hai 1:2 achieve ho gaya, SL to cost le aao",
        },
      ],
    },
  });

  console.log(`Created test stream: ${dummyStream.id}`);

  try {
    // 2. Extract Trade Events and Reconstruct Story Candidates
    console.log("\n2. Reconstructing Trade Story Candidates...");
    const segments = dummyStream.transcriptJson as any[];
    const classifiedEvents = extractTradeEventsFromSegments(segments);
    console.log(`Extracted ${classifiedEvents.length} classified events from transcript segments.`);

    const candidates = reconstructTradeCandidates(classifiedEvents, true);
    console.log(`Reconstructed ${candidates.length} actual executed trade story candidate(s).`);

    if (candidates.length === 0) {
      throw new Error("Expected at least 1 trade candidate!");
    }

    const cand = candidates[0];

    // 3. Persist Candidate and Events to Database
    console.log("\n3. Persisting Trade Candidate to database...");
    const createdTrade = await prisma.tradeCandidate.create({
      data: {
        id: "test_candidate_p7",
        streamId: dummyStream.id,
        tradeNumber: cand.tradeNumber,
        instrument: cand.instrument,
        direction: cand.direction,
        marketContext: cand.marketContext,
        liquidity: cand.liquidity as any,
        marketStructure: cand.marketStructure as any,
        priceAction: cand.priceAction,
        candleConfirmation: cand.candleConfirmation as any,
        entryCriteria: cand.entryCriteria,
        plannedEntry: cand.plannedEntry as any,
        actualEntry: cand.actualEntry as any,
        stopLoss: cand.stopLoss as any,
        takeProfit: cand.takeProfit as any,
        plannedRR: cand.plannedRR,
        currentR: cand.currentR,
        realizedR: cand.realizedR,
        riskStatus: cand.riskStatus,
        result: cand.result,
        confidence: cand.confidence,
        completenessScore: cand.completenessScore,
        clipStart: cand.clipStart,
        clipEnd: cand.clipEnd,
        isVerified: false,
      },
    });

    console.log(`Created Trade Candidate ID: ${createdTrade.id}`);

    // Insert associated story events
    let evId = 1;
    for (const ev of cand.events) {
      await prisma.tradeEvent.create({
        data: {
          id: `test_event_p7_${evId++}`,
          tradeId: createdTrade.id,
          eventType: ev.category,
          timestamp: ev.timestamp,
          endTimestamp: ev.endTimestamp || ev.timestamp,
          text: ev.text,
          price: ev.price,
          confidence: ev.confidence,
          source: "TRANSCRIPT",
          visualVerified: false,
          metadata: {
            type: ev.type,
            score: ev.score,
            isExecution: ev.isExecution,
          },
        },
      });
    }

    // 4. Query full trade story with events
    const streamWithTrades = await prisma.youTubeStream.findUnique({
      where: { id: dummyStream.id },
      include: {
        trades: {
          include: { events: { orderBy: { timestamp: "asc" } } },
        },
      },
    });

    const persistedTrade = streamWithTrades?.trades[0];
    if (!persistedTrade) {
      throw new Error("Failed to find persisted trade in DB!");
    }

    console.log("\n4. Verified Complete Persisted Trade Story:");
    console.log(`  Trade #${persistedTrade.tradeNumber}: ${persistedTrade.instrument} ${persistedTrade.direction}`);
    console.log(`  Planned RR: ${persistedTrade.plannedRR} | Result: ${persistedTrade.result} | Status: ${persistedTrade.riskStatus}`);
    console.log(`  Completeness Score: ${persistedTrade.completenessScore * 100}%`);
    console.log(`  Clip Window: ${persistedTrade.clipStart}s -> ${persistedTrade.clipEnd}s`);
    console.log(`  Events count: ${persistedTrade.events.length}`);

    persistedTrade.events.forEach((ev, idx) => {
      console.log(`    [Step ${idx + 1}] (${ev.eventType}) @ ${ev.timestamp}s: "${ev.text}"`);
    });

    if (persistedTrade.events.length < 3) {
      throw new Error("Expected at least 3 story timeline events!");
    }

    // 5. Test Verification Toggle
    console.log("\n5. Testing Verification Toggle...");
    const verifiedTrade = await prisma.tradeCandidate.update({
      where: { id: persistedTrade.id },
      data: { isVerified: true },
    });
    if (!verifiedTrade.isVerified) {
      throw new Error("Trade verification update failed!");
    }
    console.log("✓ Verification toggle passed");

    console.log("\n==========================================");
    console.log("ALL PHASE 7 DATABASE & TIMELINE TESTS PASSED!");
    console.log("==========================================");
  } finally {
    // Clean up test stream and cascaded trades/events
    console.log("\nCleaning up test stream...");
    await prisma.youTubeStream.delete({
      where: { id: dummyStream.id },
    }).catch(() => null);
    await prisma.$disconnect();
    await pool.end();
    console.log("Clean up done.");
  }
}

testPhase7().catch(async (err) => {
  console.error("Test failed:", err);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
