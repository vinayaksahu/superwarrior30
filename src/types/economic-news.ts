export type NewsImpact = "High" | "Medium" | "Low" | "Holiday";

export interface EconomicNewsEvent {
  id: string;
  title: string;
  country: string;
  date: string; // ISO string with timezone
  impact: NewsImpact;
  forecast?: string;
  previous?: string;
  source: "ff" | "manual";
  createdAt: string;
}

export interface EconomicNewsFeedData {
  lastSyncedAt: string | null;
  lastSyncedMs: number | null;
  syncedBy: string | null;
  events: EconomicNewsEvent[];
}

export interface StudentNotificationItem {
  id: string;
  title: string;
  message: string;
  type: "NEWS_ALERT" | "ADMIN_UPDATE" | "SYSTEM";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  linkUrl?: string;
  expiresAt?: string;
}
