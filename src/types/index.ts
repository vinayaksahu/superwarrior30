export type ActionState<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SortDirection = "asc" | "desc";

export type SortParams = {
  sortBy: string;
  sortDirection: SortDirection;
};

export interface LiveTradeProofInput {
  title: string;
  instrument: string;
  market?: string;
  tradeDirection: "BUY" | "SELL";
  sessionType?: string;
  youtubeUrl?: string;
  screenshotUrl: string;
  slPips: number;
  gainPips: number;
  riskRewardRatio?: string;
  status?: "PROFIT_BOOKED" | "RUNNING_PROFIT" | "BREAKEVEN";
  profitAmount?: string;
  notes?: string;
  showOnHome?: boolean;
  showOnLanding?: boolean;
  showOnDashboard?: boolean;
  isFeatured?: boolean;
  tradedAt?: string | Date;
}

export interface CreateTradeInput {
  instrument: string;
  market?: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  lotSize?: number;
  riskAmount?: number;
  pnl?: number;
  status?: "OPEN" | "CLOSED" | "CANCELLED";
  outcome?: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING";
  riskRewardRatio?: string;
  setupReason?: string;
  emotions?: string;
  mistakes?: string;
  notes?: string;
  screenshotUrl?: string;
  tradedAt?: string;
}


