/**
 * Risk:Reward (R:R) Timeline Engine
 * Computes price geometry, risk distance (pips/points), planned vs realized RR,
 * and tracks the dynamic R:R progression milestones (1R -> 2R -> 3R -> BE).
 */

import { ClassifiedEvent } from "./terminology";
import { ReconstructedTradeCandidate } from "./state-machine";

export interface RRMilestone {
  ratio: string; // "1R", "2R", "3R", "4R", "5R"
  ratioValue: number; // 1, 2, 3, 4, 5
  projectedPrice?: number;
  achievedTimestamp?: number;
  achieved: boolean;
  notes?: string;
}

export interface RRTimelineGeometry {
  instrument: string;
  direction: "BUY" | "SELL";
  entryPrice?: number;
  stopLossPrice?: number;
  riskDistance: number; // in price points (e.g. 7.5 points in Gold, 60 points in Bank Nifty)
  plannedRRRatio: string; // e.g. "1:3"
  plannedRRValue: number; // e.g. 3.0
  realizedRRRatio: string; // e.g. "2R" or "3R"
  realizedRRValue: number; // e.g. 2.0
  riskStatus: "ACTIVE" | "RISK_FREE" | "BREAKEVEN";
  isFavorableRR: boolean; // true if plannedRR >= 1:2 (Rahul's minimum discipline rule)
  milestones: RRMilestone[];
  breakevenTimestamp?: number;
}

/**
 * Parses ratio strings like "1:3", "1:2.5", "3R", "2R" into a float ratio number.
 */
export function parseRRRatioValue(rrStr?: string | null): number {
  if (!rrStr) return 2.0; // Default conservative 1:2
  const cleaned = rrStr.trim().toLowerCase();

  // Match "1:3" or "1:2.5"
  const ratioMatch = cleaned.match(/1\s*:\s*([\d.]+)/);
  if (ratioMatch) {
    const val = parseFloat(ratioMatch[1]);
    return isNaN(val) ? 2.0 : val;
  }

  // Match "3r", "2.5r"
  const rMatch = cleaned.match(/([\d.]+)\s*r/);
  if (rMatch) {
    const val = parseFloat(rMatch[1]);
    return isNaN(val) ? 2.0 : val;
  }

  return 2.0;
}

/**
 * Calculates pip or point unit sizing based on instrument.
 */
export function getInstrumentPipMultiplier(instrument: string): number {
  const upper = instrument.toUpperCase();
  if (upper.includes("XAU") || upper.includes("GOLD")) return 0.1; // 1 pip = $0.10
  if (upper.includes("JPY")) return 0.01;
  if (upper.includes("NIFTY") || upper.includes("BANKNIFTY")) return 1.0; // 1 point = 1.0
  if (upper.includes("BTC")) return 1.0;
  return 0.0001; // Standard Forex pair (EURUSD, GBPUSD)
}

/**
 * Builds the complete Risk:Reward geometry and milestone trajectory for a trade candidate.
 */
export function buildRRTimeline(candidate: ReconstructedTradeCandidate): RRTimelineGeometry {
  const direction = candidate.direction;
  const instrument = candidate.instrument;
  const entryPrice = candidate.actualEntry?.price || candidate.plannedEntry?.price;
  const stopLossPrice = candidate.stopLoss?.price;

  const plannedRRRatio = candidate.plannedRR || "1:3";
  const plannedRRValue = parseRRRatioValue(plannedRRRatio);

  const realizedRRRatio = candidate.realizedR || "1:2";
  const realizedRRValue = parseRRRatioValue(realizedRRRatio);

  // Compute Risk Distance
  let riskDistance = 0;
  if (entryPrice && stopLossPrice) {
    riskDistance = Math.abs(Math.round((entryPrice - stopLossPrice) * 100) / 100);
  }

  // Direction multiplier (+1 for BUY, -1 for SELL)
  const dirMultiplier = direction === "BUY" ? 1 : -1;

  // Extract events that indicate milestone achievement or breakeven
  const events = candidate.events || [];
  let breakevenTimestamp: number | undefined = undefined;
  const achievedMilestonesMap: Record<string, { timestamp: number; text: string }> = {};

  for (const ev of events) {
    // Check Breakeven
    if (
      ev.category === "BREAKEVEN" ||
      /cost\s+pe|sl\s+to\s+be|risk[\s-]?free|sl\s+cost/i.test(ev.text)
    ) {
      if (!breakevenTimestamp || ev.timestamp < breakevenTimestamp) {
        breakevenTimestamp = ev.timestamp;
      }
    }

    // Check RR Milestones in speech
    if (/\b1r\b|\b1:1\b/i.test(ev.text)) {
      achievedMilestonesMap["1R"] = { timestamp: ev.timestamp, text: ev.text };
    }
    if (/\b2r\b|\b1:2\b/i.test(ev.text)) {
      achievedMilestonesMap["2R"] = { timestamp: ev.timestamp, text: ev.text };
    }
    if (/\b3r\b|\b1:3\b|target\s+1\b/i.test(ev.text)) {
      achievedMilestonesMap["3R"] = { timestamp: ev.timestamp, text: ev.text };
    }
    if (/\b4r\b|\b1:4\b|target\s+2\b/i.test(ev.text)) {
      achievedMilestonesMap["4R"] = { timestamp: ev.timestamp, text: ev.text };
    }
  }

  // Construct Standard Trajectory Milestones: 1R, 2R, 3R, 4R
  const milestones: RRMilestone[] = [];
  const maxRatio = Math.max(3, Math.ceil(plannedRRValue));

  for (let r = 1; r <= maxRatio; r++) {
    const ratioStr = `${r}R`;
    const achievedData = achievedMilestonesMap[ratioStr];
    const isAchieved = !!achievedData || realizedRRValue >= r;

    let projectedPrice: number | undefined = undefined;
    if (entryPrice && riskDistance > 0) {
      projectedPrice = Math.round((entryPrice + dirMultiplier * (r * riskDistance)) * 100) / 100;
    }

    milestones.push({
      ratio: ratioStr,
      ratioValue: r,
      projectedPrice,
      achieved: isAchieved,
      achievedTimestamp: achievedData?.timestamp,
      notes:
        r === 2
          ? "Typical Breakeven / SL-to-cost trigger"
          : r === 3
          ? "Target 1 milestone"
          : undefined,
    });
  }

  const isFavorableRR = plannedRRValue >= 2.0;

  return {
    instrument,
    direction,
    entryPrice,
    stopLossPrice,
    riskDistance,
    plannedRRRatio,
    plannedRRValue,
    realizedRRRatio,
    realizedRRValue,
    riskStatus: candidate.riskStatus,
    isFavorableRR,
    milestones,
    breakevenTimestamp,
  };
}
