import {
  extractInstrument,
  extractDirection,
  extractPriceMentions,
  detectExecutionStatus,
  matchTradingKeywords,
  classifySegment,
  extractTradeEventsFromSegments,
} from "../src/lib/youtube-trades/terminology";
import { TranscriptSegment } from "../src/lib/youtube-trades/transcript-extractor";

function runTerminologyTests() {
  console.log("=== Testing Trade Terminology & Event Extraction ===");

  // 1. Instrument Extraction
  console.log("\n1. Testing extractInstrument:");
  const testTexts = [
    { text: "Gold me bahut acha setup ban raha hai", expected: "XAUUSD" },
    { text: "Bank Nifty 44200 level test kar raha hai", expected: "BANKNIFTY" },
    { text: "Nifty 50 me Asian low sweep hua", expected: "NIFTY" },
    { text: "EURUSD breaking market structure", expected: "EURUSD" },
    { text: "Bitcoin upside move continue karega", expected: "BTCUSD" },
  ];

  for (const t of testTexts) {
    const inst = extractInstrument(t.text);
    console.log(`"${t.text}" -> ${inst}`);
    if (inst !== t.expected) {
      throw new Error(`Failed to extract instrument! Expected ${t.expected}, got ${inst}`);
    }
  }
  console.log("✓ extractInstrument passed");

  // 2. Direction Extraction
  console.log("\n2. Testing extractDirection:");
  const dirTexts = [
    { text: "Yahan par hum buy position dekh rahe hain, upside target rahega", expected: "BUY" },
    { text: "Sellers active hain, short karenge put buy kar lo", expected: "SELL" },
  ];
  for (const t of dirTexts) {
    const dir = extractDirection(t.text);
    console.log(`"${t.text}" -> ${dir}`);
    if (dir !== t.expected) {
      throw new Error(`Direction mismatch! Expected ${t.expected}, got ${dir}`);
    }
  }
  console.log("✓ extractDirection passed");

  // 3. Execution vs Hypothetical Detection
  console.log("\n3. Testing detectExecutionStatus:");
  const execCase = detectExecutionStatus("Maine buy entry le li hai, order place kar diya 2380 pe");
  console.log("Real Execution:", execCase);
  if (!execCase.isExecution) {
    throw new Error("Failed to classify real execution statement!");
  }

  const hypoCase = detectExecutionStatus("Agar red candle ka high break hoga tab buy karenge, wait karenge");
  console.log("Hypothetical Setup:", hypoCase);
  if (!hypoCase.isHypothetical) {
    throw new Error("Failed to classify hypothetical setup statement!");
  }
  console.log("✓ detectExecutionStatus passed");

  // 4. Terminology Classification across Rahul's concepts
  console.log("\n4. Testing Rahul's exact Spoken Patterns:");
  const testSegments: TranscriptSegment[] = [
    {
      start: 120,
      end: 125,
      duration: 5,
      text: "Dosto Asian low sweep hui hai liquidity grab kar liya market ne",
    },
    {
      start: 180,
      end: 185,
      duration: 5,
      text: "5 minute chart pe COC confirm ho gaya hai change of character",
    },
    {
      start: 240,
      end: 245,
      duration: 5,
      text: "Strong bullish hammer candle dekhne ko mili hai rejection ke sath",
    },
    {
      start: 300,
      end: 305,
      duration: 5,
      text: "Agar is red candle ka high break hoga tab entry trigger hogi",
    },
    {
      start: 360,
      end: 365,
      duration: 5,
      text: "Maine entry le li hai gold me 2385 pe, stop loss candle ke low par",
    },
    {
      start: 450,
      end: 455,
      duration: 5,
      text: "Target 1 hit ho gaya hai 1:2 achieve ho gaya, SL to cost le aao trade risk free kar lo",
    },
  ];

  const classifiedEvents = extractTradeEventsFromSegments(testSegments);
  console.log(`\nClassified ${classifiedEvents.length} events from transcript:`);
  classifiedEvents.forEach((ev, idx) => {
    console.log(
      `[${idx + 1}] Time: ${ev.timestamp}s | Cat: ${ev.category} (${ev.type}) | Conf: ${ev.confidence} | Exec: ${ev.isExecution} | Text: "${ev.text}"`
    );
  });

  if (classifiedEvents.length < 5) {
    throw new Error(`Expected at least 5 classified events, got ${classifiedEvents.length}`);
  }

  // Check event 1: Liquidity / Asian sweep
  if (classifiedEvents[0].category !== "LIQUIDITY") {
    throw new Error(`Event 1 expected LIQUIDITY, got ${classifiedEvents[0].category}`);
  }

  // Check event 2: COC
  if (classifiedEvents[1].category !== "COC") {
    throw new Error(`Event 2 expected COC, got ${classifiedEvents[1].category}`);
  }

  // Check event 3: Candle confirmation
  if (classifiedEvents[2].category !== "CANDLE_CONFIRMATION") {
    throw new Error(`Event 3 expected CANDLE_CONFIRMATION, got ${classifiedEvents[2].category}`);
  }

  // Check event 4: Entry criteria / hypothetical
  if (classifiedEvents[3].category !== "ENTRY_CRITERIA" && !classifiedEvents[3].isHypothetical) {
    throw new Error(`Event 4 expected ENTRY_CRITERIA or hypothetical setup!`);
  }

  // Check event 5: Actual entry execution
  if (!classifiedEvents[4].isExecution) {
    throw new Error(`Event 5 expected isExecution = true!`);
  }

  console.log("\n==========================================");
  console.log("ALL TRADE TERMINOLOGY UNIT TESTS PASSED!");
  console.log("==========================================");
}

runTerminologyTests();
