"use client";

import { useState } from "react";
import {
  Calendar,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Send,
  Loader2,
  Search,
  Filter,
  Clock,
  Sparkles,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  syncForexFactoryAction,
  importForexFactoryJsonAction,
  saveManualNewsEventAction,
  deleteNewsEventAction,
  clearAllNewsEventsAction,
} from "@/server/actions/economic-news.actions";
import { createAdminAnnouncementAction } from "@/server/actions/notifications.actions";
import type { EconomicNewsFeedData, EconomicNewsEvent, NewsImpact } from "@/types/economic-news";

interface AdminEconomicNewsManagerProps {
  initialFeed: EconomicNewsFeedData;
}

const FF_THIS_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const FF_NEXT_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_nextweek.json";

export function AdminEconomicNewsManager({ initialFeed }: AdminEconomicNewsManagerProps) {
  const router = useRouter();
  const [feed, setFeed] = useState<EconomicNewsFeedData>(initialFeed);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualJson, setManualJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Manual Event Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualCountry, setManualCountry] = useState("USD");
  const [manualImpact, setManualImpact] = useState<NewsImpact>("High");
  const [manualForecast, setManualForecast] = useState("");
  const [manualPrevious, setManualPrevious] = useState("");
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // Broadcast Form State
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastUrgency, setBroadcastUrgency] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Table Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [impactFilter, setImpactFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  // 1-Click Forex Factory Auto-Sync
  const handleAutoSync = async (includeNextWeek: boolean = false) => {
    setIsSyncing(true);
    try {
      const res = await syncForexFactoryAction(includeNextWeek);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync with Forex Factory.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual JSON Import
  const handleImportJson = async () => {
    if (!manualJson.trim()) {
      toast.error("Please paste the JSON text into the box first.");
      return;
    }
    setIsImporting(true);
    try {
      const res = await importForexFactoryJsonAction(manualJson);
      if (res.success) {
        toast.success(res.message);
        setManualJson("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import JSON.");
    } finally {
      setIsImporting(false);
    }
  };

  // Add Manual Custom Event
  const handleAddManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualDate) {
      toast.error("Please fill in event title and date.");
      return;
    }

    setIsAddingEvent(true);
    try {
      const res = await saveManualNewsEventAction({
        title: manualTitle.trim(),
        country: manualCountry.trim().toUpperCase(),
        date: manualDate,
        impact: manualImpact,
        forecast: manualForecast.trim(),
        previous: manualPrevious.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setManualTitle("");
        setManualForecast("");
        setManualPrevious("");
        setShowAddForm(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add event.");
    } finally {
      setIsAddingEvent(false);
    }
  };

  // Broadcast Announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please enter a title and message.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await createAdminAnnouncementAction({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: "NEWS_ALERT",
        urgency: broadcastUrgency,
        linkUrl: "/dashboard/journal",
      });
      if (res.success) {
        toast.success(res.message);
        setBroadcastTitle("");
        setBroadcastMessage("");
        setShowBroadcastForm(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Delete Single Event
  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await deleteNewsEventAction(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event.");
    }
  };

  // Clear All Events
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL economic news events?")) return;
    try {
      const res = await clearAllNewsEventsAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to clear events.");
    }
  };

  // Filtered Events
  const filteredEvents = feed.events.filter((ev) => {
    if (impactFilter !== "ALL" && ev.impact !== impactFilter) return false;
    if (currencyFilter !== "ALL" && ev.country !== currencyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.country.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const highImpactCount = feed.events.filter((e) => e.impact === "High").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Forex Factory Economic News Manager
              <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-black text-red-500">
                {highImpactCount} High Impact Events
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sync this week's Forex Factory calendar to publish real-time economic releases, NFP, CPI, and central bank speeches to all student trading journals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAutoSync(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-black shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> 🔄 Sync This Week
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleAutoSync(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-accent px-3 py-2 text-xs font-bold text-foreground transition-all disabled:opacity-50 cursor-pointer"
            >
              📅 + Next Week
            </button>

            <button
              type="button"
              onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 border border-red-500/30 hover:bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition-all cursor-pointer"
            >
              📢 Broadcast Alert
            </button>
          </div>
        </div>

        {feed.lastSyncedAt && (
          <div className="rounded-xl bg-muted/30 border border-border/50 px-3 py-2 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>
              Last Synced: <strong className="text-foreground">{feed.lastSyncedAt}</strong> by{" "}
              <strong className="text-foreground">{feed.syncedBy || "Admin"}</strong>
            </span>
            <span>
              Total Events in Database: <strong className="text-foreground">{feed.events.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Broadcast Alert to Students Form (Collapsible) */}
      {showBroadcastForm && (
        <div className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-card to-card p-6 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-500" />
              Broadcast Instant Notification to All Students
            </h3>
            <button
              type="button"
              onClick={() => setShowBroadcastForm(false)}
              className="text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3 max-w-2xl">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Notification Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 🔴 High Impact Alert: US CPI Tonight at 6:00 PM IST!"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Message / Warning Details
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Severe volatility expected across XAUUSD, EURUSD. Manage your risk, avoid aggressive entries!"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Urgency:</span>
                <div className="flex gap-1">
                  {(["HIGH", "MEDIUM", "LOW"] as const).map((urg) => (
                    <button
                      key={urg}
                      type="button"
                      onClick={() => setBroadcastUrgency(urg)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                        broadcastUrgency === urg
                          ? urg === "HIGH"
                            ? "bg-red-500 text-white"
                            : urg === "MEDIUM"
                            ? "bg-amber-500 text-black"
                            : "bg-emerald-500 text-white"
                          : "bg-card border border-border text-muted-foreground"
                      }`}
                    >
                      {urg}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-xs font-black shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Push Alert Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Sync Fallback (Matching index.html exactly) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-black">
            💡
          </span>
          <h3 className="text-sm font-black text-foreground">
            Manual Sync Fallback (100% Reliable If Auto-Sync Fails)
          </h3>
        </div>

        <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
          <li>
            Open the feed directly in a new tab:{" "}
            <a
              href={FF_THIS_WEEK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Open Forex Factory Calendar JSON <ExternalLink className="h-3 w-3" />
            </a>{" "}
            or{" "}
            <a
              href={FF_NEXT_WEEK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Next Week JSON <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            Press <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">Ctrl + A</code> then{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">Ctrl + C</code> on that page to copy the entire JSON text.
          </li>
          <li>Paste it into the text box below and click the Import button.</li>
        </ol>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <textarea
            rows={2}
            placeholder='Paste JSON text here (e.g. [{ "title": "Prelim UoM Inflation Expectations", "country": "USD", ... }])'
            value={manualJson}
            onChange={(e) => setManualJson(e.target.value)}
            className="flex-1 rounded-xl border border-input bg-background p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleImportJson}
            disabled={isImporting || !manualJson.trim()}
            className="self-stretch sm:self-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-black text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> 📥 Import Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Custom Event Creation (Collapsible) */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add Manual Custom Event (Special Speech, Bank Holiday, RBI Rate, etc.)
          </span>
          <span className="text-muted-foreground">{showAddForm ? "▲ Collapse" : "▼ Expand"}</span>
        </button>

        {showAddForm && (
          <form onSubmit={handleAddManualEvent} className="space-y-4 pt-4 mt-3 border-t border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US Non-Farm Payrolls / Fed Chair Powell Speech"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Date &amp; Time (Local / IST) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Currency *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USD, EUR, GBP, INR, ALL"
                  value={manualCountry}
                  onChange={(e) => setManualCountry(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold uppercase text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Impact Level
                </label>
                <div className="flex gap-2">
                  {(["High", "Medium", "Low", "Holiday"] as const).map((imp) => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => setManualImpact(imp)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                        manualImpact === imp
                          ? imp === "High"
                            ? "bg-red-500 text-white shadow-sm"
                            : imp === "Medium"
                            ? "bg-amber-500 text-black shadow-sm"
                            : imp === "Low"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-sky-500 text-white shadow-sm"
                          : "bg-muted/40 text-muted-foreground border border-border"
                      }`}
                    >
                      {imp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Forecast (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 185K / 3.2%"
                  value={manualForecast}
                  onChange={(e) => setManualForecast(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Previous (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 175K / 3.4%"
                  value={manualPrevious}
                  onChange={(e) => setManualPrevious(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAddingEvent}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isAddingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Save Event to Calendar
            </button>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search event title or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-60 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <select
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Impacts</option>
              <option value="High">🔴 High Impact</option>
              <option value="Medium">🟡 Medium Impact</option>
              <option value="Low">🟢 Low Impact</option>
              <option value="Holiday">🏖️ Holiday</option>
            </select>

            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="CHF">CHF</option>
              <option value="NZD">NZD</option>
              <option value="CNY">CNY</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing {filteredEvents.length} of {feed.events.length} events
            </span>

            {feed.events.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-destructive hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-bold text-foreground">No events found in database</p>
            <p className="text-[11px] text-muted-foreground">
              Click "🔄 Sync This Week" to load the latest events from Forex Factory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date &amp; Time (IST)</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Impact</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Forecast</th>
                  <th className="px-4 py-3 font-medium">Previous</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEvents.map((ev) => {
                  const evDate = new Date(ev.date);
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
                    <tr key={ev.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-foreground">{istTimeStr}</p>
                        <p className="text-[10px] text-muted-foreground">{istDateStr}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-black text-foreground bg-muted px-2 py-0.5 rounded text-xs">
                          {ev.country}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{ev.title}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-foreground">
                        {ev.forecast || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground">
                        {ev.previous || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {ev.source === "ff" ? "Forex Factory" : "Manual"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, ev.title)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Delete event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
