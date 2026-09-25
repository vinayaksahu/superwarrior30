/**
 * Trade Management & Capital Defense Engine
 * Tracks dynamic trade adjustments during the open position window:
 * - Moving Stop Loss to Cost / Breakeven (0% Capital Risk)
 * - Partial Profit Booking (50% Quantity locked)
 * - Trailing Stop Loss modifications
 * - Runner management & final profit protection
 */

import { ReconstructedTradeCandidate } from "./state-machine";

export type ManagementActionType =
  | "INITIAL_RISK"
  | "SL_TO_BREAKEVEN"
  | "PARTIAL_BOOKING"
  | "TRAILING_SL"
  | "FULL_EXIT";

export interface ManagementStep {
  timestamp: number;
  actionType: ManagementActionType;
  title: string;
  quote: string;
  capitalRiskPercent: number; // 100% -> 50% -> 0%
  profitLockedR?: string; // e.g. "1R", "2R"
  notes?: string;
}

export interface TradeManagementReport {
  isRiskFree: boolean;
  breakevenAchievedAt?: number;
  partialBookingAchievedAt?: number;
  trailingSLApplied: boolean;
  trailingStepsCount: number;
  initialRiskPercent: number; // 100%
  currentRiskPercent: number; // 0% if BE active
  capitalRiskReductionPercent: number; // e.g. 100%
  managementScore: number; // 0.0 to 1.0 (evaluating compliance with Rahul's discipline rules)
  summaryText: string;
  steps: ManagementStep[];
}

/**
 * Analyzes the trade candidate's timeline and spoken commentary
 * to reconstruct the full capital defense and trade management journey.
 */
export function analyzeTradeManagement(
  candidate: ReconstructedTradeCandidate
): TradeManagementReport {
  const steps: ManagementStep[] = [];
  const events = candidate.events || [];

  const entryTime =
    candidate.actualEntry?.timestamp ||
    candidate.plannedEntry?.timestamp ||
    candidate.clipStart ||
    0;

  // Step 1: Initial Trade Risk (100% capital risk)
  steps.push({
    timestamp: entryTime,
    actionType: "INITIAL_RISK",
    title: "Initial Capital Risk Active",
    quote: candidate.actualEntry?.text || "Position opened with defined stop loss",
    capitalRiskPercent: 100,
    profitLockedR: "0R",
    notes: "Stop loss placed below setup confirmation level; initial 1R risk active.",
  });

  let isRiskFree = false;
  let breakevenAchievedAt: number | undefined = undefined;
  let partialBookingAchievedAt: number | undefined = undefined;
  let trailingSLApplied = false;
  let trailingStepsCount = 0;
  let currentRiskPercent = 100;

  for (const ev of events) {
    const text = ev.text.toLowerCase();

    // Check Breakeven / SL to Cost
    if (
      ev.category === "BREAKEVEN" ||
      /cost\s+pe|cost\s+to\s+cost|sl\s+to\s+be|risk[\s-]?free|sl\s+cost\s+par/i.test(text)
    ) {
      if (!isRiskFree) {
        isRiskFree = true;
        breakevenAchievedAt = ev.timestamp;
        currentRiskPercent = 0;

        steps.push({
          timestamp: ev.timestamp,
          actionType: "SL_TO_BREAKEVEN",
          title: "Stop Loss Moved to Cost (Risk-Free)",
          quote: ev.text,
          capitalRiskPercent: 0,
          profitLockedR: "BE (Cost)",
          notes: "Capital is fully protected. Worst-case outcome is now 0 loss.",
        });
      }
    }

    // Check Partial Profit Booking
    if (
      ev.category === "TRADE_MANAGEMENT" ||
      /partial\s+(?:book|profit)|half\s+quantity|50%\s+book|profit\s+lock/i.test(text)
    ) {
      if (!partialBookingAchievedAt) {
        partialBookingAchievedAt = ev.timestamp;
        if (currentRiskPercent > 0) currentRiskPercent = 50;

        steps.push({
          timestamp: ev.timestamp,
          actionType: "PARTIAL_BOOKING",
          title: "Partial Profit Booked",
          quote: ev.text,
          capitalRiskPercent: currentRiskPercent,
          profitLockedR: "1R+ Locked",
          notes: "Secured partial gains; remaining position running risk-free.",
        });
      }
    }

    // Check Trailing Stop Loss
    if (/trailing\s+sl|sl\s+trail|sl\s+modify|trail\s+karenge/i.test(text)) {
      trailingSLApplied = true;
      trailingStepsCount++;

      steps.push({
        timestamp: ev.timestamp,
        actionType: "TRAILING_SL",
        title: `Trailing Stop Loss Adjusted #${trailingStepsCount}`,
        quote: ev.text,
        capitalRiskPercent: 0,
        profitLockedR: "Trailing in Profit",
        notes: "SL raised dynamically behind swing points to lock in runner profits.",
      });
    }
  }

  // Final Step: If target hit, add full exit milestone
  if (candidate.result === "TP") {
    const exitTime = candidate.takeProfit?.timestamp || candidate.clipEnd || entryTime + 300;
    steps.push({
      timestamp: exitTime,
      actionType: "FULL_EXIT",
      title: "Target Achieved & Full Profit Realized",
      quote: candidate.takeProfit?.text || "Target hit, trade completed successfully",
      capitalRiskPercent: 0,
      profitLockedR: candidate.realizedR || candidate.plannedRR || "3R",
      notes: "Trade closed at institutional target objective.",
    });
  }

  // Calculate Management Score according to Rahul's rules
  let managementScore = 0.5; // Baseline
  if (isRiskFree) managementScore += 0.25;
  if (partialBookingAchievedAt) managementScore += 0.15;
  if (trailingSLApplied) managementScore += 0.10;
  managementScore = Math.min(Math.round(managementScore * 100) / 100, 1.0);

  const capitalRiskReductionPercent = 100 - currentRiskPercent;

  let summaryText = "Trade opened with standard defined stop loss.";
  if (isRiskFree && partialBookingAchievedAt) {
    summaryText = "Flawless Execution: Breakeven defense activated & partial profits locked.";
  } else if (isRiskFree) {
    summaryText = "Capital Defended: Stop loss moved to cost to ensure 100% risk-free trade.";
  } else if (partialBookingAchievedAt) {
    summaryText = "Partial profits secured during price expansion.";
  }

  return {
    isRiskFree,
    breakevenAchievedAt,
    partialBookingAchievedAt,
    trailingSLApplied,
    trailingStepsCount,
    initialRiskPercent: 100,
    currentRiskPercent,
    capitalRiskReductionPercent,
    managementScore,
    summaryText,
    steps,
  };
}
