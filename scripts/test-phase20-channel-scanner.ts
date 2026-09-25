/**
 * Test Suite: Phase 20 - YouTube Channel Livestream Scanner
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 */

import { scanYouTubeChannel } from "../src/lib/youtube-trades/channel-scanner";

async function runPhase20Tests() {
  console.log("================================================================================");
  console.log("PHASE 20 TEST SUITE: YOUTUBE CHANNEL LIVESTREAM SCANNER");
  console.log("================================================================================\n");

  // TEST 1: Mock Channel Scan
  console.log("[TEST 1] Testing mock channel scan...");
  const mockResult = await scanYouTubeChannel("@rahultradewarrior", { forceMock: true });

  console.log("Mock Result:", {
    success: mockResult.success,
    method: mockResult.method,
    count: mockResult.discoveredStreams.length,
    firstStream: mockResult.discoveredStreams[0],
  });

  if (!mockResult.success || mockResult.discoveredStreams.length === 0) {
    throw new Error("Test 1 Failed: Mock scan failed to return streams");
  }

  const first = mockResult.discoveredStreams[0];
  if (!first.youtubeVideoId || !first.title || !first.url) {
    throw new Error("Test 1 Failed: Discovered stream is missing required metadata");
  }

  console.log(`[PASS] Test 1: Discovered ${mockResult.discoveredStreams.length} stream(s) via ${mockResult.method}\n`);

  // TEST 2: Live Channel Scan with fallback resilience
  console.log("[TEST 2] Testing live channel scanner with fallback handling...");
  const liveResult = await scanYouTubeChannel("UC_x5XG1OV2P6uZZ5FSM9Ttw", { limit: 5 });

  console.log("Live Scan Result:", {
    success: liveResult.success,
    method: liveResult.method,
    channel: liveResult.channelIdentifier,
    count: liveResult.discoveredStreams.length,
  });

  if (!liveResult.success || liveResult.discoveredStreams.length === 0) {
    throw new Error("Test 2 Failed: Live scan failed to return results");
  }

  console.log(`[PASS] Test 2: Scanner completed successfully via ${liveResult.method}\n`);

  console.log("================================================================================");
  console.log("ALL PHASE 20 TESTS PASSED SUCCESSFULLY! (Channel Scanning for Livestreams)");
  console.log("================================================================================");
}

runPhase20Tests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
