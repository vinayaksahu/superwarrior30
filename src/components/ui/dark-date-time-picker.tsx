"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

interface DarkDateTimePickerProps {
  value: string; // ISO or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DarkDateTimePicker({
  value,
  onChange,
  error,
  label = "Scheduled Date & Time",
  required = true,
}: DarkDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date
  const parsedDate = value ? new Date(value) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getMonth());

  // Hours in 12h format
  const rawHours = validDate.getHours();
  const isPM = rawHours >= 12;
  const current12Hour = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const currentMinute = validDate.getMinutes();

  const [selectedDay, setSelectedDay] = useState(validDate.getDate());
  const [selectedHour, setSelectedHour] = useState(current12Hour);
  const [selectedMinute, setSelectedMinute] = useState(currentMinute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(isPM ? "PM" : "AM");

  // Keep state synced when value prop changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDay(d.getDate());
        const h = d.getHours();
        setSelectedHour(h % 12 === 0 ? 12 : h % 12);
        setSelectedMinute(d.getMinutes());
        setSelectedPeriod(h >= 12 ? "PM" : "AM");
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Helper to emit updated date
  const emitChange = (
    year: number,
    month: number,
    day: number,
    hour12: number,
    minute: number,
    period: "AM" | "PM"
  ) => {
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour24)}:${pad(minute)}`;
    onChange(formatted);
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    emitChange(viewYear, viewMonth, day, selectedHour, selectedMinute, selectedPeriod);
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    emitChange(viewYear, viewMonth, selectedDay, hour, selectedMinute, selectedPeriod);
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    emitChange(viewYear, viewMonth, selectedDay, selectedHour, minute, selectedPeriod);
  };

  const handlePeriodChange = (period: "AM" | "PM") => {
    setSelectedPeriod(period);
    emitChange(viewYear, viewMonth, selectedDay, selectedHour, selectedMinute, period);
  };

  // Quick preset handlers
  const setTodayEvening = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
    setSelectedHour(8);
    setSelectedMinute(0);
    setSelectedPeriod("PM");
    emitChange(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, "PM");
  };

  const setTomorrowEvening = () => {
    const tomorrow = new Date(Date.now() + 86400000);
    setViewYear(tomorrow.getFullYear());
    setViewMonth(tomorrow.getMonth());
    setSelectedDay(tomorrow.getDate());
    setSelectedHour(8);
    setSelectedMinute(0);
    setSelectedPeriod("PM");
    emitChange(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0, "PM");
  };

  // Formatted display text
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedDisplay = value
    ? `${validDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })} at ${selectedHour}:${pad(selectedMinute)} ${selectedPeriod}`
    : "Select date & time";

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-foreground mb-1.5">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      {/* Trigger Button styled like luxury input */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-xl border bg-neutral-950/80 px-4 py-2.5 text-sm text-foreground transition-all cursor-pointer shadow-inner ${
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20"
            : error
            ? "border-destructive ring-1 ring-destructive"
            : "border-border hover:border-neutral-600 hover:bg-neutral-900/60"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <span className="font-medium text-foreground truncate">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
          <Clock className="h-3 w-3" />
          <span>
            {selectedHour}:{pad(selectedMinute)} {selectedPeriod}
          </span>
        </div>
      </button>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full sm:w-[380px] rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Quick Presets */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-800/80">
            <button
              type="button"
              onClick={setTodayEvening}
              className="flex-1 text-[11px] font-semibold py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              Today 8:00 PM
            </button>
            <button
              type="button"
              onClick={setTomorrowEvening}
              className="flex-1 text-[11px] font-semibold py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              Tomorrow 8:00 PM
            </button>
          </div>

          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-xs font-bold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-bold text-neutral-500 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-4">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                selectedDay === dayNum &&
                viewMonth === validDate.getMonth() &&
                viewYear === validDate.getFullYear();

              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-full rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center relative ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow-md shadow-amber-500/25 scale-105"
                      : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Select Time
              </span>

              {/* AM / PM Toggle */}
              <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-950 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handlePeriodChange("AM")}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedPeriod === "AM"
                      ? "bg-amber-500 text-black font-bold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange("PM")}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedPeriod === "PM"
                      ? "bg-amber-500 text-black font-bold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Hour & Minute Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-neutral-400 mb-1">Hour</label>
                <select
                  value={selectedHour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {pad(h)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-neutral-400 mb-1">Minute</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>
                      {pad(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-xs font-bold text-black shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Set Schedule Date & Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
