"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { fetchYouTubeMetadata } from "@/lib/youtube-trades/youtube-metadata";
import {
  extractYouTubeCaptions,
  formatTranscriptWithTimestamps,
  TranscriptSegment,
} from "@/lib/youtube-trades/transcript-extractor";
import { extractTradeEventsFromSegments } from "@/lib/youtube-trades/terminology";
import { reconstructTradeCandidates } from "@/lib/youtube-trades/state-machine";
import { runDryRunTradeAnalysis } from "@/lib/youtube-trades/dry-run";
import { verifyVisualChartFrame } from "@/lib/youtube-trades/visual-verifier";
import { verifyTradeMultiSource } from "@/lib/youtube-trades/entry-verifier";
import { downloadTradeSegment } from "@/lib/youtube-trades/segment-downloader";
import { generateMasterClip } from "@/lib/youtube-trades/clip-generator";
import { accelerateSilentPeriods } from "@/lib/youtube-trades/silence-accelerator";
import { generateSrtFile } from "@/lib/youtube-trades/subtitle-generator";
import { generateVerticalShort } from "@/lib/youtube-trades/vertical-short-generator";
import { scanYouTubeChannel } from "@/lib/youtube-trades/channel-scanner";
import { saveTradeAsset } from "@/lib/youtube-trades/storage-manager";

export interface StreamFilterOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  analysisStatus?: string;
}

export interface IngestStreamOptions {
  url: string;
  downloadFullVideo?: boolean;
  transcriptFirst?: boolean;
  detectActualTrades?: boolean;
  detectRR?: boolean;
  detectEntry?: boolean;
  detectTPSL?: boolean;
  generateTimeline?: boolean;
}

const SAMPLE_STREAMS = [
  {
    youtubeVideoId: "yt_live_gold_sweep_01",
    url: "https://www.youtube.com/live/rahul-trade-warrior-gold-london",
    title: "🔴 LIVE TRADING - London Open Liquidity Sweep & Gold XAUUSD 1:3 RR Blast",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80",
    channel: "Rahul Trade Warrior Academy",
    duration: 5400, // 1h 30m
    status: "ANALYZED",
    transcriptStatus: "EXTRACTED",
    analysisStatus: "COMPLETED",
    tradesCount: 2,
    clipsCount: 1,
    trades: [
      {
        tradeNumber: 1,
        instrument: "XAUUSD (GOLD)",
        direction: "BUY",
        marketContext: "London Open Asian High/Low Liquidity Sweep. Strong rejection at institutional support zone.",
        liquidity: { type: "SELL_SIDE", timestamp: 812, text: "Asian session low liquidity swept aggressively", confidence: 0.95 },
        marketStructure: { type: "COC", timestamp: 845, text: "Change of character (COC) confirmed on 1-min chart", confidence: 0.92 },
        priceAction: "Buyers protecting the level, market buyers ko protect karte hue ja raha hai",
        candleConfirmation: { type: "HAMMER", status: "CONFIRMED", text: "Clear bullish hammer formed at liquidity zone" },
        entryCriteria: "Red candle high break",
        plannedEntry: { timestamp: 873, price: 2642.5 },
        actualEntry: { timestamp: 889, price: 2643.1, confidence: 0.96 },
        stopLoss: { price: 2640.1, timestamp: 889, pips: 30 },
        takeProfit: { price: 2652.1, timestamp: 1010, pips: 90 },
        plannedRR: "1:3",
        currentR: "3R",
        realizedR: "3R",
        riskStatus: "RISK_FREE",
        result: "TP",
        confidence: 0.94,
        completenessScore: 0.98,
        clipStart: 812,
        clipEnd: 1015,
        isVerified: true,
        events: [
          { eventType: "MARKET_CONTEXT", timestamp: 795, text: "London session open ho chuka hai, liquidity hunt par nazar rakho", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "LIQUIDITY", timestamp: 812, text: "Asian session low liquidity swept cleanly, SSL grab hua hai", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "COC", timestamp: 845, text: "Change of character confirmed on 1m chart, bullish shift", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "PRICE_ACTION", timestamp: 865, text: "Buyers are protecting the level strongly, no lower close", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "CANDLE_CONFIRMATION", timestamp: 880, text: "Hammer candle bana hai, strong rejection wick", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "ENTRY_CRITERIA", timestamp: 885, text: "Red candle ka high break hone par direct buy entry", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "ACTUAL_ENTRY", timestamp: 889, text: "Buy le liya! 2643.10 par entry execute hui", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "STOP_LOSS", timestamp: 890, text: "Strict minor SL 30 pips (2640.10) par placed", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "RISK_REWARD", timestamp: 945, text: "Trade 1R par chal raha hai smoothly", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "BREAK_EVEN", timestamp: 978, text: "2R running! SL moved to entry, trade is completely risk-free", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "TAKE_PROFIT", timestamp: 1010, text: "3R target hit! 90 Pips clean booked on stream", confidence: "HIGH", source: "TRANSCRIPT", visualVerified: true },
          { eventType: "TRADE_COMPLETE", timestamp: 1015, text: "Trade completely closed with 1:3 Realized RR", confidence: "HIGH", source: "TRANSCRIPT" },
        ],
      },
      {
        tradeNumber: 2,
        instrument: "EURUSD",
        direction: "SELL",
        marketContext: "New York Pre-Session Equal Highs Liquidity sweep into 15m supply block.",
        liquidity: { type: "BUY_SIDE", timestamp: 2420, text: "BSL equal highs taken out by spike", confidence: 0.89 },
        marketStructure: { type: "BOS", timestamp: 2460, text: "Bearish Break of Structure (BOS)", confidence: 0.88 },
        priceAction: "Sellers protecting previous supply candle",
        candleConfirmation: { type: "SHOOTING_STAR", status: "CONFIRMED", text: "Shooting star rejection candle" },
        entryCriteria: "Green candle low break",
        plannedEntry: { timestamp: 2480, price: 1.0845 },
        actualEntry: { timestamp: 2495, price: 1.0842, confidence: 0.91 },
        stopLoss: { price: 1.0860, timestamp: 2495, pips: 18 },
        takeProfit: { price: 1.0806, timestamp: 2650, pips: 36 },
        plannedRR: "1:2",
        currentR: "2R",
        realizedR: "2R",
        riskStatus: "RISK_FREE",
        result: "TP",
        confidence: 0.88,
        completenessScore: 0.92,
        clipStart: 2420,
        clipEnd: 2660,
        isVerified: true,
        events: [
          { eventType: "LIQUIDITY", timestamp: 2420, text: "Buy side liquidity (BSL) swept above equal highs", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "BOS", timestamp: 2460, text: "Bearish structure break down confirmed", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "CANDLE_CONFIRMATION", timestamp: 2475, text: "Shooting star candle close hua hai top par", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "ENTRY_CRITERIA", timestamp: 2480, text: "Green candle ka low break hone par sell", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "ACTUAL_ENTRY", timestamp: 2495, text: "Sell entry done! Stop loss exactly high par", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "BREAK_EVEN", timestamp: 2580, text: "1.5R done, SL to breakeven", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "TAKE_PROFIT", timestamp: 2650, text: "Target hit! 1:2 RR achieved cleanly", confidence: "HIGH", source: "TRANSCRIPT" },
        ],
      },
    ],
  },
  {
    youtubeVideoId: "yt_live_nifty_reversal_02",
    url: "https://www.youtube.com/live/rahul-nifty-live-masterclass",
    title: "🔴 LIVE TRADING - Masterclass Live Session & BankNifty Pullback Entry",
    thumbnail: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80",
    channel: "Rahul Trade Warrior Academy",
    duration: 6120, // 1h 42m
    status: "ANALYZED",
    transcriptStatus: "EXTRACTED",
    analysisStatus: "COMPLETED",
    tradesCount: 1,
    clipsCount: 1,
    trades: [
      {
        tradeNumber: 1,
        instrument: "BANKNIFTY",
        direction: "BUY",
        marketContext: "Morning opening range breakout retest with volume confirmation.",
        liquidity: { type: "SELL_SIDE", timestamp: 1240, text: "Prior day low fakeout liquidity sweep", confidence: 0.91 },
        marketStructure: { type: "MSS", timestamp: 1290, text: "Market structure shift to bullish", confidence: 0.90 },
        priceAction: "Buyers protecting 50% discount zone",
        candleConfirmation: { type: "ENGULFING", status: "CONFIRMED", text: "Bullish engulfing candle" },
        entryCriteria: "Candle high close above structure",
        plannedEntry: { timestamp: 1310, price: 51200 },
        actualEntry: { timestamp: 1325, price: 51220, confidence: 0.93 },
        stopLoss: { price: 51140, timestamp: 1325, pips: 80 },
        takeProfit: { price: 51460, timestamp: 1540, pips: 240 },
        plannedRR: "1:3",
        currentR: "3R",
        realizedR: "3R",
        riskStatus: "RISK_FREE",
        result: "TP",
        confidence: 0.92,
        completenessScore: 0.95,
        clipStart: 1240,
        clipEnd: 1550,
        isVerified: true,
        events: [
          { eventType: "LIQUIDITY", timestamp: 1240, text: "Prior day low stop hunt done", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "ACTUAL_ENTRY", timestamp: 1325, text: "BankNifty buy triggered right at support", confidence: "HIGH", source: "TRANSCRIPT" },
          { eventType: "TAKE_PROFIT", timestamp: 1540, text: "3R profit hit on BankNifty!", confidence: "HIGH", source: "TRANSCRIPT" },
        ],
      },
    ],
  },
];

// ==========================================
// 1. GET ALL YOUTUBE STREAMS (WITH STATS)
// ==========================================
export async function getYouTubeStreamsAction({
  page = 1,
  pageSize = 20,
  search = "",
  status = "all",
  analysisStatus = "all",
}: StreamFilterOptions = {}) {
  await requirePermission("youtube_live_trades.view");
  await ensureDatabaseSchemaSync();

  try {
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }
    if (analysisStatus && analysisStatus !== "all") {
      where.analysisStatus = analysisStatus;
    }
    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { channel: { contains: search.trim(), mode: "insensitive" } },
        { youtubeVideoId: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [streams, totalCount, totalAnalyzed, totalTrades, totalClips, activeJobs] = await Promise.all([
      prisma.youTubeStream.findMany({
        where,
        include: {
          trades: {
            select: {
              id: true,
              tradeNumber: true,
              instrument: true,
              direction: true,
              plannedRR: true,
              result: true,
              confidence: true,
              completenessScore: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.youTubeStream.count({ where }),
      prisma.youTubeStream.count({ where: { status: "ANALYZED" } }),
      prisma.tradeCandidate.count(),
      prisma.tradeClip.count(),
      prisma.tradeProcessingJob.count({
        where: { stage: { in: ["QUEUED", "DOWNLOADING", "TRANSCRIBING", "ANALYZING", "DETECTING_TRADES", "VISUAL_ANALYSIS", "GENERATING_CLIP", "RENDERING"] } },
      }),
    ]);

    // If database is completely empty and no search filters, seed realistic sample streams
    if (totalCount === 0 && !search.trim() && status === "all") {
      for (const sample of SAMPLE_STREAMS) {
        const stream = await prisma.youTubeStream.create({
          data: {
            youtubeVideoId: sample.youtubeVideoId,
            url: sample.url,
            title: sample.title,
            thumbnail: sample.thumbnail,
            channel: sample.channel,
            duration: sample.duration,
            status: sample.status,
            transcriptStatus: sample.transcriptStatus,
            analysisStatus: sample.analysisStatus,
            tradesCount: sample.tradesCount,
            clipsCount: sample.clipsCount,
          },
        }).catch(() => null);

        if (stream && sample.trades) {
          for (const t of sample.trades) {
            const candidate = await prisma.tradeCandidate.create({
              data: {
                streamId: stream.id,
                tradeNumber: t.tradeNumber,
                instrument: t.instrument,
                direction: t.direction,
                marketContext: t.marketContext,
                liquidity: t.liquidity as any,
                marketStructure: t.marketStructure as any,
                priceAction: t.priceAction,
                candleConfirmation: t.candleConfirmation as any,
                entryCriteria: t.entryCriteria,
                plannedEntry: t.plannedEntry as any,
                actualEntry: t.actualEntry as any,
                stopLoss: t.stopLoss as any,
                takeProfit: t.takeProfit as any,
                plannedRR: t.plannedRR,
                currentR: t.currentR,
                realizedR: t.realizedR,
                riskStatus: t.riskStatus,
                result: t.result,
                confidence: t.confidence,
                completenessScore: t.completenessScore,
                clipStart: t.clipStart,
                clipEnd: t.clipEnd,
                isVerified: t.isVerified,
              },
            });

            if (candidate && t.events) {
              for (const ev of t.events) {
                await prisma.tradeEvent.create({
                  data: {
                    tradeId: candidate.id,
                    eventType: ev.eventType,
                    timestamp: ev.timestamp,
                    text: ev.text,
                    confidence: ev.confidence,
                    source: ev.source,
                    visualVerified: (ev as any).visualVerified ?? false,
                  },
                }).catch(() => null);
              }
            }
          }
        }
      }

      // Re-fetch seeded data
      const refreshedStreams = await prisma.youTubeStream.findMany({
        include: {
          trades: {
            select: {
              id: true,
              tradeNumber: true,
              instrument: true,
              direction: true,
              plannedRR: true,
              result: true,
              confidence: true,
              completenessScore: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        streams: refreshedStreams,
        total: refreshedStreams.length,
        page: 1,
        pageSize,
        totalPages: 1,
        stats: {
          streamsAnalyzed: refreshedStreams.length,
          tradesDetected: 3,
          clipsGenerated: 2,
          processingCount: 0,
        },
      };
    }

    return {
      streams,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      stats: {
        streamsAnalyzed: totalAnalyzed,
        tradesDetected: totalTrades,
        clipsGenerated: totalClips,
        processingCount: activeJobs,
      },
    };
  } catch (error) {
    console.error("Error in getYouTubeStreamsAction:", error);
    return {
      streams: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      stats: { streamsAnalyzed: 0, tradesDetected: 0, clipsGenerated: 0, processingCount: 0 },
    };
  }
}

// ==========================================
// 2. SUBMIT / INGEST NEW YOUTUBE LIVESTREAM
// ==========================================
export async function submitYouTubeStreamAction(input: IngestStreamOptions) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  const rawUrl = (input.url || "").trim();
  if (!rawUrl) {
    return { success: false, message: "Please provide a valid YouTube URL." };
  }

  try {
    // 1. Fetch live YouTube metadata
    const metadata = await fetchYouTubeMetadata(rawUrl);
    const videoId = metadata.videoId;

    // 2. Check if already registered
    const existing = await prisma.youTubeStream.findUnique({
      where: { youtubeVideoId: videoId },
    });

    if (existing) {
      return {
        success: true,
        message: "This livestream is already registered in the dashboard.",
        streamId: existing.id,
        isExisting: true,
      };
    }

    // 3. Register stream with rich metadata
    const stream = await prisma.youTubeStream.create({
      data: {
        youtubeVideoId: videoId,
        url: metadata.canonicalUrl,
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        channel: metadata.channel,
        duration: metadata.duration,
        publishedAt: metadata.publishedAt,
        status: "QUEUED",
        transcriptStatus: metadata.hasCaptions ? "EXTRACTED" : "PENDING",
        analysisStatus: "PENDING",
      },
    });

    // 4. Create background processing job
    const job = await prisma.tradeProcessingJob.create({
      data: {
        streamId: stream.id,
        jobType: "ANALYZE_STREAM",
        stage: "QUEUED",
        progressPercent: 10,
        logs: {
          options: input as any,
          metadata: {
            hasCaptions: metadata.hasCaptions,
            captionLanguages: metadata.captionLanguages,
            duration: metadata.duration,
            isLive: metadata.isLive,
          },
          submittedAt: new Date().toISOString(),
        },
      },
    });

    // Trigger processing asynchronously in background (no request cookie dependencies)
    setTimeout(() => {
      runInternalQueueJob(job.id).catch((err) => {
        console.error("Auto queue processor error:", err);
      });
    }, 50);

    revalidatePath("/admin/youtube-live-trades");
    revalidatePath("/admin/youtube-live-trades/queue");

    return {
      success: true,
      message: `"${metadata.title}" added to processing queue and analysis started!`,
      streamId: stream.id,
      jobId: job.id,
      isExisting: false,
    };
  } catch (error: any) {
    console.error("Error submitting YouTube stream:", error);
    return { success: false, message: error?.message || "Failed to submit livestream." };
  }
}

// ==========================================
// 2B. REFRESH / SYNC STREAM METADATA
// ==========================================
export async function refreshStreamMetadataAction(streamId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  if (!streamId) {
    return { success: false, message: "Stream ID is required." };
  }

  try {
    const stream = await prisma.youTubeStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return { success: false, message: "Stream not found." };
    }

    const metadata = await fetchYouTubeMetadata(stream.url || stream.youtubeVideoId);

    const updated = await prisma.youTubeStream.update({
      where: { id: streamId },
      data: {
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        channel: metadata.channel,
        duration: metadata.duration > 0 ? metadata.duration : stream.duration,
        publishedAt: metadata.publishedAt || stream.publishedAt,
      },
    });

    revalidatePath("/admin/youtube-live-trades");
    revalidatePath(`/admin/youtube-live-trades/${streamId}`);

    return {
      success: true,
      message: `Metadata synced for "${updated.title}"`,
      stream: updated,
    };
  } catch (err: any) {
    console.error("Error refreshing stream metadata:", err);
    return { success: false, message: err?.message || "Failed to refresh metadata." };
  }
}

// ==========================================
// 3. GET SINGLE STREAM WITH ALL TRADES & TIMELINE
// ==========================================
export async function getStreamWithTradesAction(streamId: string) {
  await requirePermission("youtube_live_trades.view");
  await ensureDatabaseSchemaSync();

  if (!streamId) return null;

  try {
    const stream = await prisma.youTubeStream.findUnique({
      where: { id: streamId },
      include: {
        trades: {
          include: {
            events: {
              orderBy: { timestamp: "asc" },
            },
            clips: true,
          },
          orderBy: { tradeNumber: "asc" },
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return stream;
  } catch (error) {
    console.error("Error fetching stream details:", error);
    return null;
  }
}

// ==========================================
// 4. GET PROCESSING QUEUE JOBS
// ==========================================
export async function getProcessingJobsAction() {
  await requirePermission("youtube_live_trades.view");
  await ensureDatabaseSchemaSync();

  try {
    const jobs = await prisma.tradeProcessingJob.findMany({
      include: {
        stream: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            youtubeVideoId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jobs;
  } catch (error) {
    console.error("Error fetching processing jobs:", error);
    return [];
  }
}

export async function cancelProcessingJobAction(jobId: string) {
  await requirePermission("youtube_live_trades.manage");
  await ensureDatabaseSchemaSync();

  try {
    const job = await prisma.tradeProcessingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false, message: "Job not found." };
    }

    if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.stage)) {
      return { success: false, message: `Job is already ${job.stage}.` };
    }

    await prisma.tradeProcessingJob.update({
      where: { id: jobId },
      data: {
        stage: "CANCELLED",
        errorMessage: "Cancelled by administrator.",
        completedAt: new Date(),
      },
    });

    revalidatePath("/admin/youtube-live-trades/queue");

    return { success: true, message: "Processing job cancelled successfully." };
  } catch (error: any) {
    console.error("Error cancelling job:", error);
    return { success: false, message: error?.message || "Failed to cancel job." };
  }
}

// ==========================================
// 4B. EXECUTE / PROCESS SINGLE QUEUE JOB
// ==========================================
export async function runInternalQueueJob(jobId: string) {
  try {
    const job = await prisma.tradeProcessingJob.findUnique({
      where: { id: jobId },
      include: { stream: true },
    });

    if (!job) {
      return { success: false, message: "Job not found." };
    }

    if (job.stage === "COMPLETED") {
      return { success: true, message: "Job is already completed." };
    }

    if (!job.streamId) {
      await prisma.tradeProcessingJob.update({
        where: { id: jobId },
        data: { stage: "FAILED", errorMessage: "No streamId associated with this job." },
      });
      return { success: false, message: "No streamId found." };
    }

    const streamId = job.streamId;

    if (job.jobType === "ANALYZE_STREAM" || job.jobType === "EXTRACT_TRANSCRIPT") {
      // 1. Mark as TRANSCRIBING
      await prisma.tradeProcessingJob.update({
        where: { id: jobId },
        data: {
          stage: "TRANSCRIBING",
          progressPercent: 30,
          startedAt: job.startedAt || new Date(),
        },
      });

      // 2. Extract transcript if needed
      const transcriptRes = await extractStreamTranscriptCore(streamId);

      if (!transcriptRes.success && transcriptRes.source !== "WHISPER_FALLBACK") {
        await prisma.tradeProcessingJob.update({
          where: { id: jobId },
          data: {
            stage: "FAILED",
            errorMessage: transcriptRes.message || "Failed to extract transcript from stream.",
          },
        });
        return { success: false, message: transcriptRes.message };
      }

      // 3. Mark as ANALYZING
      await prisma.tradeProcessingJob.update({
        where: { id: jobId },
        data: {
          stage: "ANALYZING",
          progressPercent: 65,
        },
      });

      // 4. Run trade analysis
      const analysisRes = await analyzeStreamTradesCore(streamId);

      if (!analysisRes.success) {
        await prisma.tradeProcessingJob.update({
          where: { id: jobId },
          data: {
            stage: "FAILED",
            errorMessage: analysisRes.message || "Trade analysis failed.",
          },
        });
        return { success: false, message: analysisRes.message };
      }

      // 5. Mark as COMPLETED
      await prisma.tradeProcessingJob.update({
        where: { id: jobId },
        data: {
          stage: "COMPLETED",
          progressPercent: 100,
          completedAt: new Date(),
          logs: {
            ...(typeof job.logs === "object" && job.logs !== null ? (job.logs as any) : {}),
            tradesCount: analysisRes.tradesCount || 0,
            completedAt: new Date().toISOString(),
          },
        },
      });

      try {
        revalidatePath("/admin/youtube-live-trades");
        revalidatePath("/admin/youtube-live-trades/queue");
        revalidatePath(`/admin/youtube-live-trades/${streamId}`);
      } catch {}

      return {
        success: true,
        tradesCount: analysisRes.tradesCount,
        message: `Analysis completed! Detected ${analysisRes.tradesCount} trade setups.`,
      };
    }

    return { success: true, message: `Job ${job.jobType} processed.` };
  } catch (error: any) {
    console.error("Error in runInternalQueueJob:", error);
    await prisma.tradeProcessingJob.update({
      where: { id: jobId },
      data: {
        stage: "FAILED",
        errorMessage: error?.message || "Internal error during job execution",
      },
    }).catch(() => null);

    return { success: false, message: error?.message || "Failed to process job." };
  }
}

export async function processQueueJobAction(jobId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();
  return runInternalQueueJob(jobId);
}

// ==========================================
// 4C. RETRY FAILED OR QUEUED JOB
// ==========================================
export async function retryProcessingJobAction(jobId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  try {
    await prisma.tradeProcessingJob.update({
      where: { id: jobId },
      data: {
        stage: "QUEUED",
        progressPercent: 10,
        errorMessage: null,
      },
    });

    return await processQueueJobAction(jobId);
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to retry job." };
  }
}

// ==========================================
// 4D. PROCESS ALL QUEUED JOBS
// ==========================================
export async function processAllQueuedJobsAction() {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  try {
    const queuedJobs = await prisma.tradeProcessingJob.findMany({
      where: { stage: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    if (queuedJobs.length === 0) {
      return { success: true, processedCount: 0, message: "No queued jobs waiting to be processed." };
    }

    let processed = 0;
    for (const job of queuedJobs) {
      await processQueueJobAction(job.id);
      processed++;
    }

    return {
      success: true,
      processedCount: processed,
      message: `Processed ${processed} queued job(s) successfully.`,
    };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to process queued jobs." };
  }
}

// ==========================================
// 5. DELETE STREAM
// ==========================================
export async function deleteYouTubeStreamAction(streamId: string) {
  await requirePermission("youtube_live_trades.delete");
  await ensureDatabaseSchemaSync();

  if (!streamId) {
    return { success: false, message: "Stream ID is required." };
  }

  try {
    await prisma.youTubeStream.delete({
      where: { id: streamId },
    });

    revalidatePath("/admin/youtube-live-trades");

    return { success: true, message: "Livestream removed successfully." };
  } catch (error: any) {
    console.error("Error deleting stream:", error);
    return { success: false, message: error?.message || "Failed to delete livestream." };
  }
}

// ==========================================
// 6. EXTRACT STREAM TRANSCRIPT (YOUTUBE CAPTIONS + WHISPER FALLBACK)
// ==========================================
export async function extractStreamTranscriptCore(streamId: string) {
  if (!streamId) {
    return { success: false, message: "Stream ID is required." };
  }

  try {
    const stream = await prisma.youTubeStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return { success: false, message: "Stream record not found." };
    }

    // Tier 1: Extract official YouTube captions (with fast yt-dlp auto-sub fallback)
    const transcript = await extractYouTubeCaptions(stream.url || stream.youtubeVideoId, [
      "hi",
      "en",
      "en-IN",
    ]);

    if (transcript && transcript.segments.length > 0) {
      const formatted = formatTranscriptWithTimestamps(transcript.segments);

      await prisma.youTubeStream.update({
        where: { id: streamId },
        data: {
          transcriptText: formatted,
          transcriptJson: transcript.segments as any,
          transcriptStatus: "EXTRACTED",
          duration: stream.duration > 0 ? stream.duration : Math.round(transcript.totalDuration),
        },
      });

      try {
        revalidatePath("/admin/youtube-live-trades");
        revalidatePath(`/admin/youtube-live-trades/${streamId}`);
      } catch {}

      return {
        success: true,
        source: "YOUTUBE_CAPTIONS",
        segmentsCount: transcript.segments.length,
        language: transcript.language,
        message: `Extracted ${transcript.segments.length} timestamped caption segments (${transcript.language}).`,
      };
    }

    // Tier 2: YouTube captions unavailable - flag for Whisper fallback
    await prisma.youTubeStream.update({
      where: { id: streamId },
      data: {
        transcriptStatus: "WHISPER_FALLBACK",
      },
    });

    return {
      success: false,
      source: "WHISPER_FALLBACK",
      message: "YouTube captions are not available for this stream. Marked for Whisper local audio transcription.",
    };
  } catch (err: any) {
    console.error("Error in extractStreamTranscriptCore:", err);
    return { success: false, message: err?.message || "Transcript extraction failed." };
  }
}

export async function extractStreamTranscriptAction(streamId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();
  return extractStreamTranscriptCore(streamId);
}

// ==========================================
// 7. GET STREAM TRANSCRIPT
// ==========================================
export async function getStreamTranscriptAction(streamId: string) {
  await requirePermission("youtube_live_trades.view");
  await ensureDatabaseSchemaSync();

  if (!streamId) return null;

  try {
    const stream = await prisma.youTubeStream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        title: true,
        transcriptText: true,
        transcriptJson: true,
        transcriptStatus: true,
      },
    });

    return stream;
  } catch (err) {
    console.error("Error fetching stream transcript:", err);
    return null;
  }
}

// ==========================================
// 8. ANALYZE STREAM TRADES (STORY RECONSTRUCTION)
// ==========================================
export async function analyzeStreamTradesCore(streamId: string) {
  if (!streamId) {
    return { success: false, message: "Stream ID is required." };
  }

  try {
    const stream = await prisma.youTubeStream.findUnique({
      where: { id: streamId },
      include: { trades: true },
    });

    if (!stream) {
      return { success: false, message: "Stream not found." };
    }

    // 1. Ensure transcript is present; extract if not already done
    let segments: TranscriptSegment[] = Array.isArray(stream.transcriptJson)
      ? (stream.transcriptJson as any)
      : [];

    if (segments.length === 0) {
      const extractResult = await extractStreamTranscriptCore(streamId);
      if (extractResult.success) {
        const refreshed = await prisma.youTubeStream.findUnique({
          where: { id: streamId },
        });
        if (refreshed?.transcriptJson && Array.isArray(refreshed.transcriptJson)) {
          segments = refreshed.transcriptJson as any;
        }
      }
    }

    if (segments.length === 0) {
      return {
        success: false,
        message: "No transcript available to analyze. Please extract transcript first.",
      };
    }

    // 2. Run Phase 5: Extract trade events
    const classifiedEvents = extractTradeEventsFromSegments(segments);

    if (classifiedEvents.length === 0) {
      await prisma.youTubeStream.update({
        where: { id: streamId },
        data: {
          analysisStatus: "COMPLETED",
          status: "ANALYZED",
          tradesCount: 0,
        },
      });

      return {
        success: true,
        tradesCount: 0,
        message: "Analysis completed. No trade setups or executions detected in this stream.",
      };
    }

    // 3. Run Phase 6: State Machine reconstruction (filter for actual executed trades first)
    let candidates = reconstructTradeCandidates(classifiedEvents, true);

    // If no strict actual trades found, also check for planned setups so user sees educational context
    if (candidates.length === 0) {
      candidates = reconstructTradeCandidates(classifiedEvents, false);
    }

    // 4. Save candidates and events to database
    // Delete existing unverified candidates to prevent duplicates
    await prisma.tradeCandidate.deleteMany({
      where: { streamId, isVerified: false },
    });

    for (const cand of candidates) {
      const createdCandidate = await prisma.tradeCandidate.create({
        data: {
          streamId,
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

      // Insert associated events
      for (const ev of cand.events) {
        await prisma.tradeEvent.create({
          data: {
            tradeId: createdCandidate.id,
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
    }

    // Update stream status
    await prisma.youTubeStream.update({
      where: { id: streamId },
      data: {
        analysisStatus: "COMPLETED",
        status: "ANALYZED",
        tradesCount: candidates.length,
      },
    });

    try {
      revalidatePath("/admin/youtube-live-trades");
      revalidatePath(`/admin/youtube-live-trades/${streamId}`);
    } catch {}

    return {
      success: true,
      tradesCount: candidates.length,
      message: `Successfully analyzed stream! Detected ${candidates.length} trade stories with complete timelines.`,
    };
  } catch (err: any) {
    console.error("Error in analyzeStreamTradesCore:", err);
    return { success: false, message: err?.message || "Trade analysis failed." };
  }
}

export async function analyzeStreamTradesAction(streamId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();
  return analyzeStreamTradesCore(streamId);
}

// ==========================================
// 9. VERIFY TRADE CANDIDATE
// ==========================================
export async function verifyTradeCandidateAction(tradeId: string, isVerified: boolean) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Trade ID is required." };
  }

  try {
    const updated = await prisma.tradeCandidate.update({
      where: { id: tradeId },
      data: { isVerified },
      select: { id: true, streamId: true, isVerified: true },
    });

    revalidatePath(`/admin/youtube-live-trades/${updated.streamId}`);

    return {
      success: true,
      isVerified: updated.isVerified,
      message: updated.isVerified ? "Trade marked as verified." : "Trade unverified.",
    };
  } catch (err: any) {
    console.error("Error verifying trade:", err);
    return { success: false, message: err?.message || "Failed to update verification." };
  }
}

// ==========================================
// 10. UPDATE TRADE CANDIDATE DETAILS
// ==========================================
export async function updateTradeCandidateAction(
  tradeId: string,
  data: {
    instrument?: string;
    direction?: string;
    plannedRR?: string;
    result?: string;
    clipStart?: number;
    clipEnd?: number;
    entryCriteria?: string;
  }
) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Trade ID is required." };
  }

  try {
    const updated = await prisma.tradeCandidate.update({
      where: { id: tradeId },
      data: {
        ...(data.instrument ? { instrument: data.instrument } : {}),
        ...(data.direction ? { direction: data.direction } : {}),
        ...(data.plannedRR ? { plannedRR: data.plannedRR } : {}),
        ...(data.result ? { result: data.result } : {}),
        ...(data.clipStart !== undefined ? { clipStart: data.clipStart } : {}),
        ...(data.clipEnd !== undefined ? { clipEnd: data.clipEnd } : {}),
        ...(data.entryCriteria ? { entryCriteria: data.entryCriteria } : {}),
      },
      select: { id: true, streamId: true },
    });

    revalidatePath(`/admin/youtube-live-trades/${updated.streamId}`);

    return {
      success: true,
      message: "Trade candidate updated successfully.",
    };
  } catch (err: any) {
    console.error("Error updating trade candidate:", err);
    return { success: false, message: err?.message || "Failed to update trade candidate." };
  }
}

// ==========================================
// 11. DRY-RUN STREAM ANALYSIS (NO DB MUTATIONS)
// ==========================================
export async function dryRunStreamAnalysisAction(urlOrStreamId: string) {
  await requirePermission("youtube_live_trades.view");

  if (!urlOrStreamId) {
    return { success: false, message: "URL or Stream ID is required for dry-run." };
  }

  try {
    // Check if it's an existing stream ID in DB
    let segments: TranscriptSegment[] | undefined = undefined;
    let mockMetadata: { title?: string; channel?: string; duration?: number } | undefined = undefined;
    let targetUrlOrId = urlOrStreamId;

    if (!urlOrStreamId.startsWith("http")) {
      const existing = await prisma.youTubeStream.findUnique({
        where: { id: urlOrStreamId },
      }).catch(() => null);

      if (existing) {
        targetUrlOrId = existing.url || existing.youtubeVideoId;
        mockMetadata = {
          title: existing.title,
          channel: existing.channel || "Rahul Trade Warrior Academy",
          duration: existing.duration,
        };
        if (Array.isArray(existing.transcriptJson)) {
          segments = existing.transcriptJson as any;
        }
      }
    }

    const report = await runDryRunTradeAnalysis({
      urlOrVideoId: targetUrlOrId,
      segments,
      mockMetadata,
    });

    return {
      success: true,
      report,
      message: `Dry-run completed. Reconstructed ${report.allCandidates.length} candidate(s) (${report.actualTrades.length} actual executed trades) with zero database changes.`,
    };
  } catch (err: any) {
    console.error("Error in dryRunStreamAnalysisAction:", err);
    return { success: false, message: err?.message || "Dry-run analysis failed." };
  }
}

// ==========================================
// 12. VERIFY TRADE CANDIDATE VISUALS (FRAME INSPECTION)
// ==========================================
export async function verifyTradeCandidateVisualsAction(tradeId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Trade ID is required." };
  }

  try {
    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: {
        stream: true,
        events: true,
      },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    const actualEntry = candidate.actualEntry as any;
    const plannedEntry = candidate.plannedEntry as any;
    const timestamp = actualEntry?.timestamp || plannedEntry?.timestamp || candidate.events[0]?.timestamp || 0;

    // Run visual verifier on candidate's entry timestamp
    const visualResult = await verifyVisualChartFrame({
      videoSource: candidate.stream?.url || candidate.stream?.youtubeVideoId,
      timestamp,
      mockTest: !candidate.stream?.url,
    });

    // Update candidate and matching ACTUAL_ENTRY event
    await prisma.tradeCandidate.update({
      where: { id: tradeId },
      data: {
        isVerified: visualResult.chartDetected,
        confidence: visualResult.chartDetected
          ? Math.max(candidate.confidence, visualResult.confidence)
          : candidate.confidence,
      },
    });

    // Mark event visualVerified = true
    await prisma.tradeEvent.updateMany({
      where: {
        tradeId,
        eventType: { in: ["ACTUAL_ENTRY", "CANDLE_CONFIRMATION"] },
      },
      data: {
        visualVerified: visualResult.chartDetected,
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      visualResult,
      message: visualResult.chartDetected
        ? `Visual verification passed! Active trading chart verified (${(visualResult.confidence * 100).toFixed(0)}% confidence, ${visualResult.backgroundTheme} theme, ${visualResult.dominantCandleColor} candle).`
        : "Visual verification completed with warnings: chart canvas was not clearly resolved.",
    };
  } catch (err: any) {
    console.error("Error in verifyTradeCandidateVisualsAction:", err);
    return { success: false, message: err?.message || "Visual verification failed." };
  }
}

// ==========================================
// 13. MULTI-SOURCE ENTRY VERIFICATION
// ==========================================
export async function runMultiSourceVerificationAction(tradeId: string) {
  await requirePermission("youtube_live_trades.analyze");
  await ensureDatabaseSchemaSync();

  if (!tradeId) {
    return { success: false, message: "Trade ID is required." };
  }

  try {
    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: {
        stream: true,
        events: true,
      },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    // 1. Run visual verification
    const actualEntry = candidate.actualEntry as any;
    const plannedEntry = candidate.plannedEntry as any;
    const timestamp = actualEntry?.timestamp || plannedEntry?.timestamp || candidate.events[0]?.timestamp || 0;

    const visualResult = await verifyVisualChartFrame({
      videoSource: candidate.stream?.url || candidate.stream?.youtubeVideoId,
      timestamp,
      mockTest: !candidate.stream?.url,
    });

    // 2. Format reconstructed candidate object
    const reconstructedObj = {
      tradeNumber: candidate.tradeNumber,
      instrument: candidate.instrument,
      direction: candidate.direction as "BUY" | "SELL",
      isActualTrade: !!candidate.actualEntry,
      marketContext: candidate.marketContext || "",
      liquidity: candidate.liquidity as any,
      marketStructure: candidate.marketStructure as any,
      priceAction: candidate.priceAction,
      candleConfirmation: candidate.candleConfirmation as any,
      entryCriteria: candidate.entryCriteria,
      plannedEntry: candidate.plannedEntry as any,
      actualEntry: candidate.actualEntry as any,
      stopLoss: candidate.stopLoss as any,
      takeProfit: candidate.takeProfit as any,
      plannedRR: candidate.plannedRR || "1:3",
      currentR: candidate.currentR || "1R",
      realizedR: candidate.realizedR || "1:2",
      riskStatus: candidate.riskStatus as any,
      result: candidate.result as any,
      confidence: candidate.confidence,
      completenessScore: candidate.completenessScore,
      clipStart: candidate.clipStart || 0,
      clipEnd: candidate.clipEnd || 0,
      events: candidate.events as any,
    };

    // 3. Compute multi-source report
    const report = verifyTradeMultiSource(reconstructedObj, visualResult);

    // 4. Update database candidate
    const isVerified = report.verificationLevel === "VERIFIED_HIGH" || report.verificationLevel === "VERIFIED_MEDIUM";

    await prisma.tradeCandidate.update({
      where: { id: tradeId },
      data: {
        confidence: report.totalScore,
        isVerified,
      },
    });

    // Update actual entry event if verified
    await prisma.tradeEvent.updateMany({
      where: {
        tradeId,
        eventType: { in: ["ACTUAL_ENTRY", "CANDLE_CONFIRMATION"] },
      },
      data: {
        visualVerified: visualResult.chartDetected,
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      report,
      message: `Multi-source verification completed! Level: ${report.verificationLevel} (${Math.round(report.totalScore * 100)}% consolidated confidence).`,
    };
  } catch (err: any) {
    console.error("Error in runMultiSourceVerificationAction:", err);
    return { success: false, message: err?.message || "Multi-source verification failed." };
  }
}

/**
 * Downloads only the selected trade segment (5-10 minute window)
 * avoiding full multi-hour livestream downloads.
 */
export async function downloadTradeSegmentAction(
  tradeId: string,
  options?: { forceMock?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: { stream: true },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    const clipStart = candidate.clipStart || 0;
    const clipEnd = candidate.clipEnd || (clipStart + 300);

    // Create or log processing job
    const job = await prisma.tradeProcessingJob.create({
      data: {
        streamId: candidate.streamId,
        tradeId: candidate.id,
        jobType: "GENERATE_CLIP",
        stage: "DOWNLOADING",
        progressPercent: 20,
      },
    });

    // Run selective segment download
    const result = await downloadTradeSegment({
      streamUrl: candidate.stream.url,
      streamId: candidate.stream.id,
      candidateId: candidate.id,
      clipStart,
      clipEnd,
      forceMock: options?.forceMock ?? false,
    });

    if (!result.success) {
      await prisma.tradeProcessingJob.update({
        where: { id: job.id },
        data: {
          stage: "FAILED",
          errorMessage: result.error || "Segment download failed",
        },
      });

      return {
        success: false,
        message: result.error || "Failed to download trade video segment.",
      };
    }

    await prisma.tradeProcessingJob.update({
      where: { id: job.id },
      data: {
        stage: "COMPLETED",
        progressPercent: 100,
        completedAt: new Date(),
        logs: {
          filePath: result.filePath,
          durationSec: result.durationSec,
          fileSizeBytes: result.fileSizeBytes,
          method: result.method,
        },
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      result,
      message: `Trade segment (${result.durationSec}s) downloaded successfully via ${result.method}!`,
    };
  } catch (err: any) {
    console.error("Error in downloadTradeSegmentAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to process segment download action.",
    };
  }
}

/**
 * Composites the downloaded trade segment into a polished Master MP4
 * with live brand watermarks, trade HUD badges, and web faststart encoding.
 */
export async function generateTradeMasterClipAction(
  tradeId: string,
  options?: { mockBase?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: { stream: true },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    const job = await prisma.tradeProcessingJob.create({
      data: {
        streamId: candidate.streamId,
        tradeId: candidate.id,
        jobType: "GENERATE_CLIP",
        stage: "GENERATING_CLIP",
        progressPercent: 40,
      },
    });

    // Check if raw segment exists; if not, download or mock-generate it
    const expectedSegmentPath = `tmp/trade_clips/segments/trade_${candidate.streamId}_${candidate.id}.mp4`;
    const fullSegmentPath = require("path").resolve(process.cwd(), expectedSegmentPath);
    let segmentReady = require("fs").existsSync(fullSegmentPath);

    if (!segmentReady) {
      const segRes = await downloadTradeSegment({
        streamUrl: candidate.stream.url,
        streamId: candidate.stream.id,
        candidateId: candidate.id,
        clipStart: candidate.clipStart || 0,
        clipEnd: candidate.clipEnd || ((candidate.clipStart || 0) + 300),
        forceMock: options?.mockBase ?? false,
      });

      if (!segRes.success || !segRes.filePath) {
        await prisma.tradeProcessingJob.update({
          where: { id: job.id },
          data: {
            stage: "FAILED",
            errorMessage: segRes.error || "Failed to acquire input video segment",
          },
        });
        return { success: false, message: segRes.error || "Failed to acquire trade video segment." };
      }
    }

    // Now composite Master MP4
    const clipResult = await generateMasterClip({
      inputPath: fullSegmentPath,
      tradeId: candidate.id,
      streamId: candidate.streamId,
      instrument: candidate.instrument,
      direction: candidate.direction,
      plannedRR: candidate.plannedRR || "1:3",
      resultText: candidate.result === "TP" ? `TP HIT (${candidate.realizedR || candidate.plannedRR})` : candidate.result,
      tradeNumber: candidate.tradeNumber,
      watermark: "RAHUL TRADE WARRIOR ACADEMY",
      mockBase: options?.mockBase ?? false,
    });

    if (!clipResult.success || !clipResult.filePath) {
      await prisma.tradeProcessingJob.update({
        where: { id: job.id },
        data: {
          stage: "FAILED",
          errorMessage: clipResult.error || "Master clip compositing failed",
        },
      });
      return { success: false, message: clipResult.error || "Failed to composite master clip." };
    }

    // Save asset through storage manager (Bunny CDN or public local storage)
    const savedMaster = await saveTradeAsset({
      localFilePath: clipResult.filePath,
      assetType: "MASTER_VIDEO",
      streamId: candidate.streamId,
      tradeId: candidate.id,
    });

    const publicMasterUrl = savedMaster.success ? savedMaster.publicUrl : clipResult.filePath;

    // Save TradeClip record
    const clip = await prisma.tradeClip.create({
      data: {
        tradeId: candidate.id,
        masterVideoUrl: publicMasterUrl,
        durationSec: Math.round(clipResult.durationSec || 0),
        status: "READY",
        storageProvider: savedMaster.storageProvider,
        metadata: {
          format: clipResult.format,
          fileSizeBytes: clipResult.fileSizeBytes,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Increment clipsCount on stream
    await prisma.youTubeStream.update({
      where: { id: candidate.streamId },
      data: {
        clipsCount: { increment: 1 },
      },
    });

    // Update job stage
    await prisma.tradeProcessingJob.update({
      where: { id: job.id },
      data: {
        stage: "COMPLETED",
        progressPercent: 100,
        completedAt: new Date(),
        logs: {
          clipId: clip.id,
          masterVideoUrl: clip.masterVideoUrl,
          durationSec: clip.durationSec,
        },
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      clip,
      message: `Master MP4 clip (${clipResult.durationSec}s) created successfully with official HUD overlays!`,
    };
  } catch (err: any) {
    console.error("Error in generateTradeMasterClipAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to generate master clip.",
    };
  }
}

/**
 * Accelerates silent waiting intervals in an existing trade clip
 * while keeping voice commentary at natural 1.0x speed.
 */
export async function accelerateTradeClipSilenceAction(
  tradeId: string,
  options?: { speed?: number; mockBase?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: {
        stream: true,
        clips: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    let clip = candidate.clips[0];
    if (!clip || !clip.masterVideoUrl) {
      // Auto-generate master clip if not created yet
      const genRes = await generateTradeMasterClipAction(tradeId, { mockBase: options?.mockBase });
      if (!genRes.success || !genRes.clip || !genRes.clip.masterVideoUrl) {
        return { success: false, message: "Could not locate or generate base clip for silence acceleration." };
      }
      clip = genRes.clip;
    }

    const inputVideoUrl = clip.masterVideoUrl;
    if (!inputVideoUrl) {
      return { success: false, message: "Base clip has no valid video file." };
    }

    const speed = options?.speed || 3.0;

    const accResult = await accelerateSilentPeriods({
      inputPath: inputVideoUrl,
      speed,
      mockBase: options?.mockBase ?? false,
    });

    if (!accResult.success || !accResult.filePath) {
      return { success: false, message: accResult.error || "Failed to accelerate silence periods." };
    }

    // Update existing TradeClip with new accelerated video URL and stats
    const updatedClip = await prisma.tradeClip.update({
      where: { id: clip.id },
      data: {
        masterVideoUrl: accResult.filePath,
        durationSec: Math.round(accResult.newDuration || clip.durationSec || 0),
        metadata: {
          ...((clip.metadata as any) || {}),
          accelerated: true,
          speedFactor: speed,
          originalDuration: accResult.originalDuration,
          newDuration: accResult.newDuration,
          savedSeconds: accResult.savedSeconds,
          savedPercent: accResult.savedPercent,
          silenceSegmentsCount: accResult.silenceSegmentsCount,
        },
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      clip: updatedClip,
      result: accResult,
      message: `Silent waiting accelerated by ${speed}x! Saved ${accResult.savedSeconds}s (${accResult.savedPercent}% time reduction).`,
    };
  } catch (err: any) {
    console.error("Error in accelerateTradeClipSilenceAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to process silence acceleration.",
    };
  }
}

/**
 * Generates standards-compliant .srt subtitles aligned to the trade clip.
 */
export async function generateTradeSubtitlesAction(tradeId: string) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: {
        events: { orderBy: { timestamp: "asc" } },
        stream: true,
        clips: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    const clipStart = candidate.clipStart || 0;
    const clipEnd = candidate.clipEnd || (clipStart + 300);

    // Map candidate events to subtitle inputs
    let events = candidate.events.map((e) => ({
      timestamp: e.timestamp,
      endTimestamp: e.endTimestamp,
      text: e.text,
      eventType: e.eventType,
    }));

    // If no events logged in database yet, synthesize from candidate trade story fields
    if (events.length === 0) {
      const storyItems = [
        candidate.marketContext && { timestamp: clipStart + 2, text: candidate.marketContext },
        candidate.liquidity && { timestamp: clipStart + 6, text: `Liquidity grab: ${(candidate.liquidity as any).text || "Sweep detected"}` },
        candidate.marketStructure && { timestamp: clipStart + 12, text: `Market structure: ${(candidate.marketStructure as any).type || "CHoCH/COC confirmed"}` },
        candidate.candleConfirmation && { timestamp: clipStart + 18, text: `Candle confirmation: ${(candidate.candleConfirmation as any).type || "Pin bar / rejection"}` },
        candidate.entryCriteria && { timestamp: clipStart + 24, text: `Entry criteria: ${candidate.entryCriteria}` },
        candidate.actualEntry && { timestamp: clipStart + 30, text: `Execution entry taken at ${(candidate.actualEntry as any).price || "market"}` },
        candidate.stopLoss && { timestamp: clipStart + 35, text: `Stop loss set at ${(candidate.stopLoss as any).price || "level"}` },
        candidate.takeProfit && { timestamp: clipStart + 42, text: `Target RR: ${candidate.plannedRR || "1:3"}` },
      ].filter(Boolean) as any[];

      events = storyItems;
    }

    const srtResult = await generateSrtFile({
      events,
      clipStart,
      clipEnd,
      filename: `trade_${candidate.streamId}_${candidate.id}.srt`,
    });

    if (!srtResult.success || !srtResult.filePath) {
      return { success: false, message: srtResult.error || "Failed to generate subtitle file." };
    }

    // Save asset through storage manager
    const savedSrt = await saveTradeAsset({
      localFilePath: srtResult.filePath,
      assetType: "SUBTITLE_SRT",
      streamId: candidate.streamId,
      tradeId: candidate.id,
      filename: `trade_${candidate.streamId}_${candidate.id}.srt`,
    });

    const publicSrtUrl = savedSrt.success ? savedSrt.publicUrl : srtResult.filePath;

    // Update existing TradeClip with srtUrl if clip exists
    if (candidate.clips.length > 0) {
      await prisma.tradeClip.update({
        where: { id: candidate.clips[0].id },
        data: {
          srtUrl: publicSrtUrl,
        },
      });
    }

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      filePath: publicSrtUrl,
      cueCount: srtResult.cueCount,
      srtContent: srtResult.srtContent,
      message: `Generated ${srtResult.cueCount} subtitle cues (.srt) successfully!`,
    };
  } catch (err: any) {
    console.error("Error in generateTradeSubtitlesAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to generate trade subtitles.",
    };
  }
}

/**
 * Converts a trade master clip into a 9:16 vertical short (1080x1920)
 * with blurred backdrop stacking and high-engagement trade callouts.
 */
export async function generateTradeVerticalShortAction(
  tradeId: string,
  options?: { mockBase?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    const candidate = await prisma.tradeCandidate.findUnique({
      where: { id: tradeId },
      include: {
        stream: true,
        clips: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!candidate) {
      return { success: false, message: "Trade candidate not found." };
    }

    let clip = candidate.clips[0];
    if (!clip || !clip.masterVideoUrl) {
      // Auto-generate master clip if not created yet
      const genRes = await generateTradeMasterClipAction(tradeId, { mockBase: options?.mockBase });
      if (!genRes.success || !genRes.clip || !genRes.clip.masterVideoUrl) {
        return { success: false, message: "Could not generate master clip required for vertical short." };
      }
      clip = genRes.clip;
    }

    const inputVideoUrl = clip.masterVideoUrl;
    if (!inputVideoUrl) {
      return { success: false, message: "Master clip has no valid video file." };
    }

    const shortResult = await generateVerticalShort({
      inputPath: inputVideoUrl,
      tradeId: candidate.id,
      streamId: candidate.streamId,
      instrument: candidate.instrument,
      direction: candidate.direction,
      plannedRR: candidate.plannedRR || "1:3",
      resultText: candidate.result === "TP" ? `TP HIT (${candidate.realizedR || candidate.plannedRR})` : candidate.result,
      tradeNumber: candidate.tradeNumber,
      academyName: "RAHUL TRADE WARRIOR",
      mockBase: options?.mockBase ?? false,
    });

    if (!shortResult.success || !shortResult.filePath) {
      return { success: false, message: shortResult.error || "Failed to composite 9:16 vertical short." };
    }

    // Save asset through storage manager
    const savedShort = await saveTradeAsset({
      localFilePath: shortResult.filePath,
      assetType: "SHORT_VIDEO",
      streamId: candidate.streamId,
      tradeId: candidate.id,
      filename: `short_${candidate.streamId}_${candidate.id}.mp4`,
    });

    const publicShortUrl = savedShort.success ? savedShort.publicUrl : shortResult.filePath;

    // Update existing TradeClip with shortVideoUrl and metadata
    const updatedClip = await prisma.tradeClip.update({
      where: { id: clip.id },
      data: {
        shortVideoUrl: publicShortUrl,
        metadata: {
          ...((clip.metadata as any) || {}),
          shortGenerated: true,
          shortFormat: shortResult.format,
          shortResolution: shortResult.resolution,
          shortFileSizeBytes: shortResult.fileSizeBytes,
        },
      },
    });

    revalidatePath(`/admin/youtube-live-trades/${candidate.streamId}`);

    return {
      success: true,
      clip: updatedClip,
      result: shortResult,
      message: "9:16 Vertical Short (1080x1920) generated successfully for Shorts/Reels!",
    };
  } catch (err: any) {
    console.error("Error in generateTradeVerticalShortAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to generate vertical short.",
    };
  }
}

/**
 * 1-Click Complete Clip Suite Generator:
 * Generates Master MP4 (16:9), Subtitles (.srt), and Vertical Short (9:16)
 * and persists them through the configured storage provider (Bunny CDN / Local).
 */
export async function generateFullTradeClipSuiteAction(
  tradeId: string,
  options?: { mockBase?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.generate_clip");
    await ensureDatabaseSchemaSync();

    // 1. Generate Master MP4 Clip
    const masterRes = await generateTradeMasterClipAction(tradeId, options);
    if (!masterRes.success || !masterRes.clip) {
      return { success: false, message: masterRes.message || "Failed to generate master video clip." };
    }

    // 2. Generate Subtitles
    await generateTradeSubtitlesAction(tradeId).catch((err) => {
      console.warn("Subtitle generation warning:", err);
    });

    // 3. Generate Vertical Short (9:16)
    await generateTradeVerticalShortAction(tradeId, options).catch((err) => {
      console.warn("Vertical short generation warning:", err);
    });

    // 4. Retrieve refreshed clip record with all URLs
    const finalClip = await prisma.tradeClip.findFirst({
      where: { tradeId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      clip: finalClip,
      message: "Successfully generated Master MP4, 9:16 Vertical Short, and Subtitles (.srt)!",
    };
  } catch (err: any) {
    console.error("Error in generateFullTradeClipSuiteAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to generate complete trade clip suite.",
    };
  }
}

/**
 * Scans a YouTube channel for new live streams and automatically ingests them.
 */
export async function scanYouTubeChannelAction(
  channelInput: string = "@rahultradewarrior",
  options?: { limit?: number; autoIngest?: boolean; forceMock?: boolean }
) {
  try {
    await requirePermission("youtube_live_trades.analyze");
    await ensureDatabaseSchemaSync();

    const scanResult = await scanYouTubeChannel(channelInput, {
      limit: options?.limit || 10,
      forceMock: options?.forceMock ?? false,
    });

    if (!scanResult.success) {
      return { success: false, message: scanResult.error || "Channel scan failed." };
    }

    const job = await prisma.tradeProcessingJob.create({
      data: {
        jobType: "CHANNEL_SCAN",
        stage: "COMPLETED",
        progressPercent: 100,
        completedAt: new Date(),
        logs: {
          channel: scanResult.channelIdentifier,
          method: scanResult.method,
          discoveredCount: scanResult.discoveredStreams.length,
        },
      },
    });

    let newIngestedCount = 0;
    const ingestedStreams = [];

    for (const item of scanResult.discoveredStreams) {
      const existing = await prisma.youTubeStream.findUnique({
        where: { youtubeVideoId: item.youtubeVideoId },
      });

      if (!existing && options?.autoIngest !== false) {
        const created = await prisma.youTubeStream.create({
          data: {
            youtubeVideoId: item.youtubeVideoId,
            url: item.url,
            title: item.title,
            thumbnail: item.thumbnail,
            channel: item.channelTitle || "Rahul Trade Warrior Academy",
            publishedAt: item.publishedAt,
            status: "QUEUED",
            transcriptStatus: "PENDING",
            analysisStatus: "PENDING",
          },
        });
        newIngestedCount++;
        ingestedStreams.push(created);
      }
    }

    revalidatePath("/admin/youtube-live-trades");

    return {
      success: true,
      jobId: job.id,
      channel: scanResult.channelIdentifier,
      method: scanResult.method,
      totalDiscovered: scanResult.discoveredStreams.length,
      newIngestedCount,
      streams: scanResult.discoveredStreams,
      message: `Scanned channel: discovered ${scanResult.discoveredStreams.length} stream(s), ingested ${newIngestedCount} new stream(s) into database.`,
    };
  } catch (err: any) {
    console.error("Error in scanYouTubeChannelAction:", err);
    return {
      success: false,
      message: err?.message || "Failed to scan YouTube channel.",
    };
  }
}











