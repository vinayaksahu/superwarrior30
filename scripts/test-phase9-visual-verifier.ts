import { verifyVisualChartFrame } from "../src/lib/youtube-trades/visual-verifier";
import fs from "fs";
import path from "path";

async function testPhase9() {
  console.log("=== Testing Phase 9: Visual Chart & ROI Inspection ===");

  // 1. Run visual verification on synthetic bullish chart
  console.log("\n1. Running verifyVisualChartFrame (Synthetic Bullish Chart)...");
  const resultBullish = await verifyVisualChartFrame({
    mockTest: true,
  });

  console.log("Bullish Verification Result:", {
    chartDetected: resultBullish.chartDetected,
    confidence: resultBullish.confidence,
    backgroundTheme: resultBullish.backgroundTheme,
    dominantCandleColor: resultBullish.dominantCandleColor,
    dimensions: resultBullish.dimensions,
    framePath: resultBullish.framePath,
  });

  if (!resultBullish.chartDetected) {
    throw new Error("Expected chartDetected = true!");
  }
  if (resultBullish.backgroundTheme !== "DARK") {
    throw new Error(`Expected DARK background theme, got ${resultBullish.backgroundTheme}`);
  }
  if (resultBullish.confidence < 0.85) {
    throw new Error(`Expected confidence >= 0.85, got ${resultBullish.confidence}`);
  }
  if (!resultBullish.rois?.chartCanvas || !resultBullish.rois?.symbolHeader) {
    throw new Error("Expected ROIs for chartCanvas and symbolHeader!");
  }
  console.log("✓ Bullish chart frame verification passed");

  // 2. Verify Frame file exists on disk
  console.log("\n2. Checking generated verification frame on disk...");
  if (resultBullish.framePath && fs.existsSync(resultBullish.framePath)) {
    const stats = fs.statSync(resultBullish.framePath);
    console.log(`✓ Verification frame exists at "${resultBullish.framePath}" (${stats.size} bytes)`);
  } else {
    throw new Error("Verification frame was not created on disk!");
  }

  // 3. Test Graceful Fallback
  console.log("\n3. Testing Graceful Fallback on non-existent video path...");
  const fallbackResult = await verifyVisualChartFrame({
    videoSource: "non_existent_stream_path.mp4",
    timestamp: 100,
  });
  console.log("Fallback result:", {
    chartDetected: fallbackResult.chartDetected,
    confidence: fallbackResult.confidence,
    backgroundTheme: fallbackResult.backgroundTheme,
  });
  if (fallbackResult.confidence <= 0) {
    throw new Error("Fallback did not return safe default!");
  }
  console.log("✓ Graceful fallback passed");

  console.log("\n==========================================");
  console.log("ALL PHASE 9 VISUAL VERIFICATION TESTS PASSED!");
  console.log("==========================================");
}

testPhase9().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
