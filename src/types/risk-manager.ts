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

export const DEFAULT_ACADEMY_RISK_RULES: AcademyRiskRules = {
  maxConsecutiveLosses: 2,
  maxTradesPerDay: 3,
  minRiskRewardRatio: 3,
  defaultRiskPercent: 4,
  defaultMaxDailyLoss: 6,
  defaultMaxWeeklyLoss: 15,
  revengeBreakMinutes: 15,
  llRuleTitle: "LL Rule",
  llRuleText: "2 consecutive losses → stop trading for the day. No exceptions.",
  noRevengeTitle: "No Revenge",
  noRevengeText: "15 min mandatory break after a loss. Trade only when neutral.",
  maxRiskTitle: "Max Risk",
  maxRiskText: "Max risk per trade (4%). Min 1:3 RRR.",
};

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
