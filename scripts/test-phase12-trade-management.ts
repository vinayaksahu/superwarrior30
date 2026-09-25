import { analyzeTradeManagement } from "../src/lib/youtube-trades/trade-management";
import { ReconstructedTradeCandidate } from "../src/lib/youtube-trades/state-machine";

function testPhase12() {
  console.log("=== Testing Phase 12: Trade Management (SL to BE, Partials, Trailing) ===");

  const fullManagedCandidate: ReconstructedTradeCandidate = {
    tradeNumber: 1,
    instrument: "XAUUSD",
    direction: "BUY",
    isActualTrade: true,
    marketContext: "Asian low sweep",
    liquidity: null,
    marketStructure: null,
    priceAction: null,
    candleConfirmation: null,
    entryCriteria: null,
    plannedEntry: null,
    actualEntry: {
      timestamp: 120,
      price: 2380.0,
      text: "Maine buy entry le li hai 2380 pe",
      confidence: "HIGH",
    },
    stopLoss: { timestamp: 130, price: 2375.0, text: "SL 2375" },
    takeProfit: { timestamp: 350, price: 2395.0, text: "Target achieved" },
    plannedRR: "1:3",
    currentR: "3R",
    realizedR: "3R",
    riskStatus: "RISK_FREE",
    result: "TP",
    confidence: 0.98,
    completenessScore: 1.0,
    clipStart: 100,
    clipEnd: 360,
    events: [
      {
        category: "ACTUAL_ENTRY",
        type: "EXECUTION",
        confidence: "HIGH",
        score: 0.98,
        timestamp: 120,
        text: "Maine buy entry le li hai 2380 pe",
        isExecution: true,
        isHypothetical: false,
      },
      {
        category: "RISK_REWARD",
        type: "RR_MILESTONE",
        confidence: "HIGH",
        score: 0.95,
        timestamp: 200,
        text: "2R mil gaya hai 1:2 achieve",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "BREAKEVEN",
        type: "SL_TO_COST",
        confidence: "HIGH",
        score: 0.94,
        timestamp: 210,
        text: "SL cost pe le aao ab trade risk free ho gaya",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "TRADE_MANAGEMENT",
        type: "PARTIAL_BOOKING",
        confidence: "HIGH",
        score: 0.9,
        timestamp: 260,
        text: "Safe traders 50% book kar lo half quantity nikal lo",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "TRADE_MANAGEMENT",
        type: "TRAILING_SL",
        confidence: "HIGH",
        score: 0.88,
        timestamp: 300,
        text: "SL ko trail karenge previous candle ke low ke niche",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "TARGET",
        type: "TARGET_ACHIEVED",
        confidence: "HIGH",
        score: 0.92,
        timestamp: 350,
        text: "Target 1 hit ho gaya hai profit lock kar lo",
        isExecution: false,
        isHypothetical: false,
      },
    ],
  };

  console.log("\n1. Analyzing Trade Management on Candidate...");
  const report = analyzeTradeManagement(fullManagedCandidate);

  console.log("Trade Management Report:", {
    isRiskFree: report.isRiskFree,
    breakevenAt: report.breakevenAchievedAt,
    partialAt: report.partialBookingAchievedAt,
    trailingApplied: report.trailingSLApplied,
    trailingCount: report.trailingStepsCount,
    capitalReduction: `${report.capitalRiskReductionPercent}%`,
    score: report.managementScore,
    stepsCount: report.steps.length,
    summary: report.summaryText,
  });

  console.log("\n2. Reconstructed Defense Steps:");
  report.steps.forEach((st, idx) => {
    console.log(
      `  [Step ${idx + 1}] @ ${st.timestamp}s: ${st.actionType} | Risk: ${st.capitalRiskPercent}% | Locked: ${st.profitLockedR || "None"} | "${st.title}"`
    );
  });

  // Verifications
  if (!report.isRiskFree) {
    throw new Error("Expected isRiskFree = true!");
  }
  if (report.breakevenAchievedAt !== 210) {
    throw new Error(`Expected breakevenAchievedAt = 210, got ${report.breakevenAchievedAt}`);
  }
  if (report.partialBookingAchievedAt !== 260) {
    throw new Error(`Expected partialBookingAchievedAt = 260, got ${report.partialBookingAchievedAt}`);
  }
  if (!report.trailingSLApplied || report.trailingStepsCount !== 1) {
    throw new Error("Trailing SL was not correctly recorded!");
  }
  if (report.capitalRiskReductionPercent !== 100) {
    throw new Error(`Expected 100% capital risk reduction, got ${report.capitalRiskReductionPercent}%`);
  }
  if (report.managementScore < 0.9) {
    throw new Error(`Expected management score >= 0.9, got ${report.managementScore}`);
  }

  console.log("\n==========================================");
  console.log("ALL PHASE 12 TRADE MANAGEMENT TESTS PASSED!");
  console.log("==========================================");
}

testPhase12();
