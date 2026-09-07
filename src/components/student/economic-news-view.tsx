"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Filter,
  Flame,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Info,
  TrendingUp,
} from "lucide-react";
import type { EconomicNewsEvent, EconomicNewsFeedData, NewsImpact } from "@/types/economic-news";

interface EconomicNewsViewProps {
  feedData: EconomicNewsFeedData;
}

export function EconomicNewsView({ feedData }: EconomicNewsViewProps) {
  const [impactFilter, setImpactFilter] = useState<Record<NewsImpact, boolean>>({
    High: true,
    Medium: true,
    Low: true,
    Holiday: true,
  });
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [hidePassed, setHidePassed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const nowMs = Date.now();

  const toggleImpact = (impact: NewsImpact) => {
    setImpactFilter((prev) => ({
      ...prev,
      [impact]: !prev[impact],
    }));
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return feedData.events.filter((ev) => {
      // 1. Impact filter
      if (!impactFilter[ev.impact]) return false;

      // 2. Currency filter
      if (selectedCurrency !== "ALL" && ev.country !== selectedCurrency) {
        return false;
      }

      // 3. Hide passed filter
      const evTime = new Date(ev.date).getTime();
      if (hidePassed && evTime < nowMs - 15 * 60 * 1000) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.country.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [feedData.events, impactFilter, selectedCurrency, hidePassed, searchQuery, nowMs]);

  // Check if any High Impact event is upcoming in next 3 hours
  const upcomingHighImpact = useMemo(() => {
    return feedData.events.find((ev) => {
      if (ev.impact !== "High") return false;
      const evTime = new Date(ev.date).getTime();
      const diffMs = evTime - nowMs;
      // Between -15 minutes (just started) and +3 hours
      return diffMs >= -15 * 60 * 1000 && diffMs <= 3 * 60 * 60 * 1000;
    });
  }, [feedData.events, nowMs]);

  const highImpactCount = feedData.events.filter((e) => e.impact === "High").length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* High-Impact Warning Banner (matching index.html newsWarnBanner) */}
      {upcomingHighImpact && (
        <div className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-600/20 via-card to-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-red-500/5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white font-black text-xl shadow">
              ⚠️
            </span>
            <div>
              <p className="text-xs sm:text-sm font-black text-red-400 uppercase tracking-wide">
                High Impact News Incoming &mdash; Extreme Volatility Expected!
              </p>
              <p className="text-xs text-foreground font-semibold mt-0.5">
                {upcomingHighImpact.country} &bull; {upcomingHighImpact.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Mentor Advice: Tighten stop losses or avoid opening aggressive new entries around high-tier economic releases!
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-right">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Release Time (IST)
            </span>
            <span className="text-xs font-black text-red-400">
              {new Date(upcomingHighImpact.date).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                Economic News &amp; High Impact Calendar
                <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-black text-red-500">
                  {highImpactCount} High Impact
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Forex Factory synced global economic news, interest rate releases, and NFP/CPI reports in Indian Standard Time (IST).
              </p>
            </div>
          </div>

          {feedData.lastSyncedAt && (
            <div className="text-[11px] text-muted-foreground sm:text-right flex items-center sm:block gap-1">
              <span>Last Updated:</span>{" "}
              <strong className="text-foreground">{feedData.lastSyncedAt}</strong>
            </div>
          )}
        </div>

        {/* Filter Controls Bar (Matching index.html Filter Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Impact:
            </span>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => toggleImpact("High")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  impactFilter.High
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                🔴 High
              </button>
              <button
                type="button"
                onClick={() => toggleImpact("Medium")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  impactFilter.Medium
                    ? "bg-amber-500 text-black shadow-sm"
                    : "bg-card border border-border text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                🟡 Medium
              </button>
              <button
                type="button"
                onClick={() => toggleImpact("Low")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  impactFilter.Low
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                🟢 Low
              </button>
              <button
                type="button"
                onClick={() => toggleImpact("Holiday")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  impactFilter.Holiday
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                🏖️ Holiday
              </button>
            </div>

            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="CHF">CHF (Fr)</option>
              <option value="NZD">NZD (NZ$)</option>
              <option value="CNY">CNY (¥)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search event title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-36 sm:w-48 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hidePassed}
                onChange={(e) => setHidePassed(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
              Hide passed
            </label>
          </div>
        </div>
      </div>

      {/* Events Table / List */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-bold text-foreground">No events found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              No economic news events match your filter criteria. Try unchecking "Hide passed" or enabling all impacts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Time (IST)</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Impact</th>
                  <th className="px-4 py-3 font-medium">Event / Release</th>
                  <th className="px-4 py-3 font-medium">Forecast</th>
                  <th className="px-4 py-3 font-medium">Previous</th>
                  <th className="px-4 py-3 text-right font-medium">Timing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEvents.map((ev) => {
                  const evDate = new Date(ev.date);
                  const diffMinutes = Math.round((evDate.getTime() - nowMs) / 60000);
                  const isPassed = diffMinutes < -15;
                  const isNow = diffMinutes >= -15 && diffMinutes <= 15;
                  const isUpcomingSoon = diffMinutes > 15 && diffMinutes <= 180;

                  // Format IST Time
                  const istDateStr = evDate.toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  const istTimeStr = evDate.toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-muted/10 transition-colors ${
                        isNow
                          ? "bg-red-500/10 font-bold"
                          : isUpcomingSoon && ev.impact === "High"
                          ? "bg-amber-500/5"
                          : isPassed
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      {/* Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-foreground">{istTimeStr}</p>
                        <p className="text-[10px] text-muted-foreground">{istDateStr}</p>
                      </td>

                      {/* Currency */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono font-black text-foreground text-xs">
                          {ev.country}
                        </span>
                      </td>

                      {/* Impact */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            ev.impact === "High"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : ev.impact === "Medium"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : ev.impact === "Low"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                          }`}
                        >
                          {ev.impact === "High" && "🔴"}
                          {ev.impact === "Medium" && "🟡"}
                          {ev.impact === "Low" && "🟢"}
                          {ev.impact === "Holiday" && "🏖️"}
                          {ev.impact}
                        </span>
                      </td>

                      {/* Event Title */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground text-xs">{ev.title}</p>
                        {ev.source === "manual" && (
                          <span className="text-[9px] text-primary font-semibold">
                            (Mentor Custom Event)
                          </span>
                        )}
                      </td>

                      {/* Forecast */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-foreground font-bold">
                          {ev.forecast || "—"}
                        </span>
                      </td>

                      {/* Previous */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-muted-foreground">
                          {ev.previous || "—"}
                        </span>
                      </td>

                      {/* Timing Status */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isNow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 text-white px-2 py-0.5 text-[10px] font-black animate-pulse">
                            🔴 LIVE NOW
                          </span>
                        ) : isUpcomingSoon ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <Clock className="h-3 w-3" />
                            In {Math.round(diffMinutes)}m
                          </span>
                        ) : isPassed ? (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Passed
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {diffMinutes > 1440
                              ? `In ${Math.round(diffMinutes / 1440)}d`
                              : `In ${Math.round(diffMinutes / 60)}h`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
