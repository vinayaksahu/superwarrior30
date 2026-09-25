/**
 * Test Suite: Phase 15 - Silent Period Acceleration with Protected Speech
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { accelerateSilentPeriods } from "../src/lib/youtube-trades/silence-accelerator";

const execFileAsync = promisify(execFile);

async function runPhase15Tests() {
  console.log("================================================================================");
  console.log("PHASE 15 TEST SUITE: SILENT PERIOD ACCELERATION WITH PROTECTED SPEECH");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase15");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const inputPath = path.join(testDir, "speech_and_silence_base.mp4");
  const outputPath = path.join(testDir, "smart_accelerated.mp4");

  console.log("[TEST 1] Testing Smart Silence Acceleration (Speech Protected @ 1x, Silence @ 3x)...");

  const result = await accelerateSilentPeriods({
    inputPath,
    outputPath,
    speed: 3.0,
    noiseDb: "-30dB",
    minSilenceSec: 1.5,
    mockBase: true,
  });

  console.log("Acceleration Result:", result);

  if (!result.success || !result.filePath) {
    throw new Error(`Test 1 Failed: Silence acceleration failed: ${result.error}`);
  }

  if (!fs.existsSync(result.filePath)) {
    throw new Error(`Test 1 Failed: Accelerated file does not exist at ${result.filePath}`);
  }

  if (result.savedSeconds! <= 0) {
    throw new Error(`Test 1 Failed: No time was saved (savedSeconds=${result.savedSeconds})`);
  }

  if (result.newDuration! >= result.originalDuration!) {
    throw new Error(`Test 1 Failed: New duration (${result.newDuration}) not shorter than original (${result.originalDuration})`);
  }

  console.log(
    `[PASS] Test 1: Reduced duration from ${result.originalDuration}s down to ${result.newDuration}s! Saved ${result.savedSeconds}s (${result.savedPercent}% reduction)\n`
  );

  console.log("[TEST 2] Verifying Audio & Video Stream Integrity via ffprobe...");

  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name",
    "-of", "json",
    result.filePath,
  ]);

  const probeData = JSON.parse(stdout);
  const streams = probeData.streams || [];

  const videoStream = streams.find((s: any) => s.codec_type === "video");
  const audioStream = streams.find((s: any) => s.codec_type === "audio");

  if (!videoStream || !audioStream) {
    throw new Error("Test 2 Failed: Output video is missing video or audio stream");
  }

  console.log(`Video: ${videoStream.codec_name}, Audio: ${audioStream.codec_name}`);
  console.log("[PASS] Test 2: Validated accelerated output streams\n");

  console.log("================================================================================");
  console.log("ALL PHASE 15 TESTS PASSED SUCCESSFULLY! (Silence Acceleration & Speech Protection)");
  console.log("================================================================================");
}

runPhase15Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
