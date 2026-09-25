/**
 * Test Suite: Phase 21 - Cloud & Local Storage Integration
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import path from "path";
import fs from "fs";
import { saveTradeAsset } from "../src/lib/youtube-trades/storage-manager";

async function runPhase21Tests() {
  console.log("================================================================================");
  console.log("PHASE 21 TEST SUITE: CLOUD & LOCAL STORAGE INTEGRATION");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "tmp", "trade_clips", "test_phase21");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create simulated MP4 test asset
  const dummyMp4Path = path.join(testDir, "test_clip.mp4");
  fs.writeFileSync(dummyMp4Path, "MOCK_MP4_BINARY_DATA_STREAM");

  // Create simulated SRT test asset
  const dummySrtPath = path.join(testDir, "test_subtitles.srt");
  fs.writeFileSync(dummySrtPath, "1\n00:00:01,000 --> 00:00:04,000\nAsian session liquidity grabbed.\n");

  console.log("[TEST 1] Testing Trade Master Clip Storage Persistence...");
  const mp4Result = await saveTradeAsset({
    localFilePath: dummyMp4Path,
    assetType: "MASTER_VIDEO",
    streamId: "stream_store_01",
    tradeId: "trade_store_01",
  });

  console.log("MP4 Storage Result:", mp4Result);

  if (!mp4Result.success || !mp4Result.publicUrl) {
    throw new Error(`Test 1 Failed: MP4 storage failed: ${mp4Result.error}`);
  }

  console.log(`[PASS] Test 1: MP4 saved to ${mp4Result.storageProvider} (${mp4Result.publicUrl})\n`);

  console.log("[TEST 2] Testing Trade Subtitles (.srt) Storage Persistence...");
  const srtResult = await saveTradeAsset({
    localFilePath: dummySrtPath,
    assetType: "SUBTITLE_SRT",
    streamId: "stream_store_01",
    tradeId: "trade_store_01",
  });

  console.log("SRT Storage Result:", srtResult);

  if (!srtResult.success || !srtResult.publicUrl) {
    throw new Error(`Test 2 Failed: Subtitle storage failed: ${srtResult.error}`);
  }

  console.log(`[PASS] Test 2: Subtitle saved to ${srtResult.storageProvider} (${srtResult.publicUrl})\n`);

  // Verify file existence in destination if LOCAL
  if (mp4Result.storageProvider === "LOCAL") {
    const destPath = path.join(process.cwd(), "public", mp4Result.publicUrl);
    if (!fs.existsSync(destPath)) {
      throw new Error(`Local file not found at ${destPath}`);
    }
    console.log(`[PASS] Verified local file on disk: ${destPath}\n`);
  }

  console.log("================================================================================");
  console.log("ALL PHASE 21 TESTS PASSED SUCCESSFULLY! (Cloud & Local Storage Integration)");
  console.log("================================================================================");
}

runPhase21Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
