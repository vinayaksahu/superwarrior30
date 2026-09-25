/**
 * Test Suite: Phase 13 - Selective Video Segment Downloader
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import { downloadTradeSegment } from "../src/lib/youtube-trades/segment-downloader";

async function runPhase13Tests() {
  console.log("================================================================================");
  console.log("PHASE 13 TEST SUITE: SELECTIVE VIDEO SEGMENT DOWNLOADER");
  console.log("================================================================================\n");

  const testOutputDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase13");

  // TEST 1: Synthetic Mock Generation (FFmpeg)
  console.log("[TEST 1] Testing selective segment synthetic generation...");
  const mockResult = await downloadTradeSegment({
    streamUrl: "https://www.youtube.com/watch?v=mock_stream_123",
    streamId: "stream_test_01",
    candidateId: "trade_test_01",
    clipStart: 1800,
    clipEnd: 1815, // 15s window
    outputDir: testOutputDir,
    forceMock: true,
  });

  console.log("Mock Result:", mockResult);

  if (!mockResult.success || !mockResult.filePath) {
    throw new Error(`Test 1 Failed: Synthetic segment generation failed: ${mockResult.error}`);
  }

  if (!fs.existsSync(mockResult.filePath)) {
    throw new Error(`Test 1 Failed: Generated file does not exist at ${mockResult.filePath}`);
  }

  const stat = fs.statSync(mockResult.filePath);
  if (stat.size < 1000) {
    throw new Error(`Test 1 Failed: Generated MP4 file is unexpectedly tiny (${stat.size} bytes)`);
  }

  console.log(`[PASS] Test 1: Generated valid MP4 segment (${stat.size} bytes, duration ~${mockResult.durationSec}s)\n`);

  // TEST 2: yt-dlp section download handler with fallback resilience
  console.log("[TEST 2] Testing yt-dlp selective section downloader execution...");
  const ytdlpResult = await downloadTradeSegment({
    streamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    streamId: "stream_test_02",
    candidateId: "trade_test_02",
    clipStart: 10,
    clipEnd: 20, // 10s window
    outputDir: testOutputDir,
    forceMock: false,
  });

  console.log("yt-dlp Execution Result:", ytdlpResult);

  if (!ytdlpResult.success || !ytdlpResult.filePath) {
    throw new Error(`Test 2 Failed: Section download and fallback failed: ${ytdlpResult.error}`);
  }

  if (!fs.existsSync(ytdlpResult.filePath)) {
    throw new Error(`Test 2 Failed: Output file does not exist at ${ytdlpResult.filePath}`);
  }

  console.log(`[PASS] Test 2: Downloader gracefully completed via ${ytdlpResult.method}\n`);

  console.log("================================================================================");
  console.log("ALL PHASE 13 TESTS PASSED SUCCESSFULLY! (Selective Video Segment Download)");
  console.log("================================================================================");
}

runPhase13Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
