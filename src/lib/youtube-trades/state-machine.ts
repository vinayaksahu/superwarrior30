/**
 * Trade State Machine Engine
 * Correlates isolated transcript events into complete Trade Story lifecycles:
 * Context -> Liquidity -> Structure (COC/BOS) -> Candle -> Setup Criteria -> Actual Entry -> SL/TP/BE
 * 
 * Strict Validation: Distinguishes between hypothetical/unexecuted setups and actual executed trades.
 */

import { ClassifiedEvent, EventCategory } from "./terminology";

export type TradeLifecycleState =
  | "IDLE"
  | "LIQUIDITY_DETECTED"
  | "STRUCTURE_CONFIRMED"
  | "CANDLE_CONFIRMED"
  | "CRITERIA_DEFINED"
  | "ENTRY_EXECUTED"
  | "IN_TRADE"
  | "BREAKEVEN"
  | "COMPLETED_TP"
  | "COMPLETED_SL"
  | "UNEXECUTED_SETUP";

export interface ReconstructedTradeCandidate {
  tradeNumber: number;
  instrument: string;
  direction: "BUY" | "SELL";
  isActualTrade: boolean; // true = executed real trade; false = hypothetical/planned setup only
  marketContext: string;
  liquidity: {
    type: string;
    timestamp: number;
    text: string;
    confidence: string;
  } | null;
  marketStructure: {
    type: string;
    timestamp: number;
    text: string;
    confidence: string;
  } | null;
  priceAction: string | null;
  candleConfirmation: {
    type: string;
    timestamp: number;
    text: string;
    confidence: string;
  } | null;
  entryCriteria: string | null;
  plannedEntry: {
    timestamp: number;
    price?: number;
    text: string;
  } | null;
  actualEntry: {
    timestamp: number;
    price?: number;
    text: string;
    confidence: string;
  } | null;
  stopLoss: {
    timestamp: number;
    price?: number;
    text: string;
  } | null;
  takeProfit: {
    timestamp: number;
    price?: number;
    text: string;
  } | null;
  plannedRR: string;
  currentR: string;
  realizedR: string;
  riskStatus: "ACTIVE" | "RISK_FREE" | "BREAKEVEN";
  result: "TP" | "SL" | "BE" | "OPEN";
  confidence: number;
  completenessScore: number;
  clipStart: number;
  clipEnd: number;
  events: ClassifiedEvent[];
}

/**
 * Calculates completeness score (0.0 to 1.0) based on presence of key story phases:
 * 1. Liquidity (15%)
 * 2. Structure COC/BOS (15%)
 * 3. Candle Confirmation (15%)
 * 4. Entry Criteria / Setup (15%)
 * 5. Actual Entry (20%)
 * 6. Stop Loss & Target / RR (15%)
 * 7. Breakeven / Risk Management (5%)
 */
export function calculateCompletenessScore(candidate: Partial<ReconstructedTradeCandidate>): number {
  let score = 0;
  if (candidate.liquidity) score += 0.15;
  if (candidate.marketStructure) score += 0.15;
  if (candidate.candleConfirmation) score += 0.15;
  if (candidate.entryCriteria || candidate.plannedEntry) score += 0.15;
  if (candidate.actualEntry) score += 0.20;
  if (candidate.stopLoss || candidate.takeProfit) score += 0.15;
  if (candidate.riskStatus === "RISK_FREE" || candidate.riskStatus === "BREAKEVEN") score += 0.05;
  return Math.min(Math.round(score * 100) / 100, 1.0);
}

/**
 * Calculates overall confidence based on execution confirmation and event density.
 */
export function calculateConfidence(candidate: Partial<ReconstructedTradeCandidate>): number {
  if (!candidate.isActualTrade) return 0.5; // Hypothetical setups cap at 0.5
  let base = 0.75;
  if (candidate.actualEntry) base += 0.10;
  if (candidate.liquidity) base += 0.05;
  if (candidate.marketStructure) base += 0.05;
  if (candidate.candleConfirmation) base += 0.04;
  return Math.min(Math.round(base * 100) / 100, 0.99);
}

/**
 * Temporal clustering window (in seconds) between trade events.
 * If consecutive trade events have a gap larger than 1200 seconds (20 minutes),
 * they are treated as separate trade candidates or distinct sessions.
 */
const EVENT_CLUSTER_MAX_GAP_SEC = 1200;

/**
 * Groups classified transcript events into temporal clusters representing distinct trade opportunities.
 */
export function clusterEventsByTime(events: ClassifiedEvent[]): ClassifiedEvent[][] {
  if (events.length === 0) return [];

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: ClassifiedEvent[][] = [];
  let currentCluster: ClassifiedEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // If gap is too large, start a new trade cluster
    if (curr.timestamp - prev.timestamp > EVENT_CLUSTER_MAX_GAP_SEC) {
      clusters.push(currentCluster);
      currentCluster = [curr];
    } else {
      currentCluster.push(curr);
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
}

/**
 * Builds a single ReconstructedTradeCandidate from a cluster of classified events.
 */
export function buildTradeCandidateFromCluster(
  cluster: ClassifiedEvent[],
  tradeNumber: number,
  fallbackInstrument = "XAUUSD"
): ReconstructedTradeCandidate {
  let instrument: string = fallbackInstrument;
  let direction: "BUY" | "SELL" = "BUY";
  let buyCount = 0;
  let sellCount = 0;

  // Key Phase slots
  let liquidity: ReconstructedTradeCandidate["liquidity"] = null;
  let marketStructure: ReconstructedTradeCandidate["marketStructure"] = null;
  let candleConfirmation: ReconstructedTradeCandidate["candleConfirmation"] = null;
  let entryCriteriaText: string[] = [];
  let plannedEntry: ReconstructedTradeCandidate["plannedEntry"] = null;
  let actualEntry: ReconstructedTradeCandidate["actualEntry"] = null;
  let stopLoss: ReconstructedTradeCandidate["stopLoss"] = null;
  let takeProfit: ReconstructedTradeCandidate["takeProfit"] = null;
  let hasBreakeven = false;
  let targetHitCount = 0;
  let slHit = false;
  let realizedR = "1:2";
  let plannedRR = "1:3";
  let currentR = "1R";

  for (const ev of cluster) {
    // 1. Resolve Instrument
    if (ev.instrument) {
      instrument = ev.instrument;
    }

    // 2. Resolve Direction
    if (ev.direction === "BUY") buyCount++;
    if (ev.direction === "SELL") sellCount++;

    // 3. Process Event Categories
    switch (ev.category) {
      case "LIQUIDITY":
        if (!liquidity || ev.score > 0.9) {
          liquidity = {
            type: ev.type,
            timestamp: ev.timestamp,
            text: ev.text,
            confidence: ev.confidence,
          };
        }
        break;

      case "COC":
      case "CHoCH":
      case "BOS":
      case "MSS":
        if (!marketStructure || ev.score > 0.9) {
          marketStructure = {
            type: ev.type,
            timestamp: ev.timestamp,
            text: ev.text,
            confidence: ev.confidence,
          };
        }
        break;

      case "CANDLE_CONFIRMATION":
        if (!candleConfirmation || ev.score > 0.9) {
          candleConfirmation = {
            type: ev.type,
            timestamp: ev.timestamp,
            text: ev.text,
            confidence: ev.confidence,
          };
        }
        break;

      case "ENTRY_CRITERIA":
        entryCriteriaText.push(ev.text);
        if (!plannedEntry) {
          plannedEntry = {
            timestamp: ev.timestamp,
            price: ev.price,
            text: ev.text,
          };
        }
        break;

      case "ACTUAL_ENTRY":
        if (ev.isExecution) {
          actualEntry = {
            timestamp: ev.timestamp,
            price: ev.price,
            text: ev.text,
            confidence: ev.confidence,
          };
        }
        break;

      case "STOP_LOSS":
        stopLoss = {
          timestamp: ev.timestamp,
          price: ev.price,
          text: ev.text,
        };
        if (/hit|cut\s+gaya/i.test(ev.text)) {
          slHit = true;
        }
        break;

      case "TARGET":
        takeProfit = {
          timestamp: ev.timestamp,
          price: ev.price,
          text: ev.text,
        };
        targetHitCount++;
        break;

      case "RISK_REWARD":
        if (ev.text.includes("3R") || ev.text.includes("1:3")) {
          realizedR = "3R";
          currentR = "3R";
        } else if (ev.text.includes("2R") || ev.text.includes("1:2")) {
          realizedR = "2R";
          currentR = "2R";
        }
        break;

      case "BREAKEVEN":
        hasBreakeven = true;
        break;

      case "TRADE_MANAGEMENT":
        if (/cost|breakeven/i.test(ev.text)) {
          hasBreakeven = true;
        }
        break;
    }

    // Check for breakeven / risk-free mentions across any event text
    if (/cost\s+pe|cost\s+to\s+cost|sl\s+to\s+be|risk[\s-]?free|sl\s+at\s+breakeven/i.test(ev.text)) {
      hasBreakeven = true;
    }
  }

  // Direction consensus
  if (sellCount > buyCount) direction = "SELL";
  else direction = "BUY";

  // Check if this was an actual trade execution
  const isActualTrade = !!actualEntry;

  // Determine Result & Risk Status
  let result: ReconstructedTradeCandidate["result"] = "OPEN";
  if (targetHitCount > 0) result = "TP";
  else if (slHit) result = "SL";
  else if (hasBreakeven) result = "BE";

  let riskStatus: ReconstructedTradeCandidate["riskStatus"] = "ACTIVE";
  if (hasBreakeven) riskStatus = "RISK_FREE";

  // Compute Clip boundaries with 10s padding
  const firstTimestamp = cluster[0].timestamp;
  const lastTimestamp = cluster[cluster.length - 1].timestamp;
  const clipStart = Math.max(0, firstTimestamp - 10);
  const clipEnd = lastTimestamp + 15;

  // Context summary narrative
  const contextParts: string[] = [];
  if (liquidity) contextParts.push(`Liquidity: ${liquidity.type}`);
  if (marketStructure) contextParts.push(`Structure: ${marketStructure.type}`);
  if (candleConfirmation) contextParts.push(`Candle: ${candleConfirmation.type}`);
  const marketContext = contextParts.join(" | ") || "Live market price action";

  const candidate: ReconstructedTradeCandidate = {
    tradeNumber,
    instrument,
    direction,
    isActualTrade,
    marketContext,
    liquidity,
    marketStructure,
    priceAction: candleConfirmation ? `${candleConfirmation.type} confirmed` : "Zone defense & rejection",
    candleConfirmation,
    entryCriteria: entryCriteriaText.join(" | ") || (plannedEntry ? plannedEntry.text : null),
    plannedEntry,
    actualEntry,
    stopLoss,
    takeProfit,
    plannedRR,
    currentR,
    realizedR,
    riskStatus,
    result,
    confidence: 0.85,
    completenessScore: 0.85,
    clipStart,
    clipEnd,
    events: cluster,
  };

  candidate.completenessScore = calculateCompletenessScore(candidate);
  candidate.confidence = calculateConfidence(candidate);

  return candidate;
}

/**
 * Reconstructs Trade Candidates from raw classified transcript events.
 * @param events All classified events from the transcript
 * @param filterOnlyActual If true, excludes hypothetical/unexecuted setups and keeps only real trades.
 */
export function reconstructTradeCandidates(
  events: ClassifiedEvent[],
  filterOnlyActual = false,
  fallbackInstrument = "XAUUSD"
): ReconstructedTradeCandidate[] {
  const clusters = clusterEventsByTime(events);
  const candidates: ReconstructedTradeCandidate[] = [];

  let tradeCount = 1;
  for (const cluster of clusters) {
    // Only process clusters that have meaningful substance (at least 2 events)
    if (cluster.length >= 2) {
      const candidate = buildTradeCandidateFromCluster(cluster, tradeCount, fallbackInstrument);
      if (!filterOnlyActual || candidate.isActualTrade) {
        candidate.tradeNumber = tradeCount++;
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}
