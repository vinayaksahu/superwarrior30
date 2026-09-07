"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  CheckSquare,
  BarChart3,
  Calendar,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PsychologyEntry,
  PsychologyMood,
  StudentPsychologyData,
} from "@/types/psychology";
import {
  createPsychologyLogAction,
  deletePsychologyLogAction,
} from "@/server/actions/psychology.actions";

interface PsychologyLogViewProps {
  initialData: StudentPsychologyData;
}

const PRE_TRADE_CHECKLIST_ITEMS = [
  "Calm — no emotional pressure",
  "LL rule remembered — stop after 2 losses",
  "Daily drawdown check done",
  "No revenge feeling from last trade",
  "News events checked (NFP, FOMC, CPI)",
  "HTF structure confirmed — direction clear",
  "Risk max $3, RRR min 1:3 — confirmed",
  "Distractions off (social media closed)",
];

const MOODS: { key: PsychologyMood; label: string; emoji: string; color: string; activeClass: string }[] = [
  {
    key: "GREAT",
    label: "Great",
    emoji: "🤩",
    color: "emerald",
    activeClass: "border-emerald-500 bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/30",
  },
  {
    key: "NEUTRAL",
    label: "Neutral",
    emoji: "😐",
    color: "amber",
    activeClass: "border-amber-500 bg-amber-500/15 text-amber-400 ring-2 ring-amber-500/30",
  },
  {
    key: "STRESSED",
    label: "Stressed",
    emoji: "😰",
    color: "rose",
    activeClass: "border-rose-500 bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/30",
  },
  {
    key: "DOWN",
    label: "Down",
    emoji: "😢",
    color: "sky",
    activeClass: "border-sky-500 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/30",
  },
];

export function PsychologyLogView({ initialData }: PsychologyLogViewProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<StudentPsychologyData>(initialData);

  // Form State
  const now = new Date();
  const todayFormatted = now.toISOString().split("T")[0];
  const timeFormatted = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const [date, setDate] = useState(todayFormatted);
  const [time, setTime] = useState(timeFormatted);
  const [mood, setMood] = useState<PsychologyMood>("NEUTRAL");
  const [confidence, setConfidence] = useState<number>(7);
  const [stress, setStress] = useState<number>(3);
  const [discipline, setDiscipline] = useState<number>(8);
  const [notes, setNotes] = useState("");
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  // Toggle checklist item
  const toggleChecklistItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSaveEntry = () => {
    startTransition(async () => {
      try {
        const res = await createPsychologyLogAction({
          date,
          time,
          mood,
          confidence,
          stress,
          discipline,
          notes,
          checklist: checkedItems,
          checklistScore: checkedItems.length,
        });

        if (res.success && res.entry) {
          toast.success("🧠 Psychology log saved successfully!");

          // Recalculate local state
          setData((prev) => {
            const newEntries = [res.entry!, ...prev.entries];
            const total = newEntries.length;
            const sumConf = newEntries.reduce((acc, curr) => acc + curr.confidence, 0);
            const sumStress = newEntries.reduce((acc, curr) => acc + curr.stress, 0);
            const sumDisc = newEntries.reduce((acc, curr) => acc + curr.discipline, 0);

            const moodDist = { GREAT: 0, NEUTRAL: 0, STRESSED: 0, DOWN: 0 };
            newEntries.forEach((e) => {
              if (moodDist[e.mood] !== undefined) moodDist[e.mood]++;
            });

            return {
              entries: newEntries,
              averages: {
                avgConfidence: Math.round((sumConf / total) * 10) / 10,
                avgStress: Math.round((sumStress / total) * 10) / 10,
                avgDiscipline: Math.round((sumDisc / total) * 10) / 10,
                totalEntries: total,
                moodDistribution: moodDist,
              },
            };
          });

          // Reset form to fresh defaults
          setNotes("");
          setCheckedItems([]);
          const freshNow = new Date();
          setTime(
            freshNow.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          );
        } else {
          toast.error(res.error || "Failed to save log entry");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error saving entry");
      }
    });
  };

  const handleDeleteEntry = (id: string) => {
    if (!confirm("Are you sure you want to delete this psychology log?")) return;

    startTransition(async () => {
      try {
        const res = await deletePsychologyLogAction(id);
        if (res.success) {
          toast.success("Log entry deleted");
          setData((prev) => {
            const newEntries = prev.entries.filter((e) => e.id !== id);
            const total = newEntries.length;
            if (total === 0) {
              return {
                entries: [],
                averages: {
                  avgConfidence: 0,
                  avgStress: 0,
                  avgDiscipline: 0,
                  totalEntries: 0,
                  moodDistribution: { GREAT: 0, NEUTRAL: 0, STRESSED: 0, DOWN: 0 },
                },
              };
            }
            const sumConf = newEntries.reduce((acc, curr) => acc + curr.confidence, 0);
            const sumStress = newEntries.reduce((acc, curr) => acc + curr.stress, 0);
            const sumDisc = newEntries.reduce((acc, curr) => acc + curr.discipline, 0);

            const moodDist = { GREAT: 0, NEUTRAL: 0, STRESSED: 0, DOWN: 0 };
            newEntries.forEach((e) => {
              if (moodDist[e.mood] !== undefined) moodDist[e.mood]++;
            });

            return {
              entries: newEntries,
              averages: {
                avgConfidence: Math.round((sumConf / total) * 10) / 10,
                avgStress: Math.round((sumStress / total) * 10) / 10,
                avgDiscipline: Math.round((sumDisc / total) * 10) / 10,
                totalEntries: total,
                moodDistribution: moodDist,
              },
            };
          });
        } else {
          toast.error(res.error || "Failed to delete log");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error deleting log");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
            🧠
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Psychology Log
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitor your emotional discipline, stress levels, and pre-trade rules execution.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: 📝 New Entry */}
        {/* ========================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <span>📝</span>
              <span>New Entry</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {data.averages.totalEntries} total logged
            </span>
          </div>

          {/* DATE & TIME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                DATE
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                TIME
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 03:26 AM"
                className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* MOOD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              MOOD
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOODS.map((m) => {
                const isActive = mood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMood(m.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-black transition-all cursor-pointer ${
                      isActive
                        ? m.activeClass
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLIDERS */}
          <div className="space-y-4 pt-1">
            {/* Confidence Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Confidence</span>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500">
                  {confidence}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Stress Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Stress</span>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500">
                  {stress}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={stress}
                onChange={(e) => setStress(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Discipline Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Discipline</span>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500">
                  {discipline}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={discipline}
                onChange={(e) => setDiscipline(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* NOTES */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              NOTES
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today? Any observations..."
              className="w-full rounded-2xl border border-border bg-muted/40 p-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all resize-none"
            />
          </div>

          {/* SAVE BUTTON */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveEntry}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 py-3 text-xs font-black text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Entry...</span>
              </>
            ) : (
              <>
                <span>🧠</span>
                <span>Save Entry</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 📊 Averages & ✅ Pre-Trade Checklist */}
        {/* ========================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-6 flex flex-col justify-between">
          {/* Top Section: Averages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <span>📊</span>
                <span>Averages</span>
              </h3>
              {data.averages.totalEntries > 0 && (
                <span className="text-[11px] font-bold text-amber-500">
                  Based on {data.averages.totalEntries} sessions
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* AVG CONFIDENCE */}
              <div className="rounded-2xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                  AVG CONFIDENCE
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                  {data.averages.totalEntries > 0 ? `${data.averages.avgConfidence}` : "—"}
                </p>
                <div className="w-full h-1 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${data.averages.totalEntries > 0 ? data.averages.avgConfidence * 10 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* AVG STRESS */}
              <div className="rounded-2xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                  AVG STRESS
                </p>
                <p className="text-xl sm:text-2xl font-black text-rose-400 mt-2">
                  {data.averages.totalEntries > 0 ? `${data.averages.avgStress}` : "—"}
                </p>
                <div className="w-full h-1 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${data.averages.totalEntries > 0 ? data.averages.avgStress * 10 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* AVG DISCIPLINE */}
              <div className="rounded-2xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                  AVG DISCIPLINE
                </p>
                <p className="text-xl sm:text-2xl font-black text-amber-400 mt-2">
                  {data.averages.totalEntries > 0 ? `${data.averages.avgDiscipline}` : "—"}
                </p>
                <div className="w-full h-1 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${data.averages.totalEntries > 0 ? data.averages.avgDiscipline * 10 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Pre-Trade Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="text-emerald-500">✅</span>
                <span>Pre-Trade Checklist</span>
              </h3>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                  checkedItems.length === PRE_TRADE_CHECKLIST_ITEMS.length
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {checkedItems.length} / {PRE_TRADE_CHECKLIST_ITEMS.length} complete
              </span>
            </div>

            <div className="space-y-2">
              {PRE_TRADE_CHECKLIST_ITEMS.map((item, idx) => {
                const isChecked = checkedItems.includes(item);
                return (
                  <label
                    key={idx}
                    onClick={() => toggleChecklistItem(item)}
                    className={`flex items-start gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                        : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-border bg-card text-emerald-500 focus:ring-emerald-500/30 accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold select-none leading-relaxed">
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Mark before taking any real trade</span>
              {checkedItems.length === PRE_TRADE_CHECKLIST_ITEMS.length && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All rules checked! Safe to trade.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM SECTION: 📜 Past Psychology Log History */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <span>📜</span>
              <span>Psychology History &amp; Observations</span>
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {data.entries.length} Entries
            </span>
          </div>
        </div>

        {data.entries.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted/30 mx-auto flex items-center justify-center text-2xl">
              🧘
            </div>
            <h4 className="text-sm font-bold text-foreground">No psychology logs yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start building professional trading discipline by logging your mindset, stress levels,
              and pre-trade checklist above before your trades.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3">Mood</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Stress</th>
                  <th className="py-3 px-3">Discipline</th>
                  <th className="py-3 px-3">Checklist</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.entries.map((entry) => {
                  const moodObj = MOODS.find((m) => m.key === entry.mood) || MOODS[1];
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-foreground">{entry.date}</div>
                        <div className="text-[11px] text-muted-foreground">{entry.time}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${moodObj.activeClass}`}
                        >
                          <span>{moodObj.emoji}</span>
                          <span>{moodObj.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-emerald-400">{entry.confidence}</span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-rose-400">{entry.stress}</span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-amber-400">{entry.discipline}</span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                            entry.checklistScore === 8
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {entry.checklistScore}/8 Rules
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        {entry.notes ? (
                          <p className="line-clamp-2 text-foreground/90 text-xs italic">
                            &quot;{entry.notes}&quot;
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">No notes</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
