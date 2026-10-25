/**
 * Copy Trading Risk Management & Lot Sizing Rules Engine
 * 
 * Rules:
 * 1. Fixed lot size scaled linearly: Every $300 balance = 0.01 Lot per trade.
 *    - $300  -> 0.01 lot
 *    - $600  -> 0.02 lot
 *    - $900  -> 0.03 lot
 *    - $1200 -> 0.04 lot
 *    - $1500 -> 0.05 lot, and so on.
 * 2. Maximum concurrent open positions per client MT5 account: Exactly 2 trades.
 *    - Total max lot exposure = 2 * Lot Per Trade (e.g. 0.02 lot for $300, 0.08 lot for $1200).
 * 3. Daily Drawdown (DD) Limit: 5% of account balance.
 *    - If today's loss (closed + floating) >= 5%, no more trades copied today.
 *    - Trading automatically resumes the next trading day (00:00 server time).
 * 4. Maximum Lifetime Drawdown (Max DD) Limit: 15% of initial account balance.
 *    - If total drawdown reaches 15%, the account is permanently disconnected
 *      from copy trading ("copy trading se bahar").
 */

export interface CopyTradingTier {
  accountBalance: number;
  lotPerTrade: number;
  maxOpenTrades: number;
  totalMaxLotExposure: number;
  dailyDDLimitPercent: number;
  dailyDDLimitUsd: number;
  maxDDLimitPercent: number;
  maxDDLimitUsd: number;
  cutoffEquity: number;
}

export interface RiskEvaluationResult {
  allowed: boolean;
  copiedLots: number;
  statusAction?: "DISCONNECT" | "DAILY_LOCK" | "SKIP_MAX_TRADES";
  reason?: string;
  tier: CopyTradingTier;
}

/**
 * Calculate lot size and DD limits based on account balance
 */
export function calculateCopyTradingTier(accountBalance: number): CopyTradingTier {
  const safeBalance = Math.max(100, Number(accountBalance) || 300);
  
  // Linear scaling: 0.01 lot for every $300 balance (minimum 0.01)
  const multiplier = Math.max(1, Math.floor(safeBalance / 300));
  const lotPerTrade = Number((multiplier * 0.01).toFixed(2));
  
  const maxOpenTrades = 2; // Strict limit: max 2 trades at a time
  const totalMaxLotExposure = Number((lotPerTrade * maxOpenTrades).toFixed(2));
  
  const dailyDDLimitPercent = 5.0; // 5%
  const dailyDDLimitUsd = Number((safeBalance * (dailyDDLimitPercent / 100)).toFixed(2));
  
  const maxDDLimitPercent = 15.0; // 15%
  const maxDDLimitUsd = Number((safeBalance * (maxDDLimitPercent / 100)).toFixed(2));
  
  // If equity falls below this, account breaches the 15% max DD limit
  const cutoffEquity = Number((safeBalance * (1 - maxDDLimitPercent / 100)).toFixed(2));

  return {
    accountBalance: safeBalance,
    lotPerTrade,
    maxOpenTrades,
    totalMaxLotExposure,
    dailyDDLimitPercent,
    dailyDDLimitUsd,
    maxDDLimitPercent,
    maxDDLimitUsd,
    cutoffEquity,
  };
}

/**
 * Evaluate if a child account is eligible to copy a new trade from master
 */
export function evaluateCopyTradeEligibility(params: {
  initialBalance: number;
  currentBalance: number;
  currentEquity: number;
  openTradesCount: number;
  todayRealizedPnL: number;
  todayFloatingPnL?: number;
}): RiskEvaluationResult {
  const {
    initialBalance,
    currentEquity,
    openTradesCount,
    todayRealizedPnL,
    todayFloatingPnL = 0,
  } = params;

  const baseBalance = initialBalance > 0 ? initialBalance : 300;
  const tier = calculateCopyTradingTier(baseBalance);

  // 1. Check Max Lifetime Drawdown (15%)
  const totalDrawdownUsd = baseBalance - currentEquity;
  const totalDrawdownPercent = (totalDrawdownUsd / baseBalance) * 100;

  if (totalDrawdownPercent >= tier.maxDDLimitPercent || currentEquity <= tier.cutoffEquity) {
    return {
      allowed: false,
      copiedLots: 0,
      statusAction: "DISCONNECT",
      reason: `Account reached Max Drawdown limit of 15% (Loss: $${totalDrawdownUsd.toFixed(2)} / ${totalDrawdownPercent.toFixed(1)}%). Removed from copy trading.`,
      tier,
    };
  }

  // 2. Check Daily Drawdown (5%)
  // Daily loss is negative PnL (realized today + floating today)
  const totalTodayPnL = todayRealizedPnL + todayFloatingPnL;
  const todayLossUsd = totalTodayPnL < 0 ? Math.abs(totalTodayPnL) : 0;
  const todayLossPercent = (todayLossUsd / baseBalance) * 100;

  if (todayLossPercent >= tier.dailyDDLimitPercent || todayLossUsd >= tier.dailyDDLimitUsd) {
    return {
      allowed: false,
      copiedLots: 0,
      statusAction: "DAILY_LOCK",
      reason: `Daily 5% Drawdown limit reached (Loss today: -$${todayLossUsd.toFixed(2)}). Trading paused for today, resumes tomorrow.`,
      tier,
    };
  }

  // 3. Check Max Open Trades (strictly <= 2)
  if (openTradesCount >= tier.maxOpenTrades) {
    return {
      allowed: false,
      copiedLots: 0,
      statusAction: "SKIP_MAX_TRADES",
      reason: `Account already has ${openTradesCount} active open trades (Max allowed: 2).`,
      tier,
    };
  }

  // All rules passed: Allocate fixed lot size
  return {
    allowed: true,
    copiedLots: tier.lotPerTrade,
    tier,
  };
}
