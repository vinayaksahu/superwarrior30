import { runDryRunTradeAnalysis } from "../src/lib/youtube-trades/dry-run";
import { TranscriptSegment } from "../src/lib/youtube-trades/transcript-extractor";

async function testDryRun() {
  console.log("=== Testing Phase 8: Dry-Run Trade Analysis Workflow ===");

  // 1. Simulated Livestream with two setups:
  // - Trade 1: Gold Buy (Executed real trade)
  // - Trade 2: Bank Nifty Sell (Hypothetical setup only, never executed)
  const sampleSegments: TranscriptSegment[] = [
    // Setup 1 (Trade 1: 00:03:00 - 00:09:00)
    {
      start: 180,
      end: 186,
      duration: 6,
      text: "Gold ke andar Asian low liquidity sweep dekhne ko mili hai institutional trap bana",
    },
    {
      start: 240,
      end: 246,
      duration: 6,
      text: "5 minute chart pe COC confirm ho gaya structure shift ho raha hai",
    },
    {
      start: 300,
      end: 305,
      duration: 5,
      text: "Bullish hammer candle form ho chuki hai strong wick rejection ke sath",
    },
    {
      start: 360,
      end: 366,
      duration: 6,
      text: "Red candle ka high break hone par buy karenge",
    },
    {
      start: 420,
      end: 426,
      duration: 6,
      text: "Maine buy entry le li hai 2382 pe, order execute ho gaya position open hai",
    },
    {
      start: 450,
      end: 455,
      duration: 5,
      text: "Stop loss hamara is hammer ke low par 2376 rahega",
    },
    {
      start: 540,
      end: 546,
      duration: 6,
      text: "1:2 achieve ho gaya 2R mil gaya hai, SL to cost le aao trade risk free kar lo",
    },
    {
      start: 600,
      end: 605,
      duration: 5,
      text: "Target 1 hit ho gaya hai first target complete profit lock kar lo",
    },

    // Setup 2 (Trade 2: 00:40:00 - 00:43:00) - 2000s gap
    {
      start: 2400,
      end: 2406,
      duration: 6,
      text: "Bank Nifty 44500 pe buy side liquidity sweep kar raha hai equal highs grab hue",
    },
    {
      start: 2460,
      end: 2466,
      duration: 6,
      text: "Agar level ke niche red candle close karega tabhi short karenge, wait karenge",
    },
    {
      start: 2520,
      end: 2526,
      duration: 6,
      text: "Setup trigger nahi hua dosto, market sideways nikal gaya no entry",
    },
  ];

  console.log("\n1. Running Dry-Run Analysis on livestream transcript segments...");
  const report = await runDryRunTradeAnalysis({
    segments: sampleSegments,
    mockMetadata: {
      title: "🔴 LIVE: London Open Gold & Bank Nifty Liquidity Sweeps",
      channel: "Rahul Trade Warrior Academy",
      duration: 3600,
    },
  });

  console.log("\n2. Dry-Run Diagnostic Report Summary:");
  console.log(`  Stream: "${report.streamMetadata.title}" (${report.streamMetadata.duration}s)`);
  console.log(`  Transcript Segments: ${report.transcriptStats.segmentsCount}`);
  console.log(`  Total Events Classified: ${report.eventStats.totalEvents}`);
  console.log("  Events by Category:", report.eventStats.byCategory);
  console.log(`  Reconstructed Candidates: ${report.allCandidates.length}`);
  console.log(`  Actual Executed Trades: ${report.actualTrades.length}`);
  console.log(`  Hypothetical Setups: ${report.hypotheticalSetups.length}`);
  console.log(`  Average Completeness Score: ${(report.averageCompleteness * 100).toFixed(0)}%`);

  console.log("\n3. Recommended Video Clips:");
  report.recommendedClips.forEach((clip) => {
    console.log(
      `  • Trade #${clip.tradeNumber} [${clip.instrument} ${clip.direction}]: ${clip.clipWindowFormatted} (${clip.durationSec}s) | Actual: ${clip.isActual}`
    );
  });

  console.log("\n4. Diagnostic Log Output:");
  report.diagnostics.forEach((diag) => {
    console.log(`    > ${diag}`);
  });

  // Verifications
  if (report.allCandidates.length !== 2) {
    throw new Error(`Expected 2 candidates, got ${report.allCandidates.length}`);
  }
  if (report.actualTrades.length !== 1) {
    throw new Error(`Expected 1 actual trade, got ${report.actualTrades.length}`);
  }
  if (report.hypotheticalSetups.length !== 1) {
    throw new Error(`Expected 1 hypothetical setup, got ${report.hypotheticalSetups.length}`);
  }
  if (report.actualTrades[0].instrument !== "XAUUSD" || report.actualTrades[0].direction !== "BUY") {
    throw new Error("Actual trade instrument/direction mismatch!");
  }
  if (report.actualTrades[0].result !== "TP" || report.actualTrades[0].riskStatus !== "RISK_FREE") {
    throw new Error("Actual trade result/risk mismatch!");
  }
  if (report.recommendedClips.length !== 2) {
    throw new Error(`Expected 2 clip recommendations, got ${report.recommendedClips.length}`);
  }

  console.log("\n==========================================");
  console.log("ALL PHASE 8 DRY-RUN TESTS PASSED!");
  console.log("==========================================");
}

testDryRun().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
