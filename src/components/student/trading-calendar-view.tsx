"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  X,
  Plus,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Check,
} from "lucide-react";

import type { Trade } from "./trading-journal-client";

interface TradingCalendarViewProps {
  trades: Trade[];
  onOpenLogTrade?: (dateStr?: string) => void;
  onOpenEditTrade?: (trade: Trade) => void;
  onViewScreenshot?: (url: string) => void;
}

interface DayAggregate {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  trades: Trade[];
  totalPnL: number;
  wins: number;
  losses: number;
  breakevens: number;
  openCount: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function TradingCalendarView({
  trades,
  onOpenLogTrade,
  onOpenEditTrade,
  onViewScreenshot,
}: TradingCalendarViewProps) {
  // Calendar viewed Month and Year
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0 - 11

  // Handle month navigation
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleCurrentMonth = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Group trades by date string "YYYY-MM-DD"
  const tradesByDate = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const trade of trades) {
      const d = new Date(trade.tradedAt);
      if (isNaN(d.getTime())) continue;
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      const key = `${yr}-${mo}-${da}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(trade);
    }
    return map;
  }, [trades]);

  // Compute 7x5 or 7x6 calendar grid days
  const calendarDays = useMemo(() => {
    const days: DayAggregate[] = [];

    // First day of current view month
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Sunday is 0, Monday is 1 ... Sunday is 7 in Monday-first
    const startDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
    const mondayBasedOffset = (startDayOfWeek + 6) % 7; // Mon: 0, Tue: 1 ... Sun: 6

    // Total days in current month
    const lastDayCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Total days in previous month
    const lastDayPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // 1. Previous month trailing days
    for (let i = mondayBasedOffset - 1; i >= 0; i--) {
      const dayNum = lastDayPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayTrades = tradesByDate.get(dateStr) || [];

      let totalPnL = 0;
      let wins = 0;
      let losses = 0;
      let breakevens = 0;
      let openCount = 0;

      for (const t of dayTrades) {
        if (typeof t.pnl === "number") totalPnL += t.pnl;
        if (t.outcome === "WIN") wins++;
        else if (t.outcome === "LOSS") losses++;
        else if (t.outcome === "BREAKEVEN") breakevens++;
        if (t.status === "OPEN") openCount++;
      }

      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        trades: dayTrades,
        totalPnL,
        wins,
        losses,
        breakevens,
        openCount,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= lastDayCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTrades = tradesByDate.get(dateStr) || [];

      let totalPnL = 0;
      let wins = 0;
      let losses = 0;
      let breakevens = 0;
      let openCount = 0;

      for (const t of dayTrades) {
        if (typeof t.pnl === "number") totalPnL += t.pnl;
        if (t.outcome === "WIN") wins++;
        else if (t.outcome === "LOSS") losses++;
        else if (t.outcome === "BREAKEVEN") breakevens++;
        if (t.status === "OPEN") openCount++;
      }

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        trades: dayTrades,
        totalPnL,
        wins,
        losses,
        breakevens,
        openCount,
      });
    }

    // 3. Next month leading days to complete grid (multiples of 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    // Always aim for at least 35 days (5 full rows)
    const targetLength = days.length + remainingDays < 35 ? 35 : days.length + remainingDays;
    const daysToAdd = targetLength - days.length;

    for (let i = 1; i <= daysToAdd; i++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayTrades = tradesByDate.get(dateStr) || [];

      let totalPnL = 0;
      let wins = 0;
      let losses = 0;
      let breakevens = 0;
      let openCount = 0;

      for (const t of dayTrades) {
        if (typeof t.pnl === "number") totalPnL += t.pnl;
        if (t.outcome === "WIN") wins++;
        else if (t.outcome === "LOSS") losses++;
        else if (t.outcome === "BREAKEVEN") breakevens++;
        if (t.status === "OPEN") openCount++;
      }

      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        trades: dayTrades,
        totalPnL,
        wins,
        losses,
        breakevens,
        openCount,
      });
    }

    return days;
  }, [viewYear, viewMonth, tradesByDate]);

  // Compute Monthly aggregate metrics
  const monthStats = useMemo(() => {
    let monthPnL = 0;
    let monthTrades = 0;
    let monthWins = 0;
    let monthLosses = 0;
    let greenDays = 0;
    let redDays = 0;
    let beDays = 0;

    for (const d of calendarDays) {
      if (!d.isCurrentMonth) continue;
      if (d.trades.length > 0) {
        monthPnL += d.totalPnL;
        monthTrades += d.trades.length;
        monthWins += d.wins;
        monthLosses += d.losses;

        if (d.totalPnL > 0) greenDays++;
        else if (d.totalPnL < 0) redDays++;
        else beDays++;
      }
    }

    const closedTrades = monthWins + monthLosses;
    const winRate = closedTrades > 0 ? Math.round((monthWins / closedTrades) * 100) : 0;

    return {
      monthPnL: Math.round(monthPnL * 100) / 100,
      monthTrades,
      monthWins,
      monthLosses,
      winRate,
      greenDays,
      redDays,
      beDays,
    };
  }, [calendarDays]);

  return (
    <div className="space-y-4">
      {/* Title matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
          <span>🗓️</span>
          <span>Monthly Trading Calendar</span>
        </h2>

        {/* Quick Month Metrics Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-xl border border-border bg-card px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Month Net P&L:</span>
            <span
              className={`font-mono font-black ${
                monthStats.monthPnL > 0
                  ? "text-emerald-400"
                  : monthStats.monthPnL < 0
                  ? "text-rose-400"
                  : "text-muted-foreground"
              }`}
            >
              {monthStats.monthPnL > 0
                ? `+$${monthStats.monthPnL.toFixed(2)}`
                : monthStats.monthPnL < 0
                ? `-$${Math.abs(monthStats.monthPnL).toFixed(2)}`
                : "$0.00"}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Win Rate:</span>
            <span className="font-bold text-primary">{monthStats.winRate}%</span>
            <span className="text-[10px] text-muted-foreground">
              ({monthStats.monthWins}W / {monthStats.monthLosses}L)
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Day Split:</span>
            <span className="font-bold text-emerald-400">{monthStats.greenDays}🟢</span>
            <span className="font-bold text-rose-400">{monthStats.redDays}🔴</span>
            {monthStats.beDays > 0 && <span className="font-bold text-muted-foreground">{monthStats.beDays}⚪</span>}
          </div>
        </div>
      </div>

      {/* Main Calendar Card matching uploaded screenshot */}
      <div className="rounded-2xl border border-border/80 bg-card/95 p-4 md:p-6 shadow-2xl space-y-4">
        {/* Navigation Bar matching screenshot */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Prev, Month Year, Next */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-base md:text-lg font-black text-foreground tracking-tight min-w-[160px] text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Current Month Button with warm orange/amber highlight */}
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-black" />
            <span>Current Month</span>
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] md:text-xs font-black uppercase tracking-wider text-muted-foreground/80 py-1">
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} className="py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day, idx) => {
            const hasTrades = day.trades.length > 0;
            const isProfit = day.totalPnL > 0;
            const isLoss = day.totalPnL < 0;

            // Day Box styling based on trade outcome and status
            let cellBg = "bg-muted/10 border-border/40 hover:border-border";
            let pnlColor = "text-muted-foreground";

            if (!day.isCurrentMonth) {
              cellBg = "bg-muted/5 border-border/20 opacity-35";
            } else if (hasTrades) {
              if (isProfit) {
                cellBg =
                  "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/30";
                pnlColor = "text-emerald-400";
              } else if (isLoss) {
                cellBg = "bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30";
                pnlColor = "text-rose-400";
              } else {
                cellBg = "bg-muted/25 border-border hover:border-muted-foreground";
                pnlColor = "text-foreground";
              }
            } else if (day.isToday) {
              cellBg = "bg-primary/5 border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
            }

            return (
              <div
                key={`${day.dateStr}-${idx}`}
                onClick={() => setSelectedDay(day)}
                className={`group relative flex flex-col justify-between min-h-[75px] sm:min-h-[90px] md:min-h-[105px] p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none ${cellBg} ${
                  day.isToday ? "ring-1.5 ring-blue-500/80 border-blue-500/90" : ""
                }`}
              >
                {/* Top Row: Day Number & Today indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs sm:text-sm font-black ${
                      day.isToday
                        ? "text-blue-400 font-black"
                        : day.isCurrentMonth
                        ? "text-foreground/90"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {day.dayNum}
                  </span>

                  {day.isToday && (
                    <span className="hidden sm:inline-block rounded-full bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.2 text-[9px] font-black text-blue-400">
                      TODAY
                    </span>
                  )}

                  {hasTrades && (
                    <span className="text-[10px] font-mono font-bold text-muted-foreground sm:hidden">
                      {day.trades.length}t
                    </span>
                  )}
                </div>

                {/* Center / Body: P&L Display */}
                <div className="my-auto py-1 text-center">
                  {hasTrades ? (
                    <div className="space-y-0.5">
                      <div className={`font-mono font-black text-xs sm:text-sm md:text-base tracking-tight ${pnlColor}`}>
                        {isProfit
                          ? `+$${day.totalPnL.toFixed(2)}`
                          : isLoss
                          ? `-$${Math.abs(day.totalPnL).toFixed(2)}`
                          : "$0.00"}
                      </div>
                      <div className="hidden sm:flex items-center justify-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <span>{day.trades.length} {day.trades.length === 1 ? "Trade" : "Trades"}</span>
                        <span>({day.wins}W / {day.losses}L)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/30 font-mono select-none">-</div>
                  )}
                </div>

                {/* Bottom subtle bar / hover hint */}
                <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasTrades ? "View" : "+ Log"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Dialog / Slide-in Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base md:text-lg font-black text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>Trades on {selectedDay.dateStr}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDay.trades.length} {selectedDay.trades.length === 1 ? "trade recorded" : "trades recorded"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedDay.trades.length > 0 && (
                  <div
                    className={`rounded-xl px-3 py-1 font-mono font-black text-sm border ${
                      selectedDay.totalPnL > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : selectedDay.totalPnL < 0
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-muted/40 text-muted-foreground border-border"
                    }`}
                  >
                    Day P&L:{" "}
                    {selectedDay.totalPnL > 0
                      ? `+$${selectedDay.totalPnL.toFixed(2)}`
                      : selectedDay.totalPnL < 0
                      ? `-$${Math.abs(selectedDay.totalPnL).toFixed(2)}`
                      : "$0.00"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Trade List for Selected Date */}
            {selectedDay.trades.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 border border-border text-muted-foreground text-xl">
                  📝
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">No trades recorded on this date.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click below to log a new trade for {selectedDay.dateStr}.
                  </p>
                </div>
                {onOpenLogTrade && (
                  <button
                    type="button"
                    onClick={() => {
                      const dateToPass = selectedDay.dateStr;
                      setSelectedDay(null);
                      onOpenLogTrade(dateToPass);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-black shadow-md cursor-pointer hover:bg-primary/90 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Log Trade on {selectedDay.dateStr}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDay.trades.map((t, idx) => {
                  const isWin = t.outcome === "WIN";
                  const isLoss = t.outcome === "LOSS";

                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-border/80 bg-muted/15 p-3.5 space-y-2 hover:border-border transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="font-black text-sm text-foreground">{t.instrument}</span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                              t.direction === "BUY"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {t.direction === "BUY" ? "Long" : "Short"}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                            {t.market}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-black text-sm ${
                              t.pnl && t.pnl > 0
                                ? "text-emerald-400"
                                : t.pnl && t.pnl < 0
                                ? "text-rose-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {t.pnl !== null
                              ? t.pnl > 0
                                ? `+$${t.pnl.toFixed(2)}`
                                : t.pnl < 0
                                ? `-$${Math.abs(t.pnl).toFixed(2)}`
                                : "$0.00"
                              : "—"}
                          </span>

                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-black border ${
                              isWin
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : isLoss
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {t.outcome}
                          </span>
                        </div>
                      </div>

                      {/* Trade Details Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Entry / Exit</span>
                          <span className="font-mono text-foreground">
                            {t.entryPrice} → {t.exitPrice ?? "Open"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">SL / TP</span>
                          <span className="font-mono text-foreground">
                            <span className="text-rose-400">{t.stopLoss}</span> /{" "}
                            <span className="text-emerald-400">{t.takeProfit}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">RRR / Lot</span>
                          <span className="font-mono text-amber-400 font-bold">
                            {t.riskRewardRatio || "1:1"} ({t.lotSize ?? "0.01"})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Setup</span>
                          <span className="text-foreground font-semibold truncate block">
                            {t.setupReason || "Standard"}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Mistakes / Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-[11px] text-muted-foreground truncate max-w-[350px]">
                          {t.mistakes && t.mistakes !== "NONE" && (
                            <span className="text-rose-400 font-bold mr-2">⚠️ {t.mistakes}</span>
                          )}
                          {t.notes && <span>{t.notes}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {t.screenshotUrl && onViewScreenshot && (
                            <button
                              type="button"
                              onClick={() => onViewScreenshot(t.screenshotUrl!)}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer"
                              title="View Chart"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onOpenEditTrade && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDay(null);
                                onOpenEditTrade(t);
                              }}
                              className="p-1 text-sky-400 hover:text-white hover:bg-sky-500 rounded-md cursor-pointer transition-colors"
                              title="Edit Trade"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Another Trade on this Day */}
                {onOpenLogTrade && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const dateToPass = selectedDay.dateStr;
                        setSelectedDay(null);
                        onOpenLogTrade(dateToPass);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Log another trade on {selectedDay.dateStr}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
