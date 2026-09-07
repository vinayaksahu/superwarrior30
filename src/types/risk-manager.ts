export interface AcademyRiskRules {
  maxConsecutiveLosses: number; // e.g. 2 (2 trade loss trade close)
  maxTradesPerDay: number;      // e.g. 3 (max 3 trade per day)
  minRiskRewardRatio: number;   // e.g. 3 (Min 1:3 RRR)
  defaultRiskPercent: number;   // e.g. 4 (4% per trade)
  defaultMaxDailyLoss: number;  // e.g. 6 ($ or %)
  defaultMaxWeeklyLoss: number; // e.g. 15 ($ or %)
  revengeBreakMinutes: number;  // e.g. 15 (15 min mandatory break after a loss)
  llRuleTitle: string;
  llRuleText: string;
  noRevengeTitle: string;
  noRevengeText: string;
  maxRiskTitle: string;
  maxRiskText: string;
}

export interface StudentRiskProfile {
  accountBalance: number;
  riskPerTradePercent: number;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
}

export type RiskStatusLevel = "SAFE" | "WARNING" | "BREACHED";

export interface CalculatedRiskState {
  riskPerTradeDollars: number;
  maxTradesPerDay: number;
  dailyBuffer: number;
  usedToday: number;
  remainingRisk: number;
  tradesTakenToday: number;
  consecutiveLossesToday: number;
  isLLRuleBreached: boolean;
  isMaxTradesBreached: boolean;
  status: RiskStatusLevel;
  statusMessage: string;
}

export interface StudentRiskData {
  rules: AcademyRiskRules;
  profile: StudentRiskProfile;
  calculated: CalculatedRiskState;
}
