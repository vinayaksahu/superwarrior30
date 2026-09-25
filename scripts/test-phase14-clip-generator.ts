/**
 * Test Suite: Phase 14 - Clip Generation (Master Video MP4)
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateMasterClip } from "../src/lib/youtube-trades/clip-generator";

const execFileAsync = promisify(execFile);

async function runPhase14Tests() {
  console.log("================================================================================");
  console.log("PHASE 14 TEST SUITE: CLIP GENERATION (MASTER VIDEO MP4)");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase14");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const inputPath = path.join(testDir, "test_input_raw.mp4");
  const outputPath = path.join(testDir, "test_master_output.mp4");

  console.log("[TEST 1] Testing Master MP4 Clip Generation with Trade HUD Badges...");

  const result = await generateMasterClip({
    inputPath,
    outputPath,
    tradeId: "trade_test_gold_01",
    streamId: "stream_test_gold_01",
    instrument: "XAUUSD",
    direction: "BUY",
    plannedRR: "1:3",
    resultText: "TP HIT (3.5R)",
    tradeNumber: 1,
    watermark: "RAHUL TRADE WARRIOR ACADEMY",
    mockBase: true,
  });

  console.log("Master Clip Result:", result);

  if (!result.success || !result.filePath) {
    throw new Error(`Test 1 Failed: Master clip generation failed: ${result.error}`);
  }

  if (!fs.existsSync(result.filePath)) {
    throw new Error(`Test 1 Failed: Output file does not exist at ${result.filePath}`);
  }

  const stat = fs.statSync(result.filePath);
  if (stat.size < 50000) {
    throw new Error(`Test 1 Failed: Generated MP4 file size is too small (${stat.size} bytes)`);
  }

  console.log(`[PASS] Test 1: Master MP4 successfully composited (${stat.size} bytes, ${result.durationSec}s)\n`);

  console.log("[TEST 2] Verifying Master MP4 Video & Audio Streams via ffprobe...");

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
    throw new Error("Test 2 Failed: No video stream detected in master clip");
  }

  if (!audioStream) {
    throw new Error("Test 2 Failed: No audio stream detected in master clip");
  }

  console.log(`Video Codec: ${videoStream.codec_name} (${videoStream.width}x${videoStream.height})`);
  console.log(`Audio Codec: ${audioStream.codec_name}`);
  console.log("[PASS] Test 2: Validated dual-stream web-ready Master MP4 container\n");

  console.log("================================================================================");
  console.log("ALL PHASE 14 TESTS PASSED SUCCESSFULLY! (Clip Generation - Master Video MP4)");
  console.log("================================================================================");
}

runPhase14Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
