import {
  parseRRRatioValue,
  buildRRTimeline,
  getInstrumentPipMultiplier,
} from "../src/lib/youtube-trades/rr-engine";
import { ReconstructedTradeCandidate } from "../src/lib/youtube-trades/state-machine";

function testPhase11() {
  console.log("=== Testing Phase 11: Risk:Reward (RR) Timeline Engine ===");

  // 1. Ratio Parser Tests
  console.log("\n1. Testing parseRRRatioValue:");
  const ratioTests = [
    { input: "1:3", expected: 3.0 },
    { input: "1:2.5", expected: 2.5 },
    { input: "2R", expected: 2.0 },
    { input: "3R", expected: 3.0 },
    { input: "1:1.5", expected: 1.5 },
  ];

  for (const t of ratioTests) {
    const val = parseRRRatioValue(t.input);
    console.log(`"${t.input}" -> ${val}`);
    if (val !== t.expected) {
      throw new Error(`Ratio parsing failed for "${t.input}"! Expected ${t.expected}, got ${val}`);
    }
  }
  console.log("✓ parseRRRatioValue passed");

  // 2. Pip Multipliers
  console.log("\n2. Testing getInstrumentPipMultiplier:");
  console.log("XAUUSD:", getInstrumentPipMultiplier("XAUUSD"));
  console.log("BANKNIFTY:", getInstrumentPipMultiplier("BANKNIFTY"));
  console.log("EURUSD:", getInstrumentPipMultiplier("EURUSD"));
  if (getInstrumentPipMultiplier("XAUUSD") !== 0.1 || getInstrumentPipMultiplier("BANKNIFTY") !== 1.0) {
    throw new Error("Pip multiplier calculation incorrect!");
  }
  console.log("✓ Pip multipliers passed");

  // 3. RR Geometry Calculation (Gold BUY Trade)
  console.log("\n3. Testing buildRRTimeline (Gold BUY Trade):");
  const goldCandidate: ReconstructedTradeCandidate = {
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
    plannedEntry: { timestamp: 100, text: "Buy setup" },
    actualEntry: { timestamp: 120, price: 2380.0, text: "Entry executed at 2380", confidence: "HIGH" },
    stopLoss: { timestamp: 130, price: 2375.0, text: "SL at 2375" },
    takeProfit: { timestamp: 300, price: 2395.0, text: "TP at 2395" },
    plannedRR: "1:3",
    currentR: "2R",
    realizedR: "3R",
    riskStatus: "RISK_FREE",
    result: "TP",
    confidence: 0.95,
    completenessScore: 1.0,
    clipStart: 90,
    clipEnd: 320,
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
        timestamp: 210,
        text: "2R mil gaya hai 1:2 achieve",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "BREAKEVEN",
        type: "SL_TO_COST",
        confidence: "HIGH",
        score: 0.94,
        timestamp: 220,
        text: "SL cost pe le aao trade risk free",
        isExecution: false,
        isHypothetical: false,
      },
      {
        category: "TARGET",
        type: "TP_HIT",
        confidence: "HIGH",
        score: 0.92,
        timestamp: 300,
        text: "Target 1 hit ho gaya 3R done",
        isExecution: false,
        isHypothetical: false,
      },
    ],
  };

  const goldRR = buildRRTimeline(goldCandidate);
  console.log("Gold RR Geometry:", {
    riskDistance: goldRR.riskDistance,
    plannedRR: goldRR.plannedRRRatio,
    isFavorable: goldRR.isFavorableRR,
    breakevenTimestamp: goldRR.breakevenTimestamp,
    milestones: goldRR.milestones,
  });

  if (goldRR.riskDistance !== 5.0) {
    throw new Error(`Expected riskDistance = 5.0, got ${goldRR.riskDistance}`);
  }
  if (!goldRR.isFavorableRR) {
    throw new Error("Expected isFavorableRR = true for 1:3!");
  }
  if (goldRR.breakevenTimestamp !== 220) {
    throw new Error(`Expected breakevenTimestamp = 220, got ${goldRR.breakevenTimestamp}`);
  }

  // Check projected prices:
  // 1R = 2380 + 5 = 2385
  // 2R = 2380 + 10 = 2390
  // 3R = 2380 + 15 = 2395
  const m1 = goldRR.milestones.find((m) => m.ratio === "1R");
  const m2 = goldRR.milestones.find((m) => m.ratio === "2R");
  const m3 = goldRR.milestones.find((m) => m.ratio === "3R");

  if (m1?.projectedPrice !== 2385.0) {
    throw new Error(`1R price mismatch! Expected 2385, got ${m1?.projectedPrice}`);
  }
  if (m2?.projectedPrice !== 2390.0) {
    throw new Error(`2R price mismatch! Expected 2390, got ${m2?.projectedPrice}`);
  }
  if (m3?.projectedPrice !== 2395.0) {
    throw new Error(`3R price mismatch! Expected 2395, got ${m3?.projectedPrice}`);
  }
  if (!m2?.achieved || m2.achievedTimestamp !== 210) {
    throw new Error("2R milestone should be marked achieved @ 210s!");
  }
  console.log("✓ Gold BUY RR Geometry passed");

  // 4. RR Geometry Calculation (Bank Nifty SELL Trade)
  console.log("\n4. Testing buildRRTimeline (Bank Nifty SELL Trade):");
  const bnCandidate: ReconstructedTradeCandidate = {
    ...goldCandidate,
    instrument: "BANKNIFTY",
    direction: "SELL",
    actualEntry: { timestamp: 120, price: 44500.0, text: "Short BN", confidence: "HIGH" },
    stopLoss: { timestamp: 130, price: 44560.0, text: "SL at 44560" },
    plannedRR: "1:2",
  };

  const bnRR = buildRRTimeline(bnCandidate);
  console.log("Bank Nifty SELL RR Geometry:", {
    riskDistance: bnRR.riskDistance,
    plannedRR: bnRR.plannedRRRatio,
    milestones: bnRR.milestones,
  });

  if (bnRR.riskDistance !== 60.0) {
    throw new Error(`Expected riskDistance = 60.0, got ${bnRR.riskDistance}`);
  }
  // For SELL:
  // 1R = 44500 - 60 = 44440
  // 2R = 44500 - 120 = 44380
  const bnm1 = bnRR.milestones.find((m) => m.ratio === "1R");
  const bnm2 = bnRR.milestones.find((m) => m.ratio === "2R");

  if (bnm1?.projectedPrice !== 44440.0) {
    throw new Error(`BN 1R price mismatch! Expected 44440, got ${bnm1?.projectedPrice}`);
  }
  if (bnm2?.projectedPrice !== 44380.0) {
    throw new Error(`BN 2R price mismatch! Expected 44380, got ${bnm2?.projectedPrice}`);
  }
  console.log("✓ Bank Nifty SELL RR Geometry passed");

  console.log("\n==========================================");
  console.log("ALL PHASE 11 RR TIMELINE TESTS PASSED!");
  console.log("==========================================");
}

testPhase11();
