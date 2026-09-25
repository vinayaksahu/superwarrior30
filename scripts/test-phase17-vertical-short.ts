/**
 * Test Suite: Phase 17 - 9:16 Vertical Short Generation (Smart Crop & Stack)
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateVerticalShort } from "../src/lib/youtube-trades/vertical-short-generator";

const execFileAsync = promisify(execFile);

async function runPhase17Tests() {
  console.log("================================================================================");
  console.log("PHASE 17 TEST SUITE: 9:16 VERTICAL SHORT GENERATION");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase17");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const inputPath = path.join(testDir, "test_input_16_9.mp4");
  const outputPath = path.join(testDir, "test_vertical_short_1080x1920.mp4");

  console.log("[TEST 1] Testing 9:16 Vertical Short Composition with Blurred Backdrop...");

  const result = await generateVerticalShort({
    inputPath,
    outputPath,
    tradeId: "trade_short_test_01",
    streamId: "stream_short_test_01",
    instrument: "XAUUSD",
    direction: "BUY",
    plannedRR: "1:3",
    resultText: "TP HIT (3.5R)",
    tradeNumber: 1,
    academyName: "RAHUL TRADE WARRIOR",
    mockBase: true,
  });

  console.log("Vertical Short Result:", result);

  if (!result.success || !result.filePath) {
    throw new Error(`Test 1 Failed: Vertical short generation failed: ${result.error}`);
  }

  if (!fs.existsSync(result.filePath)) {
    throw new Error(`Test 1 Failed: Output file does not exist at ${result.filePath}`);
  }

  const stat = fs.statSync(result.filePath);
  if (stat.size < 100000) {
    throw new Error(`Test 1 Failed: Output file is unexpectedly small (${stat.size} bytes)`);
  }

  console.log(`[PASS] Test 1: Generated 9:16 vertical short MP4 (${stat.size} bytes, ${result.durationSec}s)\n`);

  console.log("[TEST 2] Verifying 1080x1920 (9:16) Dimensions via ffprobe...");

  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,width,height",
    "-of", "json",
    result.filePath,
  ]);

  const probeData = JSON.parse(stdout);
  const streams = probeData.streams || [];

  const videoStream = streams.find((s: any) => s.codec_type === "video");
  const audioStream = streams.find((s: any) => s.codec_type === "audio");

  if (!videoStream) {
    throw new Error("Test 2 Failed: No video stream detected");
  }

  if (videoStream.width !== 1080 || videoStream.height !== 1920) {
    throw new Error(`Test 2 Failed: Expected 1080x1920, got ${videoStream.width}x${videoStream.height}`);
  }

  if (!audioStream) {
    throw new Error("Test 2 Failed: No audio stream detected");
  }

  console.log(`Video Stream: ${videoStream.codec_name} ${videoStream.width}x${videoStream.height} (Strict 9:16 Vertical)`);
  console.log(`Audio Stream: ${audioStream.codec_name}`);
  console.log("[PASS] Test 2: Verified 1080x1920 vertical format for Shorts/Reels\n");

  console.log("================================================================================");
  console.log("ALL PHASE 17 TESTS PASSED SUCCESSFULLY! (9:16 Vertical Short Generation)");
  console.log("================================================================================");
}

runPhase17Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
