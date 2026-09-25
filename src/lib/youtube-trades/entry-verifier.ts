/**
 * Multi-Source Entry Verification Engine
 * Cross-references audio commentary, market structure alignment,
 * visual chart frames, and trade lifecycle corroboration.
 */

import { ReconstructedTradeCandidate } from "./state-machine";
import { VisualVerificationResult } from "./visual-verifier";

export type VerificationLevel = "VERIFIED_HIGH" | "VERIFIED_MEDIUM" | "UNVERIFIED";

export interface MultiSourceScoreBreakdown {
  audioScore: number;       // 0.0 to 0.35 (spoken execution statement clarity & price mention)
  contextScore: number;     // 0.0 to 0.25 (liquidity + COC/BOS + candle confirmation preceding entry)
  visualScore: number;      // 0.0 to 0.25 (chart presence + candle color alignment with BUY/SELL)
  lifecycleScore: number;   // 0.0 to 0.15 (subsequent SL, RR milestones, target hit, BE defense)
}

export interface MultiSourceVerificationReport {
  tradeNumber: number;
  instrument: string;
  direction: "BUY" | "SELL";
  isActualTrade: boolean;
  totalScore: number; // 0.0 to 1.0
  verificationLevel: VerificationLevel;
  directionMatch: boolean | null;
  entryTimestamp: number;
  entryPrice?: number;
  scoreBreakdown: MultiSourceScoreBreakdown;
  corroboratingFactors: string[];
  riskWarnings: string[];
}

/**
 * Evaluates multi-source evidence for a candidate trade.
 */
export function verifyTradeMultiSource(
  candidate: ReconstructedTradeCandidate,
  visualResult?: VisualVerificationResult | null
): MultiSourceVerificationReport {
  const corroboratingFactors: string[] = [];
  const riskWarnings: string[] = [];

  // ==========================================
  // 1. Audio Commentary Evidence (Max 0.35)
  // ==========================================
  let audioScore = 0.0;
  let entryPrice: number | undefined = undefined;

  if (candidate.actualEntry) {
    audioScore += 0.25;
    corroboratingFactors.push(
      `Audio execution statement confirmed at ${candidate.actualEntry.timestamp}s: "${candidate.actualEntry.text}"`
    );

    if (candidate.actualEntry.price) {
      audioScore += 0.10;
      entryPrice = candidate.actualEntry.price;
      corroboratingFactors.push(`Spoken execution price identified: ${entryPrice}`);
    }
  } else if (candidate.plannedEntry) {
    audioScore += 0.10;
    riskWarnings.push("Only planned entry statement detected; no explicit execution statement.");
  } else {
    riskWarnings.push("No spoken entry statement found in transcript.");
  }

  // ==========================================
  // 2. Contextual Structure Evidence (Max 0.25)
  // ==========================================
  let contextScore = 0.0;

  if (candidate.liquidity) {
    contextScore += 0.08;
    corroboratingFactors.push(`Liquidity setup confirmed: ${candidate.liquidity.type}`);
  }

  if (candidate.marketStructure) {
    contextScore += 0.09;
    corroboratingFactors.push(`Market structure confirmed: ${candidate.marketStructure.type}`);
  }

  if (candidate.candleConfirmation) {
    contextScore += 0.08;
    corroboratingFactors.push(`Candle pattern confirmed: ${candidate.candleConfirmation.type}`);
  }

  if (contextScore === 0.0) {
    riskWarnings.push("Entry lacks prior institutional context (no liquidity sweep or COC detected).");
  }

  // ==========================================
  // 3. Visual Chart & Directional Alignment (Max 0.25)
  // ==========================================
  let visualScore = 0.0;
  let directionMatch: boolean | null = null;

  if (visualResult) {
    if (visualResult.chartDetected) {
      visualScore += 0.15;
      corroboratingFactors.push(
        `Visual chart canvas verified (${visualResult.backgroundTheme} theme, ${(visualResult.confidence * 100).toFixed(0)}% confidence)`
      );

      // Check directional alignment:
      // BUY trades should align with GREEN or BALANCED candles
      // SELL trades should align with RED or BALANCED candles
      if (candidate.direction === "BUY") {
        if (visualResult.dominantCandleColor === "GREEN") {
          visualScore += 0.10;
          directionMatch = true;
          corroboratingFactors.push("Visual bullish (green) candlestick aligns with BUY order.");
        } else if (visualResult.dominantCandleColor === "BALANCED") {
          visualScore += 0.06;
          directionMatch = true;
          corroboratingFactors.push("Visual candlestick distribution shows active market participation.");
        } else if (visualResult.dominantCandleColor === "RED") {
          visualScore += 0.02;
          directionMatch = false;
          riskWarnings.push("Visual bearish (red) candle detected during BUY setup (possible pullback entry).");
        }
      } else if (candidate.direction === "SELL") {
        if (visualResult.dominantCandleColor === "RED") {
          visualScore += 0.10;
          directionMatch = true;
          corroboratingFactors.push("Visual bearish (red) candlestick aligns with SELL order.");
        } else if (visualResult.dominantCandleColor === "BALANCED") {
          visualScore += 0.06;
          directionMatch = true;
          corroboratingFactors.push("Visual candlestick distribution shows active market participation.");
        } else if (visualResult.dominantCandleColor === "GREEN") {
          visualScore += 0.02;
          directionMatch = false;
          riskWarnings.push("Visual bullish (green) candle detected during SELL setup (possible pullback entry).");
        }
      }
    } else {
      riskWarnings.push("Visual verification was inconclusive: no clear chart canvas detected.");
    }
  } else {
    // If visual verification hasn't been run yet, assign baseline 0.12 if actual trade
    if (candidate.isActualTrade) {
      visualScore += 0.12;
      corroboratingFactors.push("Visual verification pending (baseline stream confidence applied).");
    }
  }

  // ==========================================
  // 4. Trade Lifecycle Corroboration (Max 0.15)
  // ==========================================
  let lifecycleScore = 0.0;

  if (candidate.stopLoss) {
    lifecycleScore += 0.04;
    corroboratingFactors.push("Stop Loss positioning confirmed in trade narrative.");
  }

  if (candidate.result === "TP" || candidate.takeProfit) {
    lifecycleScore += 0.05;
    corroboratingFactors.push("Target achievement confirmed in stream commentary.");
  }

  if (candidate.riskStatus === "RISK_FREE" || candidate.riskStatus === "BREAKEVEN") {
    lifecycleScore += 0.04;
    corroboratingFactors.push("Breakeven / risk-free trade management confirmed.");
  }

  if (candidate.currentR && candidate.currentR !== "1R") {
    lifecycleScore += 0.02;
    corroboratingFactors.push(`R:R progression corroborated (${candidate.currentR})`);
  }

  // ==========================================
  // 5. Total Consolidated Score & Classification
  // ==========================================
  const rawTotal = audioScore + contextScore + visualScore + lifecycleScore;
  const totalScore = Math.min(Math.round(rawTotal * 100) / 100, 1.0);

  let verificationLevel: VerificationLevel = "UNVERIFIED";
  if (totalScore >= 0.85 && candidate.isActualTrade) {
    verificationLevel = "VERIFIED_HIGH";
  } else if (totalScore >= 0.65) {
    verificationLevel = "VERIFIED_MEDIUM";
  }

  const entryTimestamp =
    candidate.actualEntry?.timestamp ||
    candidate.plannedEntry?.timestamp ||
    candidate.clipStart ||
    0;

  return {
    tradeNumber: candidate.tradeNumber,
    instrument: candidate.instrument,
    direction: candidate.direction,
    isActualTrade: candidate.isActualTrade,
    totalScore,
    verificationLevel,
    directionMatch,
    entryTimestamp,
    entryPrice,
    scoreBreakdown: {
      audioScore: Math.round(audioScore * 100) / 100,
      contextScore: Math.round(contextScore * 100) / 100,
      visualScore: Math.round(visualScore * 100) / 100,
      lifecycleScore: Math.round(lifecycleScore * 100) / 100,
    },
    corroboratingFactors,
    riskWarnings,
  };
}
