/**
 * Trade Terminology & Event Extraction Engine
 * Specialised for Rahul Trade Warrior Academy's spoken trading vocabulary:
 * Hindi, English, and Hinglish transliteration.
 */

import { TranscriptSegment } from "./transcript-extractor";

export type EventCategory =
  | "MARKET_CONTEXT"
  | "LIQUIDITY"
  | "COC"
  | "CHoCH"
  | "BOS"
  | "MSS"
  | "PRICE_ACTION"
  | "CANDLE_CONFIRMATION"
  | "ENTRY_CRITERIA"
  | "ACTUAL_ENTRY"
  | "STOP_LOSS"
  | "TARGET"
  | "RISK_REWARD"
  | "BREAKEVEN"
  | "TRADE_MANAGEMENT";

export interface KeywordPattern {
  category: EventCategory;
  type: string;
  weight: number; // 0.1 to 1.0 confidence weight
  patterns: (string | RegExp)[];
}

/**
 * Rahul Trade Warrior's exact Hindi/Hinglish/English terminology dictionaries.
 */
export const TRADING_TERMINOLOGY: KeywordPattern[] = [
  // 1. LIQUIDITY (Sweeps, Grabs, Traps, Levels)
  {
    category: "LIQUIDITY",
    type: "ASIAN_SWEEP",
    weight: 0.95,
    patterns: [
      /\basian\s+(?:session\s+)?(?:high|low)\b/i,
      /\basian\s+(?:high|low)\s+(?:sweep|grab|liquidity)\b/i,
      /\basian\s+(?:low|high)\s+se\s+reversal\b/i,
      /\basian\s+ka\s+(?:low|high)\s+sweep\b/i,
    ],
  },
  {
    category: "LIQUIDITY",
    type: "BSL_SWEEP",
    weight: 0.9,
    patterns: [
      /\bbsl\b/i,
      /\bbuy[\s-]?side\s+liquidity\b/i,
      /\bbuyers\s+ki\s+liquidity\b/i,
      /\bequal\s+highs?\b/i,
      /\beqh\b/i,
      /buy[\s-]?side\s+(?:grab|sweep|hunt|taken)/i,
    ],
  },
  {
    category: "LIQUIDITY",
    type: "SSL_SWEEP",
    weight: 0.9,
    patterns: [
      /\bssl\b/i,
      /\bsell[\s-]?side\s+liquidity\b/i,
      /\bsellers\s+ki\s+liquidity\b/i,
      /\bequal\s+lows?\b/i,
      /\beql\b/i,
      /sell[\s-]?side\s+(?:grab|sweep|hunt|taken)/i,
    ],
  },
  {
    category: "LIQUIDITY",
    type: "LIQUIDITY_SWEEP",
    weight: 0.88,
    patterns: [
      /liquidity\s+(?:sweep|grab|hunting|taken|purge|sweeped|grabbed)/i,
      /liquidity\s+(?:nikal\s+li|le\s+li|sweep\s+hui|grab\s+hui|li\s+gayi)/i,
      /(?:retailers|retail)\s+(?:trap|trapped|ko\s+trap)/i,
      /trap\s+(?:trading|ban\s+gaya|hua\s+hai)/i,
      /(?:previous\s+day\s+|pdh|pdl|day\s+)(?:high|low)\s+(?:sweep|grab)/i,
      /liquidity\s+hunt/i,
    ],
  },

  // 2. MARKET STRUCTURE (COC / CHoCH, BOS, MSS)
  {
    category: "COC",
    type: "CHANGE_OF_CHARACTER",
    weight: 0.92,
    patterns: [
      /\bcoc\b/i,
      /\bchoch\b/i,
      /change\s+of\s+character/i,
      /character\s+change/i,
      /structure\s+(?:shift|change|badal|badla)/i,
      /trend\s+(?:shift|reversal|change)/i,
    ],
  },
  {
    category: "BOS",
    type: "BREAK_OF_STRUCTURE",
    weight: 0.9,
    patterns: [
      /\bbos\b/i,
      /break\s+of\s+structure/i,
      /structure\s+break/i,
      /previous\s+(?:high|low)\s+(?:break|tod\s+diya|tod\s+ke|nikla)/i,
      /structure\s+(?:tod\s+diya|break\s+hua)/i,
    ],
  },
  {
    category: "MSS",
    type: "MARKET_STRUCTURE_SHIFT",
    weight: 0.88,
    patterns: [
      /\bmss\b/i,
      /market\s+structure\s+shift/i,
      /internal\s+structure\s+(?:shift|break)/i,
    ],
  },

  // 3. PRICE ACTION & ZONES
  {
    category: "PRICE_ACTION",
    type: "PROTECTION",
    weight: 0.85,
    patterns: [
      /buyers?\s+(?:protect|defend|active|holding)/i,
      /sellers?\s+(?:protect|defend|active|holding)/i,
      /buyers?\s+(?:protect\s+kar\s+rahe|defend\s+kar\s+rahe)/i,
      /sellers?\s+(?:protect\s+kar\s+rahe|defend\s+kar\s+rahe)/i,
      /level\s+protect/i,
    ],
  },
  {
    category: "PRICE_ACTION",
    type: "REJECTION_ZONE",
    weight: 0.82,
    patterns: [
      /wick\s+rejection/i,
      /strong\s+rejection/i,
      /rejection\s+candle/i,
      /lambee\s+wick|badi\s+wick|niche\s+se\s+rejection|upar\s+se\s+rejection/i,
      /order\s*block|\bob\b/i,
      /fair\s+value\s+gap|\bfvg\b|imbalance/i,
    ],
  },

  // 4. CANDLE CONFIRMATION
  {
    category: "CANDLE_CONFIRMATION",
    type: "HAMMER",
    weight: 0.9,
    patterns: [
      /\bhammer\b/i,
      /pin\s*bar/i,
      /bullish\s+pin\s*bar/i,
      /hammer\s+candle/i,
      /hammer\s+(?:bani\s+hai|form\s+hui)/i,
    ],
  },
  {
    category: "CANDLE_CONFIRMATION",
    type: "SHOOTING_STAR",
    weight: 0.9,
    patterns: [
      /shooting\s+star/i,
      /inverted\s+hammer/i,
      /bearish\s+pin\s*bar/i,
      /shooting\s+star\s+(?:bana|form\s+hua)/i,
    ],
  },
  {
    category: "CANDLE_CONFIRMATION",
    type: "ENGULFING",
    weight: 0.88,
    patterns: [
      /bullish\s+engulfing/i,
      /bearish\s+engulfing/i,
      /engulfing\s+candle/i,
      /candle\s+(?:close\s+ka\s+wait|close\s+hone\s+do|closing\s+mil\s+gayi)/i,
      /5\s*(?:min|minute)\s+candle\s+close/i,
    ],
  },

  // 5. ENTRY CRITERIA (Setup Condition / Hypothetical Planning)
  {
    category: "ENTRY_CRITERIA",
    type: "CANDLE_BREAK_CRITERIA",
    weight: 0.85,
    patterns: [
      /red\s+candle\s+(?:ka\s+)?high\s+(?:break|tode|nikle)/i,
      /green\s+candle\s+(?:ka\s+)?low\s+(?:break|tode|nikle)/i,
      /is\s+candle\s+ka\s+(?:high|low)\s+break\s+hone\s+par/i,
      /agar\s+(?:high|low)\s+break\s+(?:karega|hota\s+hai|hoga)/i,
      /(?:agar|if)\s+(?:buy|sell)\s+(?:milega|banta\s+hai|trigger\s+hoga)/i,
      /retest\s+(?:ka\s+wait|par\s+entry|hone\s+par)/i,
      /level\s+ke\s+(?:upar|niche)\s+(?:(?:\w+)\s+)?close/i,
      /(?:red|green)?\s*candle\s+close\s+(?:karega|karegi|hoga|hogi|hone\s+par)/i,
      /fibonacci\s+(?:0\.5|0\.618|golden\s+zone|retrace)/i,
    ],
  },

  // 6. ACTUAL ENTRY (Real Execution Statements)
  {
    category: "ACTUAL_ENTRY",
    type: "EXECUTION_STATEMENT",
    weight: 0.98,
    patterns: [
      /(?:maine\s+)?entry\s+(?:le\s+li|ho\s+gayi|bana\s+li|done\s+hai|trigger\s+ho\s+gayi)/i,
      /(?:buy|sell)\s+(?:kar\s+liya|kar\s+diya|le\s+liya)/i,
      /order\s+(?:execute|placed|lag\s+gaya|place\s+kar\s+diya|fill\s+ho\s+gaya)/i,
      /position\s+(?:open\s+hai|bana\s+li|chal\s+rahi\s+hai|le\s+li)/i,
      /(?:call|put|ce|pe)\s+(?:buy\s+kiya|le\s+liya|execute\s+kiya)/i,
      /\bi(?:'ve|\s+have)\s+entered\b/i,
      /\bi(?:'ve|\s+have)\s+bought\b/i,
      /\bi(?:'ve|\s+have)\s+shorted\b/i,
      /\border\s+filled\b/i,
      /trade\s+active\s+hai/i,
      /hamari\s+entry\s+(?:yahan\s+par\s+)?ho\s+chuki\s+hai/i,
    ],
  },

  // 7. STOP LOSS (SL)
  {
    category: "STOP_LOSS",
    type: "SL_LEVEL",
    weight: 0.88,
    patterns: [
      /\bsl\b|\bstop[\s-]?loss\b/i,
      /sl\s+(?:yahan\s+rahega|is\s+candle\s+ke\s+low|high\s+ke\s+upar|rakhenge)/i,
      /stop[\s-]?loss\s+(?:hamara|yahan|rakhenge|is\s+candle|hit|cut\s+gaya|trigger\s+hua)/i,
      /(?:candle|hammer|pin\s*bar)\s+ke\s+(?:low|high)\s+(?:par|pe)\s+(?:\d+\s+)?rahega/i,
      /sl\s+hit/i,
      /sl\s+(?:trail|modify)/i,
    ],
  },

  // 8. TARGET & RISK REWARD (RR)
  {
    category: "TARGET",
    type: "TARGET_ACHIEVED",
    weight: 0.92,
    patterns: [
      /target\s+(?:1|2|3|one|two|three)?\s*(?:hit|achieve|done|aa\s+gaya|mil\s+gaya)/i,
      /\btp\s+hit\b|\btake\s+profit\b/i,
      /first\s+target\s+(?:done|hit)/i,
      /target\s+done/i,
    ],
  },
  {
    category: "RISK_REWARD",
    type: "RR_MILESTONE",
    weight: 0.95,
    patterns: [
      /\b(?:1r|2r|3r|4r|5r)\b/i,
      /\b1:1\b|\b1:2\b|\b1:3\b|\b1:4\b|\b1:5\b/i,
      /(?:1r|2r|3r)\s+(?:mil\s+gaya|done|achieve|hit)/i,
      /risk[\s-]reward\s+ratio/i,
      /rr\s+(?:mil\s+raha|achieve)/i,
    ],
  },

  // 9. BREAKEVEN & TRADE MANAGEMENT
  {
    category: "BREAKEVEN",
    type: "SL_TO_COST",
    weight: 0.94,
    patterns: [
      /cost\s+pe\s+(?:le\s+aao|rakh\s+lo|rakho|sl\s+kar\s+do)/i,
      /cost\s+to\s+cost/i,
      /sl\s+(?:to\s+)?(?:be|breakeven)/i,
      /risk[\s-]?free\s+(?:trade|kar\s+lo|ho\s+gaya)/i,
      /ab\s+loss\s+nahi\s+hoga/i,
      /sl\s+cost\s+par/i,
    ],
  },
  {
    category: "TRADE_MANAGEMENT",
    type: "PARTIAL_BOOKING",
    weight: 0.88,
    patterns: [
      /partial\s+(?:profit|booking|book)/i,
      /half\s+quantity\s+(?:book|nikal\s+lo)/i,
      /50%\s+(?:book|profit)/i,
      /profit\s+(?:lock\s+kar\s+lo|book\s+karo)/i,
      /safe\s+traders\s+book\s+kar\s+lo/i,
    ],
  },
];

/**
 * Common Trading Instruments mentioned on Rahul's stream
 */
export const INSTRUMENT_PATTERNS: { name: string; patterns: RegExp[] }[] = [
  {
    name: "XAUUSD",
    patterns: [/\bxauusd\b/i, /\bxau\b/i, /\bgold\b/i, /\bsona\b/i],
  },
  {
    name: "BANKNIFTY",
    patterns: [/\bbank\s*nifty\b/i, /\bbanknifty\b/i, /\bbn\b/i],
  },
  {
    name: "NIFTY",
    patterns: [/\bnifty\s*50\b/i, /\bnifty\b/i],
  },
  {
    name: "EURUSD",
    patterns: [/\beurusd\b/i, /\beur[\s-]?usd\b/i],
  },
  {
    name: "GBPUSD",
    patterns: [/\bgbpusd\b/i, /\bgbp[\s-]?usd\b/i],
  },
  {
    name: "BTCUSD",
    patterns: [/\bbtcusd\b/i, /\bbtc\b/i, /\bbitcoin\b/i],
  },
  {
    name: "CRUDEOIL",
    patterns: [/\bcrude\s*oil\b/i, /\bcrude\b/i, /\bwti\b/i],
  },
];

/**
 * Directional Clues
 */
const BUY_PATTERNS = [
  /\bbuy\b/i,
  /\blong\b/i,
  /\bbullish\b/i,
  /\bcall\b/i,
  /\bce\b/i,
  /kharid/i,
  /upar\s+(?:jayega|niklega|bhagega)/i,
  /upside/i,
  /tezi/i,
];

const SELL_PATTERNS = [
  /\bsell\b/i,
  /\bshort\b/i,
  /\bbearish\b/i,
  /\bput\b/i,
  /\bpe\b/i,
  /bech/i,
  /niche\s+(?:aayega|girega|niklega)/i,
  /downside/i,
  /mandi/i,
];

/**
 * Hypothetical / Conditional Words that indicate a planned setup rather than an execution
 */
const HYPOTHETICAL_MARKERS = [
  /\bagar\b/i,
  /\bif\b/i,
  /\bprobabilit(?:y|ies)\b/i,
  /\bscenario\b/i,
  /\bplan\s+hai\b/i,
  /\bwait\s+karenge\b/i,
  /\bhone\s+par\b/i,
  /\btab\s+dekhange\b/i,
  /\bdekh\s+rahe\s+hain\b/i,
  /\bpossible\s+hai\b/i,
  /\bchance\s+hai\b/i,
];

/**
 * Execution confirmation words that prove trade was actually placed
 */
const EXECUTION_MARKERS = [
  /\bentry\s+(?:le\s+li|ho\s+gayi|done\s+hai)\b/i,
  /\bmaine\s+(?:buy|sell|entry)\s+ki(?:ya|ye)\b/i,
  /\border\s+(?:place|execute|lag\s+gaya)\b/i,
  /\bposition\s+(?:open|chal\s+rahi|active)\b/i,
  /\bwe\s+are\s+in\s+the\s+trade\b/i,
  /\bhamari\s+entry\b/i,
  /\bbought\s+at\b/i,
  /\bshorted\s+at\b/i,
];

export interface DetectedTradeTerm {
  category: EventCategory;
  type: string;
  weight: number;
  matchedPattern: string;
}

export interface ClassifiedEvent {
  category: EventCategory;
  type: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  timestamp: number;
  endTimestamp?: number;
  text: string;
  instrument?: string;
  direction?: "BUY" | "SELL";
  price?: number;
  isExecution: boolean;
  isHypothetical: boolean;
}

/**
 * Extracts instrument mention from a text line
 */
export function extractInstrument(text: string): string | null {
  for (const item of INSTRUMENT_PATTERNS) {
    for (const pat of item.patterns) {
      if (pat.test(text)) {
        return item.name;
      }
    }
  }
  return null;
}

/**
 * Extracts trade direction (BUY or SELL) from text
 */
export function extractDirection(text: string): "BUY" | "SELL" | null {
  let buyScore = 0;
  let sellScore = 0;

  for (const pat of BUY_PATTERNS) {
    if (pat.test(text)) buyScore++;
  }
  for (const pat of SELL_PATTERNS) {
    if (pat.test(text)) sellScore++;
  }

  if (buyScore > sellScore && buyScore > 0) return "BUY";
  if (sellScore > buyScore && sellScore > 0) return "SELL";
  return null;
}

/**
 * Extracts numeric prices mentioned in speech (e.g., 2380.5, 44250, 18500)
 */
export function extractPriceMentions(text: string): number[] {
  const prices: number[] = [];
  // Matches patterns like "2380.50", "44,200", "18250"
  const regex = /(?:at|pe|par|around|level|price)?\s*([1-9]\d{1,4}(?:\.\d{1,3})?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const val = parseFloat(match[1]);
    // Filter out common small integers like 1, 2, 5, 15 (which are minutes or lots)
    if (!isNaN(val) && val > 50) {
      prices.push(val);
    }
  }

  return Array.from(new Set(prices));
}

/**
 * Detects whether a statement indicates actual execution vs hypothetical planning
 */
export function detectExecutionStatus(text: string): {
  isExecution: boolean;
  isHypothetical: boolean;
  confidence: number;
} {
  let execHits = 0;
  let hypoHits = 0;

  for (const pat of EXECUTION_MARKERS) {
    if (pat.test(text)) execHits++;
  }

  for (const pat of HYPOTHETICAL_MARKERS) {
    if (pat.test(text)) hypoHits++;
  }

  const isExecution = execHits > 0 && execHits >= hypoHits;
  const isHypothetical = hypoHits > 0 && !isExecution;
  const confidence = isExecution ? Math.min(0.7 + execHits * 0.1, 0.99) : isHypothetical ? 0.8 : 0.5;

  return { isExecution, isHypothetical, confidence };
}

/**
 * Scans a single text string against trading terminology
 */
export function matchTradingKeywords(text: string): DetectedTradeTerm[] {
  const matches: DetectedTradeTerm[] = [];

  for (const item of TRADING_TERMINOLOGY) {
    for (const pat of item.patterns) {
      const isMatch = typeof pat === "string" ? text.toLowerCase().includes(pat.toLowerCase()) : pat.test(text);
      if (isMatch) {
        matches.push({
          category: item.category,
          type: item.type,
          weight: item.weight,
          matchedPattern: pat.toString(),
        });
        break; // Match once per item
      }
    }
  }

  return matches;
}

/**
 * Classifies a transcript segment into a structured trade event
 */
export function classifySegment(segment: TranscriptSegment): ClassifiedEvent | null {
  const text = segment.text;
  const matchedTerms = matchTradingKeywords(text);
  if (matchedTerms.length === 0) return null;

  // Pick highest weighted category
  matchedTerms.sort((a, b) => b.weight - a.weight);
  const primary = matchedTerms[0];

  const execStatus = detectExecutionStatus(text);
  const instrument = extractInstrument(text) || undefined;
  const direction = extractDirection(text) || undefined;
  const prices = extractPriceMentions(text);

  let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  if (primary.weight >= 0.9) confidence = "HIGH";
  else if (primary.weight < 0.85) confidence = "LOW";

  return {
    category: primary.category,
    type: primary.type,
    confidence,
    score: primary.weight,
    timestamp: Math.round(segment.start),
    endTimestamp: Math.round(segment.end),
    text: segment.text,
    instrument,
    direction,
    price: prices.length > 0 ? prices[0] : undefined,
    isExecution: execStatus.isExecution,
    isHypothetical: execStatus.isHypothetical,
  };
}

/**
 * Scans an entire list of transcript segments and extracts all candidate trade events.
 */
export function extractTradeEventsFromSegments(segments: TranscriptSegment[]): ClassifiedEvent[] {
  const events: ClassifiedEvent[] = [];

  for (const seg of segments) {
    const classified = classifySegment(seg);
    if (classified) {
      events.push(classified);
    }
  }

  return events;
}
