import { verifyTradeMultiSource } from "../src/lib/youtube-trades/entry-verifier";
import { ReconstructedTradeCandidate } from "../src/lib/youtube-trades/state-machine";
import { VisualVerificationResult } from "../src/lib/youtube-trades/visual-verifier";

function testPhase10() {
  console.log("=== Testing Phase 10: Entry Detection & Multi-source Verification ===");

  // Scenario 1: High Confidence Real Trade in Gold (BUY)
  console.log("\n1. Testing High Confidence Multi-Source Trade (BUY XAUUSD)...");
  const candidateRealBuy: ReconstructedTradeCandidate = {
    tradeNumber: 1,
    instrument: "XAUUSD",
    direction: "BUY",
    isActualTrade: true,
    marketContext: "Asian low sweep | COC structure shift",
    liquidity: {
      type: "ASIAN_SWEEP",
      timestamp: 120,
      text: "Asian low liquidity sweep grab",
      confidence: "HIGH",
    },
    marketStructure: {
      type: "CHANGE_OF_CHARACTER",
      timestamp: 180,
      text: "5m COC confirm",
      confidence: "HIGH",
    },
    priceAction: "Bullish rejection",
    candleConfirmation: {
      type: "HAMMER",
      timestamp: 240,
      text: "Strong bullish hammer candle",
      confidence: "HIGH",
    },
    entryCriteria: "Break of hammer candle high",
    plannedEntry: {
      timestamp: 300,
      text: "Wait for trigger high break",
    },
    actualEntry: {
      timestamp: 360,
      price: 2385.5,
      text: "Maine buy entry le li hai gold me 2385.5 pe",
      confidence: "HIGH",
    },
    stopLoss: {
      timestamp: 380,
      price: 2378,
      text: "SL hammer candle ke low par",
    },
    takeProfit: {
      timestamp: 500,
      text: "Target 1 hit ho gaya hai",
    },
    plannedRR: "1:3",
    currentR: "2R",
    realizedR: "2R",
    riskStatus: "RISK_FREE",
    result: "TP",
    confidence: 0.95,
    completenessScore: 1.0,
    clipStart: 110,
    clipEnd: 520,
    events: [],
  };

  const visualBullish: VisualVerificationResult = {
    chartDetected: true,
    confidence: 0.98,
    backgroundTheme: "DARK",
    dominantCandleColor: "GREEN",
    rois: {
      chartCanvas: { x: 64, y: 57, width: 1126, height: 590 },
      symbolHeader: { x: 25, y: 14, width: 358, height: 43 },
    },
  };

  const reportRealBuy = verifyTradeMultiSource(candidateRealBuy, visualBullish);
  console.log("Report Real Buy:", {
    totalScore: reportRealBuy.totalScore,
    level: reportRealBuy.verificationLevel,
    directionMatch: reportRealBuy.directionMatch,
    factorsCount: reportRealBuy.corroboratingFactors.length,
    breakdown: reportRealBuy.scoreBreakdown,
  });

  if (reportRealBuy.verificationLevel !== "VERIFIED_HIGH") {
    throw new Error(`Expected VERIFIED_HIGH, got ${reportRealBuy.verificationLevel}`);
  }
  if (reportRealBuy.totalScore < 0.85) {
    throw new Error(`Expected score >= 0.85, got ${reportRealBuy.totalScore}`);
  }
  if (reportRealBuy.directionMatch !== true) {
    throw new Error("Expected directionMatch = true for BUY with GREEN candle!");
  }
  if (!reportRealBuy.entryPrice || reportRealBuy.entryPrice !== 2385.5) {
    throw new Error("Expected entryPrice = 2385.5!");
  }
  console.log("✓ High Confidence Multi-Source Verification passed");

  // Scenario 2: Hypothetical Unexecuted Setup
  console.log("\n2. Testing Hypothetical Setup (No actual entry statement)...");
  const candidateHypo: ReconstructedTradeCandidate = {
    tradeNumber: 2,
    instrument: "BANKNIFTY",
    direction: "SELL",
    isActualTrade: false,
    marketContext: "Equal highs grab",
    liquidity: {
      type: "BSL_SWEEP",
      timestamp: 2100,
      text: "Buy side liquidity grab",
      confidence: "HIGH",
    },
    marketStructure: null,
    priceAction: null,
    candleConfirmation: null,
    entryCriteria: "Agar close karega to dekhenge",
    plannedEntry: {
      timestamp: 2150,
      text: "Agar candle close karegi tab dekhenge",
    },
    actualEntry: null,
    stopLoss: null,
    takeProfit: null,
    plannedRR: "1:2",
    currentR: "1R",
    realizedR: "1:2",
    riskStatus: "ACTIVE",
    result: "OPEN",
    confidence: 0.4,
    completenessScore: 0.3,
    clipStart: 2090,
    clipEnd: 2200,
    events: [],
  };

  const reportHypo = verifyTradeMultiSource(candidateHypo, null);
  console.log("Report Hypothetical:", {
    totalScore: reportHypo.totalScore,
    level: reportHypo.verificationLevel,
    riskWarnings: reportHypo.riskWarnings,
  });

  if (reportHypo.verificationLevel !== "UNVERIFIED") {
    throw new Error(`Expected UNVERIFIED for hypothetical setup, got ${reportHypo.verificationLevel}`);
  }
  if (reportHypo.riskWarnings.length === 0) {
    throw new Error("Expected risk warnings for hypothetical setup!");
  }
  console.log("✓ Hypothetical Setup Isolation passed");

  // Scenario 3: Direction Mismatch (BUY trade with Bearish RED candle on screen)
  console.log("\n3. Testing Direction Mismatch (BUY with Bearish Red candle)...");
  const visualBearish: VisualVerificationResult = {
    chartDetected: true,
    confidence: 0.95,
    backgroundTheme: "DARK",
    dominantCandleColor: "RED",
  };

  const reportMismatch = verifyTradeMultiSource(candidateRealBuy, visualBearish);
  console.log("Report Mismatch:", {
    directionMatch: reportMismatch.directionMatch,
    riskWarnings: reportMismatch.riskWarnings,
  });

  if (reportMismatch.directionMatch !== false) {
    throw new Error("Expected directionMatch = false for BUY order with RED candle!");
  }
  console.log("✓ Direction Mismatch Detection passed");

  console.log("\n==========================================");
  console.log("ALL PHASE 10 ENTRY VERIFIER TESTS PASSED!");
  console.log("==========================================");
}

testPhase10();
