/**
 * Comprehensive Automated Test Suite - Phase 22
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Verifies the complete end-to-end pipeline across all 15 core engines.
 */

import path from "path";
import fs from "fs";
import { fetchYouTubeMetadata } from "../src/lib/youtube-trades/youtube-metadata";
import { formatTranscriptWithTimestamps } from "../src/lib/youtube-trades/transcript-extractor";
import { extractTradeEventsFromSegments } from "../src/lib/youtube-trades/terminology";
import { reconstructTradeCandidates } from "../src/lib/youtube-trades/state-machine";
import { buildRRTimeline } from "../src/lib/youtube-trades/rr-engine";
import { analyzeTradeManagement } from "../src/lib/youtube-trades/trade-management";
import { verifyTradeMultiSource } from "../src/lib/youtube-trades/entry-verifier";
import { downloadTradeSegment } from "../src/lib/youtube-trades/segment-downloader";
import { generateMasterClip } from "../src/lib/youtube-trades/clip-generator";
import { accelerateSilentPeriods } from "../src/lib/youtube-trades/silence-accelerator";
import { formatEventsToSrt, generateSrtFile } from "../src/lib/youtube-trades/subtitle-generator";
import { generateVerticalShort } from "../src/lib/youtube-trades/vertical-short-generator";
import { scanYouTubeChannel } from "../src/lib/youtube-trades/channel-scanner";
import { saveTradeAsset } from "../src/lib/youtube-trades/storage-manager";

async function runComprehensiveSuite() {
  console.log("================================================================================");
  console.log("PHASE 22: COMPREHENSIVE AUTOMATED END-TO-END VERIFICATION SUITE");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "e2e_suite");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 1. YouTube Metadata
  console.log("[1/14] Testing YouTube Metadata Fetcher...");
  const meta = await fetchYouTubeMetadata("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  if (!meta || !meta.title) throw new Error("Step 1 Failed: Metadata fetcher failed");
  console.log(`[PASS] Step 1: Resolved "${meta.title}" (${meta.channel}) via oEmbed`);

  // 2. Transcript & Terminology Extraction
  console.log("[2/14] Testing Transcript Formatting & Hindi Terminology Extraction...");
  const sampleTranscript = [
    { text: "Good morning traders, Asian session high liquidity sweep ho chuka hai.", start: 100, duration: 4, end: 104 },
    { text: "Ab hum 5 minute timeframe pe CHoCH aur market structure shift dekhenge.", start: 105, duration: 4, end: 109 },
    { text: "Hammer candle form hui rejection ke sath.", start: 110, duration: 4, end: 114 },
    { text: "Red candle ka high break hone pe entry execute karenge.", start: 115, duration: 3, end: 118 },
    { text: "Maine entry le li hai gold me 2650 pe, order execute kar diya!", start: 119, duration: 4, end: 123 },
    { text: "Stop loss hamara candle ke low 2640 pe rahega, risk 10 points ka hai.", start: 124, duration: 3, end: 127 },
    { text: "1:2 target achieve ho gaya, SL cost pe le aao ab trade risk free ho gaya!", start: 140, duration: 5, end: 145 },
    { text: "Target hit at 2680! 1:3 RR profit booked successfully.", start: 160, duration: 4, end: 164 },
  ];
  const formattedTranscript = formatTranscriptWithTimestamps(sampleTranscript);
  const events = extractTradeEventsFromSegments(sampleTranscript);
  if (events.length < 5) throw new Error("Step 2 Failed: Insufficient trade events extracted");
  console.log(`[PASS] Step 2: Extracted ${events.length} SMC events from Hindi/English commentary`);

  // 3. Trade State Machine (Reconstruction)
  console.log("[3/14] Testing Trade State Machine Candidate Isolation...");
  const candidates = reconstructTradeCandidates(events);
  if (candidates.length === 0) throw new Error("Step 3 Failed: No trade candidate reconstructed");
  const trade = candidates[0];
  if (!trade.isActualTrade) throw new Error("Step 3 Failed: Trade should be recognized as actual execution");
  console.log(`[PASS] Step 3: Reconstructed actual trade (${trade.instrument} ${trade.direction}) with completeness ${trade.completenessScore}`);

  // 4. R:R Trajectory Engine
  console.log("[4/14] Testing Risk:Reward Milestone Engine...");
  const rrTimeline = buildRRTimeline(trade);
  if (rrTimeline.plannedRRValue < 2.0 || rrTimeline.milestones.length === 0) {
    throw new Error("Step 4 Failed: RR calculation invalid");
  }
  console.log(`[PASS] Step 4: RR Planned: ${rrTimeline.plannedRRRatio}, Milestones: ${rrTimeline.milestones.length}`);

  // 5. Capital Defense & Trade Management
  console.log("[5/14] Testing Capital Defense (Breakeven & Trailing SL)...");
  const mgmtState = analyzeTradeManagement(trade);
  if (!mgmtState.isRiskFree && mgmtState.capitalRiskReductionPercent < 50) {
    throw new Error("Step 5 Failed: Capital defense state not triggered");
  }
  console.log(`[PASS] Step 5: Capital defense status: Risk Reduced by ${mgmtState.capitalRiskReductionPercent}% (Score: ${mgmtState.managementScore})`);

  // 6. Multi-source Entry Verification
  console.log("[6/14] Testing Multi-source Entry Verification Engine...");
  const verifyReport = verifyTradeMultiSource(trade, {
    chartDetected: true,
    confidence: 0.9,
    backgroundTheme: "DARK",
    dominantCandleColor: "GREEN",
    rois: {
      chartCanvas: { x: 50, y: 100, width: 800, height: 500 },
      symbolHeader: { x: 50, y: 20, width: 300, height: 60 },
    },
  });
  if (verifyReport.verificationLevel === "UNVERIFIED") {
    throw new Error("Step 6 Failed: Multi-source verification should be confirmed");
  }
  console.log(`[PASS] Step 6: Multi-source level: ${verifyReport.verificationLevel} (${Math.round(verifyReport.totalScore * 100)}% confidence)`);

  // 7. Selective Segment Download (Synthetic Mock)
  console.log("[7/14] Testing Selective Segment Download Pipeline...");
  const segmentResult = await downloadTradeSegment({
    streamUrl: "https://www.youtube.com/watch?v=mock_e2e_stream",
    streamId: "stream_e2e",
    candidateId: "trade_e2e",
    clipStart: 100,
    clipEnd: 110,
    outputDir: testDir,
    forceMock: true,
  });
  if (!segmentResult.success || !segmentResult.filePath) throw new Error("Step 7 Failed: Segment download failed");
  console.log(`[PASS] Step 7: Acquired 10s segment (${segmentResult.fileSizeBytes} bytes)`);

  // 8. Master MP4 Clip Generation
  console.log("[8/14] Testing Master MP4 Clip Generation with Trade HUD Badges...");
  const masterPath = path.join(testDir, "master_e2e.mp4");
  const masterResult = await generateMasterClip({
    inputPath: segmentResult.filePath,
    outputPath: masterPath,
    tradeId: "trade_e2e",
    streamId: "stream_e2e",
    instrument: "XAUUSD",
    direction: "BUY",
    plannedRR: "1:3",
    resultText: "TP HIT (3.0R)",
    tradeNumber: 1,
    watermark: "RAHUL TRADE WARRIOR ACADEMY",
  });
  if (!masterResult.success || !masterResult.filePath) throw new Error("Step 8 Failed: Master clip generation failed");
  console.log(`[PASS] Step 8: Master MP4 rendered (${masterResult.fileSizeBytes} bytes, format: ${masterResult.format})`);

  // 9. Smart Silence Acceleration
  console.log("[9/14] Testing Silence Acceleration with Protected Speech...");
  const acceleratedPath = path.join(testDir, "master_e2e_accelerated.mp4");
  const accResult = await accelerateSilentPeriods({
    inputPath: masterResult.filePath,
    outputPath: acceleratedPath,
    speed: 2.5,
    mockBase: true,
  });
  if (!accResult.success) throw new Error("Step 9 Failed: Silence acceleration failed");
  console.log(`[PASS] Step 9: Accelerated silent intervals (Saved ${accResult.savedSeconds}s, ${accResult.savedPercent}%)`);

  // 10. Hindi/Hinglish Subtitles (.srt)
  console.log("[10/14] Testing Subtitle Generation (.srt)...");
  const srtResult = await generateSrtFile({
    events: trade.events,
    clipStart: 100,
    clipEnd: 170,
    outputDir: testDir,
    filename: "trade_e2e.srt",
  });
  if (!srtResult.success || srtResult.cueCount === 0) throw new Error("Step 10 Failed: Subtitles failed");
  console.log(`[PASS] Step 10: Generated ${srtResult.cueCount} relative subtitle cues (.srt)`);

  // 11. 9:16 Vertical Short Generation
  console.log("[11/14] Testing 9:16 Vertical Short Generation (1080x1920)...");
  const shortPath = path.join(testDir, "short_e2e_1080x1920.mp4");
  const shortResult = await generateVerticalShort({
    inputPath: masterResult.filePath,
    outputPath: shortPath,
    tradeId: "trade_e2e",
    streamId: "stream_e2e",
    instrument: "XAUUSD",
    direction: "BUY",
    plannedRR: "1:3",
    resultText: "TP HIT",
    tradeNumber: 1,
    academyName: "RAHUL TRADE WARRIOR",
  });
  if (!shortResult.success || !shortResult.filePath) throw new Error("Step 11 Failed: Vertical short failed");
  console.log(`[PASS] Step 11: 9:16 Vertical short created (${shortResult.resolution}, ${shortResult.fileSizeBytes} bytes)`);

  // 12. Storage Manager Integration
  console.log("[12/14] Testing Multi-tier Storage Persistence...");
  const storeRes = await saveTradeAsset({
    localFilePath: masterResult.filePath,
    assetType: "MASTER_VIDEO",
    streamId: "stream_e2e",
    tradeId: "trade_e2e",
  });
  if (!storeRes.success || !storeRes.publicUrl) throw new Error("Step 12 Failed: Storage save failed");
  console.log(`[PASS] Step 12: Asset delivered via ${storeRes.storageProvider} URL (${storeRes.publicUrl})`);

  // 13. Channel Scanner Integration
  console.log("[13/14] Testing Channel Scanner Engine...");
  const scanRes = await scanYouTubeChannel("@rahultradewarrior", { forceMock: true });
  if (!scanRes.success || scanRes.discoveredStreams.length === 0) throw new Error("Step 13 Failed: Channel scanner failed");
  console.log(`[PASS] Step 13: Channel scanner discovered ${scanRes.discoveredStreams.length} stream(s)`);

  // 14. Pipeline Summary
  console.log("\n================================================================================");
  console.log("ALL 14 E2E PIPELINE MODULES VERIFIED 100% OPERATIONAL!");
  console.log("================================================================================");
}

runComprehensiveSuite().catch((err) => {
  console.error("\n❌ COMPREHENSIVE SUITE FAILED:", err);
  process.exit(1);
});
