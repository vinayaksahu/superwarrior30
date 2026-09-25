/**
 * Test Suite: Phase 16 - Accurate Hindi/Hinglish Subtitles (.srt)
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import {
  formatSrtTimestamp,
  formatEventsToSrt,
  generateSrtFile,
} from "../src/lib/youtube-trades/subtitle-generator";

async function runPhase16Tests() {
  console.log("================================================================================");
  console.log("PHASE 16 TEST SUITE: ACCURATE HINDI/HINGLISH SUBTITLES (.SRT)");
  console.log("================================================================================\n");

  // TEST 1: Timestamp Formatting
  console.log("[TEST 1] Testing SubRip timestamp formatting...");
  const ts1 = formatSrtTimestamp(0);
  const ts2 = formatSrtTimestamp(65.432);
  const ts3 = formatSrtTimestamp(3661.005);

  if (ts1 !== "00:00:00,000") throw new Error(`Test 1 Failed: Expected 00:00:00,000, got ${ts1}`);
  if (ts2 !== "00:01:05,432") throw new Error(`Test 1 Failed: Expected 00:01:05,432, got ${ts2}`);
  if (ts3 !== "01:01:01,005") throw new Error(`Test 1 Failed: Expected 01:01:01,005, got ${ts3}`);

  console.log(`[PASS] Test 1: Timestamps correctly formatted (${ts1}, ${ts2}, ${ts3})\n`);

  // TEST 2: Formatting Events into relative .srt
  console.log("[TEST 2] Testing relative timestamp shifting and cue generation...");

  const clipStart = 1800; // 30:00 in livestream
  const rawEvents = [
    {
      timestamp: 1802,
      endTimestamp: 1805,
      text: "Dekho yahan pe Asian session high ki liquidity grab ho chuki hai.",
      eventType: "LIQUIDITY",
    },
    {
      timestamp: 1806,
      endTimestamp: 1810,
      text: "Ab lower timeframe pe CHoCH aur market structure change ka wait karenge.",
      eventType: "CHoCH",
    },
    {
      timestamp: 1812,
      endTimestamp: 1816,
      text: "Hammer candle form ho rahi hai rejection ke sath.",
      eventType: "CANDLE_CONFIRMATION",
    },
    {
      timestamp: 1818,
      endTimestamp: 1822,
      text: "Red candle ka high break hua, buy order execute kar diya hai.",
      eventType: "ACTUAL_ENTRY",
    },
    {
      timestamp: 1825,
      endTimestamp: 1830,
      text: "1:3 target achieved! 3R profit booked successfully.",
      eventType: "TARGET_HIT",
    },
  ];

  const { srtContent, cueCount } = formatEventsToSrt(rawEvents, clipStart, 1840);

  console.log("Generated SRT Snippet:\n", srtContent.trim());

  if (cueCount !== 5) {
    throw new Error(`Test 2 Failed: Expected 5 cues, got ${cueCount}`);
  }

  // The first cue must start at 1802 - 1800 = 00:00:02,000
  if (!srtContent.includes("00:00:02,000 --> 00:00:05,000")) {
    throw new Error("Test 2 Failed: First cue timestamps are not properly relative-shifted");
  }

  if (!srtContent.includes("Asian session high ki liquidity grab")) {
    throw new Error("Test 2 Failed: Missing subtitle text");
  }

  console.log(`[PASS] Test 2: Created ${cueCount} clean, relative-shifted subtitle cues\n`);

  // TEST 3: Writing .srt file to disk
  console.log("[TEST 3] Testing .srt file creation on disk...");
  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase16");
  const srtResult = await generateSrtFile({
    events: rawEvents,
    clipStart,
    clipEnd: 1840,
    outputDir: testDir,
    filename: "test_gold_trade.srt",
  });

  if (!srtResult.success || !srtResult.filePath) {
    throw new Error(`Test 3 Failed: ${srtResult.error}`);
  }

  if (!fs.existsSync(srtResult.filePath)) {
    throw new Error(`Test 3 Failed: File not found at ${srtResult.filePath}`);
  }

  const fileText = fs.readFileSync(srtResult.filePath, "utf-8");
  if (!fileText.includes("1:3 target achieved!")) {
    throw new Error("Test 3 Failed: File content does not match expected subtitles");
  }

  console.log(`[PASS] Test 3: Subtitle file saved at ${srtResult.filePath} (${fileText.length} chars)\n`);

  console.log("================================================================================");
  console.log("ALL PHASE 16 TESTS PASSED SUCCESSFULLY! (Hindi/Hinglish Subtitles .srt)");
  console.log("================================================================================");
}

runPhase16Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
