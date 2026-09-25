import {
  reconstructTradeCandidates,
  clusterEventsByTime,
  calculateCompletenessScore,
} from "../src/lib/youtube-trades/state-machine";
import { ClassifiedEvent } from "../src/lib/youtube-trades/terminology";

function runStateMachineTests() {
  console.log("=== Testing Trade State Machine ===");

  // 1. Setup a realistic sequence of events:
  // Trade 1 (Real Executed Trade in Gold at 02:00 - 08:00)
  const trade1Events: ClassifiedEvent[] = [
    {
      category: "LIQUIDITY",
      type: "ASIAN_SWEEP",
      confidence: "HIGH",
      score: 0.95,
      timestamp: 120, // 00:02:00
      text: "Dosto Asian low sweep hui hai liquidity grab kar liya market ne",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "COC",
      type: "CHANGE_OF_CHARACTER",
      confidence: "HIGH",
      score: 0.92,
      timestamp: 180, // 00:03:00
      text: "5 minute chart pe COC confirm ho gaya hai change of character",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "CANDLE_CONFIRMATION",
      type: "HAMMER",
      confidence: "HIGH",
      score: 0.9,
      timestamp: 240, // 00:04:00
      text: "Strong bullish hammer candle dekhne ko mili hai rejection ke sath",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "ENTRY_CRITERIA",
      type: "CANDLE_BREAK_CRITERIA",
      confidence: "MEDIUM",
      score: 0.85,
      timestamp: 270, // 00:04:30
      text: "Red candle ka high break hone par hum buy karenge",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: true,
    },
    {
      category: "ACTUAL_ENTRY",
      type: "EXECUTION_STATEMENT",
      confidence: "HIGH",
      score: 0.98,
      timestamp: 330, // 00:05:30
      text: "Maine entry le li hai gold me 2385 pe, order executed",
      instrument: "XAUUSD",
      direction: "BUY",
      price: 2385,
      isExecution: true,
      isHypothetical: false,
    },
    {
      category: "STOP_LOSS",
      type: "SL_LEVEL",
      confidence: "HIGH",
      score: 0.88,
      timestamp: 340, // 00:05:40
      text: "Stop loss hamara candle ke low par rahega 2378",
      instrument: "XAUUSD",
      direction: "BUY",
      price: 2378,
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "RISK_REWARD",
      type: "RR_MILESTONE",
      confidence: "HIGH",
      score: 0.95,
      timestamp: 420, // 00:07:00
      text: "1:2 achieve ho gaya hai, 2R mil gaya",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "BREAKEVEN",
      type: "SL_TO_COST",
      confidence: "HIGH",
      score: 0.94,
      timestamp: 430, // 00:07:10
      text: "SL cost pe le aao ab trade risk free ho gaya",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "TARGET",
      type: "TARGET_ACHIEVED",
      confidence: "HIGH",
      score: 0.92,
      timestamp: 480, // 00:08:00
      text: "Target 1 hit ho gaya hai profit lock kar lo",
      instrument: "XAUUSD",
      direction: "BUY",
      isExecution: false,
      isHypothetical: false,
    },
  ];

  // Trade 2 (Hypothetical unexecuted setup at 00:35:00 - 00:38:00)
  const trade2Events: ClassifiedEvent[] = [
    {
      category: "LIQUIDITY",
      type: "BSL_SWEEP",
      confidence: "HIGH",
      score: 0.9,
      timestamp: 2100, // 00:35:00
      text: "Bank Nifty me buy side liquidity sweep hui hai",
      instrument: "BANKNIFTY",
      direction: "SELL",
      isExecution: false,
      isHypothetical: false,
    },
    {
      category: "ENTRY_CRITERIA",
      type: "CANDLE_BREAK_CRITERIA",
      confidence: "MEDIUM",
      score: 0.85,
      timestamp: 2200, // 00:36:40
      text: "Agar level ke niche 5-min candle close karega tabhi short karenge, wait karenge",
      instrument: "BANKNIFTY",
      direction: "SELL",
      isExecution: false,
      isHypothetical: true,
    },
  ];

  const allEvents = [...trade1Events, ...trade2Events];

  // 1. Test Temporal Clustering
  console.log("\n1. Testing clusterEventsByTime:");
  const clusters = clusterEventsByTime(allEvents);
  console.log(`Clustered ${allEvents.length} events into ${clusters.length} distinct trade clusters.`);
  if (clusters.length !== 2) {
    throw new Error(`Expected 2 clusters, got ${clusters.length}`);
  }
  console.log(`Cluster 1 events count: ${clusters[0].length}`);
  console.log(`Cluster 2 events count: ${clusters[1].length}`);
  console.log("✓ clusterEventsByTime passed");

  // 2. Test Reconstruction (All Trades including hypothetical)
  console.log("\n2. Testing reconstructTradeCandidates (all):");
  const candidatesAll = reconstructTradeCandidates(allEvents, false);
  console.log(`Reconstructed ${candidatesAll.length} candidates:`);
  candidatesAll.forEach((c) => {
    console.log(
      `  Trade #${c.tradeNumber} | ${c.instrument} ${c.direction} | Actual: ${c.isActualTrade} | Result: ${c.result} | Score: ${c.completenessScore} | Clip: ${c.clipStart}s - ${c.clipEnd}s`
    );
  });

  if (candidatesAll.length !== 2) {
    throw new Error(`Expected 2 candidates, got ${candidatesAll.length}`);
  }

  const realTrade = candidatesAll[0];
  if (!realTrade.isActualTrade) {
    throw new Error("Trade 1 should be marked as isActualTrade = true!");
  }
  if (realTrade.instrument !== "XAUUSD" || realTrade.direction !== "BUY") {
    throw new Error("Trade 1 instrument/direction mismatch!");
  }
  if (realTrade.result !== "TP" || realTrade.riskStatus !== "RISK_FREE") {
    throw new Error(`Trade 1 result/risk mismatch! Got ${realTrade.result}, ${realTrade.riskStatus}`);
  }
  if (realTrade.completenessScore < 0.9) {
    throw new Error(`Trade 1 completeness score too low: ${realTrade.completenessScore}`);
  }
  if (realTrade.clipStart !== 110 || realTrade.clipEnd !== 495) {
    throw new Error(`Trade 1 clip padding unexpected: ${realTrade.clipStart} - ${realTrade.clipEnd}`);
  }

  const hypoTrade = candidatesAll[1];
  if (hypoTrade.isActualTrade) {
    throw new Error("Trade 2 should be marked as isActualTrade = false!");
  }
  console.log("✓ Candidate reconstruction verified");

  // 3. Test Filter for ONLY Actual Trades
  console.log("\n3. Testing reconstructTradeCandidates (filterOnlyActual = true):");
  const candidatesOnlyActual = reconstructTradeCandidates(allEvents, true);
  console.log(`Filtered candidates count: ${candidatesOnlyActual.length}`);
  if (candidatesOnlyActual.length !== 1) {
    throw new Error(`Expected exactly 1 actual trade after filtering, got ${candidatesOnlyActual.length}`);
  }
  if (!candidatesOnlyActual[0].isActualTrade) {
    throw new Error("Filtered candidate is not actual!");
  }
  console.log("✓ filterOnlyActual passed");

  console.log("\n==========================================");
  console.log("ALL STATE MACHINE UNIT TESTS PASSED!");
  console.log("==========================================");
}

runStateMachineTests();
