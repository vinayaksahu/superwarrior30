"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Brain,
  Scale,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  MessageSquare,
  Sparkles,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  X,
  Edit2,
  Calculator,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { createTradeEntryAction, updateTradeEntryAction } from "@/server/actions/journal.actions";
import { EconomicNewsView } from "@/components/student/economic-news-view";
import type { EconomicNewsFeedData } from "@/types/economic-news";
import { BookMarked } from "lucide-react";

// ==========================================
// INSTRUMENT CONFIGURATIONS & PIP SIZES
// ==========================================
interface InstrumentConfig {
  pipSize: number;
  pipValuePerLot: number;
  market: string;
  defaultLot: number;
}

const INSTRUMENT_CONFIGS: Record<string, InstrumentConfig> = {
  XAUUSD: { pipSize: 0.01, pipValuePerLot: 1.0, market: "GOLD", defaultLot: 0.01 },
  GOLD: { pipSize: 0.01, pipValuePerLot: 1.0, market: "GOLD", defaultLot: 0.01 },
  EURUSD: { pipSize: 0.0001, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 },
  GBPUSD: { pipSize: 0.0001, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 },
  USDJPY: { pipSize: 0.01, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 },
  AUDUSD: { pipSize: 0.0001, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 },
  USDCAD: { pipSize: 0.0001, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 },
  BTCUSD: { pipSize: 0.01, pipValuePerLot: 0.01, market: "CRYPTO", defaultLot: 0.01 },
  BTCUSDT: { pipSize: 0.01, pipValuePerLot: 0.01, market: "CRYPTO", defaultLot: 0.01 },
  ETHUSD: { pipSize: 0.01, pipValuePerLot: 0.01, market: "CRYPTO", defaultLot: 0.01 },
  US30: { pipSize: 1.0, pipValuePerLot: 1.0, market: "STOCKS", defaultLot: 0.01 },
  NAS100: { pipSize: 0.1, pipValuePerLot: 0.1, market: "STOCKS", defaultLot: 0.01 },
  SPX500: { pipSize: 0.1, pipValuePerLot: 0.1, market: "STOCKS", defaultLot: 0.01 },
  NIFTY50: { pipSize: 1.0, pipValuePerLot: 1.0, market: "STOCKS", defaultLot: 25 },
  BANKNIFTY: { pipSize: 1.0, pipValuePerLot: 1.0, market: "STOCKS", defaultLot: 15 },
};

function getInstrumentConfig(pair: string): InstrumentConfig {
  const clean = (pair || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (INSTRUMENT_CONFIGS[clean]) return INSTRUMENT_CONFIGS[clean];
  if (clean.includes("XAU") || clean.includes("GOLD")) return INSTRUMENT_CONFIGS.XAUUSD;
  if (clean.includes("BTC")) return INSTRUMENT_CONFIGS.BTCUSD;
  if (clean.includes("ETH")) return INSTRUMENT_CONFIGS.ETHUSD;
  if (clean.includes("JPY")) return INSTRUMENT_CONFIGS.USDJPY;
  if (clean.includes("NIFTY")) return INSTRUMENT_CONFIGS.NIFTY50;
  if (clean.length === 6) return { pipSize: 0.0001, pipValuePerLot: 10.0, market: "FOREX", defaultLot: 0.01 };
  return { pipSize: 0.01, pipValuePerLot: 1.0, market: "FOREX", defaultLot: 0.01 };
}

function detectSessionFromTime(timeStr?: string): "London" | "New York" | "Asia" | "Ldn-NY" {
  let hour = new Date().getHours();
  if (timeStr && timeStr.includes(":")) {
    const parsed = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(parsed)) hour = parsed;
  }
  // Standard IST Forex trading hours
  if (hour >= 5 && hour < 13) return "Asia";
  if (hour >= 13 && hour < 17) return "London";
  if (hour >= 17 && hour < 21) return "Ldn-NY";
  return "New York";
}

function getSessionBadge(session: string): { label: string; icon: string; bg: string; text: string; border: string } {
  switch (session) {
    case "London":
      return { label: "London", icon: "🇬🇧", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
    case "New York":
      return { label: "New York", icon: "🇺🇸", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" };
    case "Asia":
      return { label: "Asia", icon: "🌏", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    case "Ldn-NY":
      return { label: "Ldn-NY", icon: "⚡", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" };
    default:
      return { label: session || "General", icon: "🌐", bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  }
}

function getCurrentLocalDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentLocalTime(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatCleanNumber(val: number): string {
  if (isNaN(val)) return "";
  return parseFloat(val.toFixed(5)).toString();
}

interface Trade {
  id: string;
  instrument: string;
  market: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  lotSize: number | null;
  riskAmount: number | null;
  pnl: number | null;
  status: string;
  outcome: string;
  riskRewardRatio: string | null;
  setupReason: string | null;
  emotions: string | null;
  mistakes: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  mentorFeedback: string | null;
  isFeatured?: boolean;
  tradedAt: Date;
}

interface JournalStats {
  totalTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnL: number;
  disciplineScore: number;
}

interface TradingJournalClientProps {
  initialTrades: Trade[];
  stats: JournalStats | null;
  initialEconomicFeed?: EconomicNewsFeedData;
}

export function TradingJournalClient({
  initialTrades,
  stats,
  initialEconomicFeed,
}: TradingJournalClientProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [activeSection, setActiveSection] = useState<"TRADES" | "NEWS">("TRADES");
  const [filter, setFilter] = useState<string>("ALL");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Quick Instrument Pills State
  const [pairList, setPairList] = useState<string[]>([
    "XAUUSD",
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "BTCUSD",
  ]);
  const [newPairInput, setNewPairInput] = useState<string>("");

  // Student Edit trade state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editFormData, setEditFormData] = useState({
    instrument: "XAUUSD",
    market: "GOLD",
    direction: "BUY" as "BUY" | "SELL",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    tpRrr: "3",
    lotSize: "0.01",
    pipValue: "1",
    accountBalance: "100",
    pnl: "",
    status: "CLOSED" as "OPEN" | "CLOSED",
    outcome: "WIN" as "WIN" | "LOSS" | "BREAKEVEN" | "PENDING",
    session: "London" as "London" | "New York" | "Asia" | "Ldn-NY",
    autoSession: true,
    tradeDate: getCurrentLocalDate(),
    tradeTime: getCurrentLocalTime(),
    emotions: "CALM",
    mistakes: "NONE",
    setupReason: "",
    notes: "",
    screenshotUrl: "",
  });

  // New trade form state
  const [formData, setFormData] = useState({
    instrument: "XAUUSD",
    market: "GOLD",
    direction: "BUY" as "BUY" | "SELL",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    tpRrr: "3",
    lotSize: "0.01",
    pipValue: "1",
    accountBalance: "100",
    pnl: "",
    status: "CLOSED" as "OPEN" | "CLOSED",
    outcome: "WIN" as "WIN" | "LOSS" | "BREAKEVEN" | "PENDING",
    session: detectSessionFromTime(getCurrentLocalTime()) as "London" | "New York" | "Asia" | "Ldn-NY",
    autoSession: true,
    tradeDate: getCurrentLocalDate(),
    tradeTime: getCurrentLocalTime(),
    emotions: "CALM",
    mistakes: "NONE",
    setupReason: "",
    notes: "",
    screenshotUrl: "",
  });

  // Calculate live execution and risk metrics for a trade form
  const calculateLiveMetrics = (data: typeof formData | typeof editFormData) => {
    const entry = parseFloat(data.entryPrice);
    const sl = parseFloat(data.stopLoss);
    const target = parseFloat(data.takeProfit);
    const close = parseFloat(data.exitPrice);
    const lot = parseFloat(data.lotSize) || 0.01;
    const bal = parseFloat(data.accountBalance) || 100;
    const config = getInstrumentConfig(data.instrument);
    const pv = parseFloat(data.pipValue) || config.pipValuePerLot;

    const hasEntryAndSl = !isNaN(entry) && !isNaN(sl) && entry > 0 && sl > 0;
    const riskDiff = hasEntryAndSl ? Math.abs(entry - sl) : 0;
    const riskPips = hasEntryAndSl && config.pipSize > 0 ? riskDiff / config.pipSize : 0;
    const riskUSD = riskPips * pv * lot;

    const hasTarget = !isNaN(target) && target > 0;
    const rewardDiff = hasEntryAndSl && hasTarget ? Math.abs(target - entry) : 0;
    const rewardPips = hasEntryAndSl && hasTarget && config.pipSize > 0 ? rewardDiff / config.pipSize : 0;
    const rewardUSD = rewardPips * pv * lot;

    const rrrVal = riskPips > 0 && rewardPips > 0 ? rewardPips / riskPips : (parseFloat(data.tpRrr) || 3);
    const riskPct = bal > 0 ? (riskUSD / bal) * 100 : 0;

    // Recommended lot size for 4% max risk
    const maxRiskAllowed = bal * 0.04;
    const recLot = riskPips > 0 && pv > 0 ? maxRiskAllowed / (riskPips * pv) : 0.01;

    // Achieved PnL from Close Price
    let hasClose = false;
    let closePnl = 0;
    if (hasEntryAndSl && !isNaN(close) && close > 0) {
      hasClose = true;
      const isBuy = data.direction === "BUY" || (sl < entry);
      const diff = isBuy ? (close - entry) : (entry - close);
      const pips = diff / config.pipSize;
      closePnl = parseFloat((pips * pv * lot).toFixed(2));
    }

    return {
      hasEntryAndSl,
      riskPips,
      riskUSD,
      hasTarget,
      rewardPips,
      rewardUSD,
      rrrVal,
      riskPct,
      recLot,
      hasClose,
      closePnl,
      config,
    };
  };

  // Smart two-way recalculation handler for form inputs
  const handlePriceFieldChange = (
    field: "entry" | "sl" | "tpRrr" | "target" | "close" | "lot" | "bal" | "pipVal",
    val: string,
    isEdit: boolean = false
  ) => {
    const updater = isEdit ? setEditFormData : setFormData;

    updater((prev) => {
      const next = { ...prev };

      if (field === "entry") next.entryPrice = val;
      if (field === "sl") next.stopLoss = val;
      if (field === "tpRrr") next.tpRrr = val;
      if (field === "target") next.takeProfit = val;
      if (field === "close") next.exitPrice = val;
      if (field === "lot") next.lotSize = val;
      if (field === "bal") next.accountBalance = val;
      if (field === "pipVal") next.pipValue = val;

      const entry = parseFloat(next.entryPrice);
      const sl = parseFloat(next.stopLoss);
      const config = getInstrumentConfig(next.instrument);
      const pv = parseFloat(next.pipValue) || config.pipValuePerLot;
      const lot = parseFloat(next.lotSize) || 0.01;

      // 1. If Open Price and Stop Loss are both present, auto-determine Direction
      if (!isNaN(entry) && !isNaN(sl) && entry > 0 && sl > 0) {
        const autoDirection: "BUY" | "SELL" = sl < entry ? "BUY" : "SELL";
        next.direction = autoDirection;

        const riskDiff = Math.abs(entry - sl);

        // 2. Dual-Sync: TP (RRR) vs Target Price
        if (field === "tpRrr") {
          const rrr = parseFloat(val);
          if (!isNaN(rrr) && rrr > 0) {
            const target = autoDirection === "BUY" ? entry + riskDiff * rrr : entry - riskDiff * rrr;
            next.takeProfit = formatCleanNumber(target);
          }
        } else if (field === "target") {
          const target = parseFloat(val);
          if (!isNaN(target) && riskDiff > 0) {
            const rrr = Math.abs(target - entry) / riskDiff;
            next.tpRrr = formatCleanNumber(rrr);
          }
        } else if (field === "entry" || field === "sl") {
          // Keep existing RRR or default 3 and update Target Price
          const rrr = parseFloat(next.tpRrr) || 3;
          if (riskDiff > 0) {
            const target = autoDirection === "BUY" ? entry + riskDiff * rrr : entry - riskDiff * rrr;
            next.takeProfit = formatCleanNumber(target);
          }
        }

        // 3. Auto Close Price PnL & Outcome
        const close = parseFloat(next.exitPrice);
        if (!isNaN(close) && close > 0) {
          const isBuy = autoDirection === "BUY";
          const diff = isBuy ? close - entry : entry - close;
          const pips = diff / config.pipSize;
          const pnlVal = parseFloat((pips * pv * lot).toFixed(2));
          next.pnl = pnlVal.toFixed(2);
          if (pnlVal > 0.05) next.outcome = "WIN";
          else if (pnlVal < -0.05) next.outcome = "LOSS";
          else next.outcome = "BREAKEVEN";
        }
      }

      return next;
    });
  };

  // Quick Result Click: Auto-fills Close Price and recalculates PnL
  const handleQuickResultClick = (
    result: "WIN" | "LOSS" | "BREAKEVEN",
    isEdit: boolean = false
  ) => {
    const updater = isEdit ? setEditFormData : setFormData;
    updater((prev) => {
      const next = { ...prev, outcome: result };
      const entry = parseFloat(next.entryPrice);
      const sl = parseFloat(next.stopLoss);
      const target = parseFloat(next.takeProfit);
      const config = getInstrumentConfig(next.instrument);
      const pv = parseFloat(next.pipValue) || config.pipValuePerLot;
      const lot = parseFloat(next.lotSize) || 0.01;

      if (!isNaN(entry)) {
        if (result === "WIN") {
          const closeVal = !isNaN(target) && target > 0 ? target : entry;
          next.exitPrice = formatCleanNumber(closeVal);
        } else if (result === "LOSS") {
          const closeVal = !isNaN(sl) && sl > 0 ? sl : entry;
          next.exitPrice = formatCleanNumber(closeVal);
        } else {
          next.exitPrice = formatCleanNumber(entry);
        }

        const close = parseFloat(next.exitPrice);
        if (!isNaN(close)) {
          const isBuy = next.direction === "BUY";
          const diff = isBuy ? close - entry : entry - close;
          const pips = diff / config.pipSize;
          next.pnl = (pips * pv * lot).toFixed(2);
        }
      }

      return next;
    });
  };

  // Quick Pair Selection
  const handleSelectPair = (pair: string, isEdit: boolean = false) => {
    const config = getInstrumentConfig(pair);
    const updater = isEdit ? setEditFormData : setFormData;
    updater((prev) => ({
      ...prev,
      instrument: pair,
      market: config.market,
      pipValue: String(config.pipValuePerLot),
    }));
  };

  // Add Custom Pair
  const handleAddCustomPair = () => {
    const clean = newPairInput.trim().toUpperCase();
    if (!clean) return;
    if (!pairList.includes(clean)) {
      setPairList((prev) => [...prev, clean]);
    }
    handleSelectPair(clean, false);
    setNewPairInput("");
    toast.success(`Instrument "${clean}" selected!`);
  };

  // Sync to Current Local Time & Auto Session
  const handleSyncToNow = (isEdit: boolean = false) => {
    const nowTime = getCurrentLocalTime();
    const nowDate = getCurrentLocalDate();
    const autoSess = detectSessionFromTime(nowTime);

    const updater = isEdit ? setEditFormData : setFormData;
    updater((prev) => ({
      ...prev,
      tradeDate: nowDate,
      tradeTime: nowTime,
      session: prev.autoSession ? autoSess : prev.session,
    }));
    toast.success("⏱️ Date, Time & Session synced to current local time!");
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Screenshot size must be under 15MB");
      return;
    }

    setUploadingScreenshot(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("category", "journal");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.success && (json.url || json.cdnUrl)) {
        const url = json.url || json.cdnUrl;
        if (isEdit) {
          setEditFormData((prev) => ({ ...prev, screenshotUrl: url }));
        } else {
          setFormData((prev) => ({ ...prev, screenshotUrl: url }));
        }
        toast.success("Chart screenshot uploaded successfully!");
      } else {
        toast.error(json.error || "Failed to upload chart screenshot");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Network error while uploading screenshot");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instrument || !formData.entryPrice || !formData.stopLoss || !formData.takeProfit) {
      toast.error("Please fill required fields (Pair, Entry, Stop Loss, Target).");
      return;
    }

    startTransition(async () => {
      const sessionNote = `[Session: ${formData.session}]`;
      const combinedNotes = formData.notes ? `${sessionNote} ${formData.notes}` : sessionNote;
      const tradeDateTimeIso = formData.tradeDate && formData.tradeTime
        ? new Date(`${formData.tradeDate}T${formData.tradeTime}:00`).toISOString()
        : new Date().toISOString();

      const calculatedRR = formData.tpRrr ? `1:${parseFloat(formData.tpRrr).toFixed(2)}` : undefined;

      const res = await createTradeEntryAction({
        instrument: formData.instrument,
        market: formData.market,
        direction: formData.direction,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit: parseFloat(formData.takeProfit),
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : undefined,
        pnl: formData.pnl ? parseFloat(formData.pnl) : undefined,
        status: formData.status,
        outcome: formData.outcome,
        riskRewardRatio: calculatedRR,
        emotions: formData.emotions,
        mistakes: formData.mistakes,
        setupReason: formData.setupReason,
        notes: combinedNotes,
        screenshotUrl: formData.screenshotUrl || undefined,
        tradedAt: tradeDateTimeIso,
      });

      if (res.success) {
        toast.success(res.message);
        setShowModal(false);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleOpenEdit = (trade: Trade) => {
    setEditingTrade(trade);
    const dObj = new Date(trade.tradedAt);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, "0");
    const d = String(dObj.getDate()).padStart(2, "0");
    const hh = String(dObj.getHours()).padStart(2, "0");
    const mm = String(dObj.getMinutes()).padStart(2, "0");

    let existingSession: "London" | "New York" | "Asia" | "Ldn-NY" = detectSessionFromTime(`${hh}:${mm}`);
    let cleanNotes = trade.notes || "";
    if (cleanNotes.includes("[Session:")) {
      const match = cleanNotes.match(/\[Session:\s*([^\]]+)\]/);
      if (match && match[1]) {
        existingSession = match[1].trim() as any;
        cleanNotes = cleanNotes.replace(/\[Session:\s*[^\]]+\]/, "").trim();
      }
    }

    const entryNum = trade.entryPrice;
    const slNum = trade.stopLoss;
    const tpNum = trade.takeProfit;
    const riskDiff = Math.abs(entryNum - slNum);
    const rewardDiff = Math.abs(tpNum - entryNum);
    const calculatedRrr = riskDiff > 0 ? (rewardDiff / riskDiff).toFixed(2) : "3";
    const cfg = getInstrumentConfig(trade.instrument);

    setEditFormData({
      instrument: trade.instrument,
      market: trade.market,
      direction: (trade.direction as "BUY" | "SELL") || (slNum < entryNum ? "BUY" : "SELL"),
      entryPrice: String(trade.entryPrice),
      exitPrice: trade.exitPrice !== null ? String(trade.exitPrice) : "",
      stopLoss: String(trade.stopLoss),
      takeProfit: String(trade.takeProfit),
      tpRrr: calculatedRrr,
      lotSize: trade.lotSize !== null ? String(trade.lotSize) : "0.01",
      pipValue: String(cfg.pipValuePerLot),
      accountBalance: "100",
      pnl: trade.pnl !== null ? String(trade.pnl) : "",
      status: (trade.status as "OPEN" | "CLOSED") || "CLOSED",
      outcome: (trade.outcome as any) || "WIN",
      session: existingSession,
      autoSession: false,
      tradeDate: `${y}-${m}-${d}`,
      tradeTime: `${hh}:${mm}`,
      emotions: trade.emotions || "CALM",
      mistakes: trade.mistakes || "NONE",
      setupReason: trade.setupReason || "",
      notes: cleanNotes,
      screenshotUrl: trade.screenshotUrl || "",
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade) return;
    if (!editFormData.instrument || !editFormData.entryPrice || !editFormData.stopLoss || !editFormData.takeProfit) {
      toast.error("Please fill required fields (Pair, Entry, Stop Loss, Target).");
      return;
    }

    startTransition(async () => {
      const sessionNote = `[Session: ${editFormData.session}]`;
      const combinedNotes = editFormData.notes ? `${sessionNote} ${editFormData.notes}` : sessionNote;
      const tradeDateTimeIso = editFormData.tradeDate && editFormData.tradeTime
        ? new Date(`${editFormData.tradeDate}T${editFormData.tradeTime}:00`).toISOString()
        : new Date().toISOString();

      const calculatedRR = editFormData.tpRrr ? `1:${parseFloat(editFormData.tpRrr).toFixed(2)}` : undefined;

      const res = await updateTradeEntryAction(editingTrade.id, {
        instrument: editFormData.instrument,
        market: editFormData.market,
        direction: editFormData.direction,
        entryPrice: parseFloat(editFormData.entryPrice),
        exitPrice: editFormData.exitPrice ? parseFloat(editFormData.exitPrice) : undefined,
        stopLoss: parseFloat(editFormData.stopLoss),
        takeProfit: parseFloat(editFormData.takeProfit),
        lotSize: editFormData.lotSize ? parseFloat(editFormData.lotSize) : undefined,
        pnl: editFormData.pnl ? parseFloat(editFormData.pnl) : undefined,
        status: editFormData.status,
        outcome: editFormData.outcome,
        riskRewardRatio: calculatedRR,
        emotions: editFormData.emotions,
        mistakes: editFormData.mistakes,
        setupReason: editFormData.setupReason,
        notes: combinedNotes,
        screenshotUrl: editFormData.screenshotUrl || undefined,
        tradedAt: tradeDateTimeIso,
      });

      if (res.success) {
        toast.success(res.message);
        setTrades((prev) =>
          prev.map((t) =>
            t.id === editingTrade.id
              ? {
                  ...t,
                  instrument: editFormData.instrument.toUpperCase().trim(),
                  market: editFormData.market,
                  direction: editFormData.direction,
                  entryPrice: parseFloat(editFormData.entryPrice),
                  exitPrice: editFormData.exitPrice ? parseFloat(editFormData.exitPrice) : null,
                  stopLoss: parseFloat(editFormData.stopLoss),
                  takeProfit: parseFloat(editFormData.takeProfit),
                  lotSize: editFormData.lotSize ? parseFloat(editFormData.lotSize) : null,
                  pnl: editFormData.pnl ? parseFloat(editFormData.pnl) : null,
                  riskRewardRatio: calculatedRR || t.riskRewardRatio,
                  status: editFormData.status,
                  outcome: editFormData.outcome,
                  emotions: editFormData.emotions,
                  mistakes: editFormData.mistakes,
                  setupReason: editFormData.setupReason,
                  notes: combinedNotes,
                  screenshotUrl: editFormData.screenshotUrl || null,
                  tradedAt: new Date(tradeDateTimeIso),
                  isFeatured: false,
                }
              : t
          )
        );
        setEditingTrade(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  const highImpactCount =
    initialEconomicFeed?.events.filter((e) => e.impact === "High").length || 0;

  const filteredTrades = trades.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "WINS") return t.outcome === "WIN";
    if (filter === "LOSSES") return t.outcome === "LOSS";
    if (filter === "OPEN") return t.status === "OPEN";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            My Trading Journal &amp; Discipline Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Record every trade, calculate risk:reward, track emotions, and follow real-time economic news.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Log New Trade
        </button>
      </div>

      {/* Top Section Navigation: Trade Log vs Economic News */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("TRADES")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
            activeSection === "TRADES"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <BookMarked className="h-4 w-4" />
          Trade Log &amp; Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("NEWS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
            activeSection === "NEWS"
              ? "bg-red-500 text-white shadow-md shadow-red-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Calendar className="h-4 w-4" />
          📅 Economic News &amp; Calendar
          {highImpactCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeSection === "NEWS" ? "bg-white text-red-600" : "bg-red-500 text-white"
              }`}
            >
              {highImpactCount} High
            </span>
          )}
        </button>
      </div>

      {activeSection === "NEWS" ? (
        <EconomicNewsView
          feedData={
            initialEconomicFeed || {
              lastSyncedAt: null,
              lastSyncedMs: null,
              syncedBy: null,
              events: [],
            }
          }
        />
      ) : (
        <>
          {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-black text-foreground">{stats.totalTrades}</p>
            <p className="text-[10px] text-muted-foreground">{stats.openTrades} Active Open</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-black text-primary">{stats.winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Net P&L</p>
            <p className={`text-2xl font-black ${stats.totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {stats.totalPnL >= 0 ? `+${stats.totalPnL}` : stats.totalPnL}
            </p>
            <p className="text-[10px] text-muted-foreground">Recorded Profit/Loss</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Discipline Score</p>
            <p className="text-2xl font-black text-amber-500">{stats.disciplineScore}%</p>
            <p className="text-[10px] text-muted-foreground">Zero-Emotion Trades</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 col-span-2 sm:col-span-4 lg:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mentor Review</p>
            <div className="flex items-center gap-1.5 pt-1 text-emerald-500 text-xs font-bold">
              <Sparkles className="h-4 w-4" /> Active Mentorship
            </div>
            <p className="text-[10px] text-muted-foreground">Mentor checks your mistakes</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[
          { label: "All Trades", value: "ALL" },
          { label: "Winning Trades (W)", value: "WINS" },
          { label: "Losing Trades (L)", value: "LOSSES" },
          { label: "Open Positions", value: "OPEN" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filter === tab.value
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Pair / Market</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Direction</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Entry / SL / TP</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">R:R Ratio</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Outcome & PnL</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Chart</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Mindset / Emotion</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Mentor Feedback</th>
                <th className="px-4 py-3.5 text-center font-bold text-muted-foreground">Showcase</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground">No trades found in your journal.</p>
                    <p className="text-xs mt-1">Click "Log New Trade" to record your setup, entry, and emotions.</p>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>{t.instrument}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
                            {t.market}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          {(() => {
                            let sessName = "London";
                            if (t.notes && t.notes.includes("[Session:")) {
                              const match = t.notes.match(/\[Session:\s*([^\]]+)\]/);
                              if (match && match[1]) sessName = match[1].trim();
                            } else {
                              sessName = detectSessionFromTime(new Date(t.tradedAt).toTimeString());
                            }
                            const badge = getSessionBadge(sessName);
                            return (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                          <span className="font-mono text-[9px]">
                            {new Date(t.tradedAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          t.direction === "BUY"
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-500 border border-red-500/30"
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      <div>
                        <span className="text-foreground">E: {t.entryPrice}</span>
                        <div className="text-[10px] text-muted-foreground flex gap-2">
                          <span className="text-red-400">SL: {t.stopLoss}</span>
                          <span className="text-emerald-400">TP: {t.takeProfit}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {t.riskRewardRatio || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.outcome === "WIN"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : t.outcome === "LOSS"
                              ? "bg-red-500/15 text-red-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.outcome}
                        </span>
                        {t.pnl !== null && (
                          <p className={`font-mono text-xs font-bold ${t.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {t.pnl >= 0 ? `+${t.pnl}` : t.pnl}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {t.screenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImage(t.screenshotUrl)}
                          className="relative h-11 w-16 rounded-lg overflow-hidden border border-border bg-black/40 group cursor-pointer hover:border-primary transition-all shadow-sm block text-left"
                          title="Click to view chart screenshot"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.screenshotUrl}
                            alt="Chart"
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No image</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-medium text-foreground">{t.emotions || "Calm"}</span>
                        {t.mistakes && t.mistakes !== "NONE" && (
                          <span className="block text-[10px] text-amber-500 font-semibold">⚠️ {t.mistakes}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {t.mentorFeedback ? (
                        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Sparkles className="h-3 w-3" /> Rahul Sir:
                          </div>
                          <p className="text-[11px] text-foreground leading-snug">{t.mentorFeedback}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Pending mentor review</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {t.isFeatured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                          ★ Featured
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] text-muted-foreground">
                          Private
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                        title="Edit trade details"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Log Trade Modal */}
      {showModal && (() => {
        const metrics = calculateLiveMetrics(formData);
        const riskAlertVariant = metrics.riskPct <= 5 ? "safe" : metrics.riskPct <= 8 ? "warn" : "danger";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Log Trade in Journal</h3>
                    <p className="text-[11px] text-muted-foreground">Automatic direction, session & risk calculator</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTrade} className="space-y-4 text-xs">
                {/* 1. Date, Time & Session Bar with Auto Button */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Trade Date & Time</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSyncToNow(false)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                      title="Sync date, time, and session to now"
                    >
                      <span>🤖</span> Auto / Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Open Date</label>
                      <input
                        type="date"
                        value={formData.tradeDate}
                        onChange={(e) => setFormData((p) => ({ ...p, tradeDate: e.target.value }))}
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Open Time</label>
                      <input
                        type="time"
                        value={formData.tradeTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            tradeTime: val,
                            session: p.autoSession ? detectSessionFromTime(val) : p.session,
                          }));
                        }}
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Pair / Instrument with Quick Select Pills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground text-xs">Pair / Instrument *</label>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{formData.market}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {pairList.map((p) => {
                      const isSelected = formData.instrument.toUpperCase() === p.toUpperCase();
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPair(p, false)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm"
                              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      type="text"
                      value={newPairInput}
                      onChange={(e) => setNewPairInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomPair();
                        }
                      }}
                      placeholder="e.g. NIFTY50, BANKNIFTY"
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 uppercase font-mono text-xs focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPair}
                      className="rounded-xl border border-border/80 bg-muted px-3 py-1.5 font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer text-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 3. Session with Auto Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="font-semibold text-foreground text-xs">Session</label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAuto = !formData.autoSession;
                          setFormData((p) => ({
                            ...p,
                            autoSession: nextAuto,
                            session: nextAuto ? detectSessionFromTime(p.tradeTime) : p.session,
                          }));
                          if (!formData.autoSession) {
                            toast.success("🤖 Auto session detection active");
                          }
                        }}
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold transition-all cursor-pointer border ${
                          formData.autoSession
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        🤖 Auto {formData.autoSession ? "ON" : "OFF"}
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Active: <strong className="text-foreground">{formData.session}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "London", label: "🇬🇧 London" },
                      { key: "New York", label: "🇺🇸 New York" },
                      { key: "Asia", label: "🌏 Asia" },
                      { key: "Ldn-NY", label: "⚡ Ldn-NY" },
                    ].map((sess) => {
                      const isSelected = formData.session === sess.key;
                      return (
                        <button
                          key={sess.key}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, session: sess.key as any, autoSession: false }))}
                          className={`rounded-xl py-1.5 px-2 text-center text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm"
                              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {sess.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Direction with Auto-Indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground text-xs">Direction *</label>
                    <span className="text-[10px] text-muted-foreground italic">
                      (Auto-detected from Stop Loss)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, direction: "BUY" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        formData.direction === "BUY"
                          ? "bg-emerald-500 text-white shadow-md border border-emerald-400/50"
                          : "border border-border bg-background text-muted-foreground hover:border-emerald-500/40"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span>▲ BUY / LONG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, direction: "SELL" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        formData.direction === "SELL"
                          ? "bg-red-500 text-white shadow-md border border-red-400/50"
                          : "border border-border bg-background text-muted-foreground hover:border-red-500/40"
                      }`}
                    >
                      <ArrowDownRight className="h-4 w-4" />
                      <span>▼ SELL / SHORT</span>
                    </button>
                  </div>
                </div>

                {/* 5. ⚡ EXECUTION & RISK CALCULATOR CARD (Matching Image 1) */}
                <div className="rounded-2xl border border-amber-500/30 bg-card/95 p-4 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span>Execution & Risk Calculator</span>
                    </div>
                    {metrics.hasEntryAndSl && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        SL Dist: <strong className="text-foreground">{metrics.riskPips.toFixed(1)} pips</strong>
                      </span>
                    )}
                  </div>

                  {/* Dynamic Risk Alert Banner */}
                  {metrics.hasEntryAndSl && (
                    <div
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold border flex items-center gap-1.5 ${
                        riskAlertVariant === "safe"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : riskAlertVariant === "warn"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {riskAlertVariant === "safe" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Risk ${metrics.riskUSD.toFixed(2)} ({metrics.riskPct.toFixed(1)}%) — safe zone.</span>
                        </>
                      ) : riskAlertVariant === "warn" ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Warning: Risk ${metrics.riskUSD.toFixed(2)} ({metrics.riskPct.toFixed(1)}%) is near 5% limit.</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Danger: Risk ${metrics.riskUSD.toFixed(2)} ({metrics.riskPct.toFixed(1)}%) exceeds safety rules!</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Row 1: Balance & Lot Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          Balance ($)
                        </label>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 uppercase">
                          Auto-Sync
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={formData.accountBalance}
                        onChange={(e) => handlePriceFieldChange("bal", e.target.value, false)}
                        placeholder="100.00"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Lot Size
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.lotSize}
                        onChange={(e) => handlePriceFieldChange("lot", e.target.value, false)}
                        placeholder="0.01"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                      <p className="text-[10px] text-muted-foreground truncate">
                        Rec. Lot: <strong className="text-amber-400">{metrics.recLot.toFixed(3)}</strong> (at 4% risk)
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Open Price & Stop Loss */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Open Price *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.entryPrice}
                        onChange={(e) => handlePriceFieldChange("entry", e.target.value, false)}
                        placeholder="e.g. 4415"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-red-400 uppercase">
                        Stop Loss *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.stopLoss}
                        onChange={(e) => handlePriceFieldChange("sl", e.target.value, false)}
                        placeholder="e.g. 4417"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold text-red-400 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: TP (RRR) & Target Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        TP (RRR)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.tpRrr}
                        onChange={(e) => handlePriceFieldChange("tpRrr", e.target.value, false)}
                        placeholder="3"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                        Target Price *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.takeProfit}
                        onChange={(e) => handlePriceFieldChange("target", e.target.value, false)}
                        placeholder="e.g. 4409"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Close Price & Pip Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Close Price (Exit)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.exitPrice}
                        onChange={(e) => handlePriceFieldChange("close", e.target.value, false)}
                        placeholder="e.g. 4405"
                        className="w-full rounded-xl border border-amber-500/50 bg-background px-3 py-2 font-mono text-xs font-bold text-amber-400 focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Pip Value ($/pip)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.pipValue}
                        onChange={(e) => handlePriceFieldChange("pipVal", e.target.value, false)}
                        placeholder="1"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 5: 4-Metrics Display (Matching Image 1) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Risk $</p>
                      <p className="text-sm sm:text-base font-black font-mono text-red-500">
                        {metrics.hasEntryAndSl ? `$${metrics.riskUSD.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {metrics.hasEntryAndSl ? `(${metrics.riskPips.toFixed(1)} pips)` : ""}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Reward $</p>
                      <p className="text-sm sm:text-base font-black font-mono text-emerald-500">
                        {metrics.hasTarget ? `+$${metrics.rewardUSD.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {metrics.hasTarget ? `(${metrics.rewardPips.toFixed(1)} pips)` : ""}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">RRR</p>
                      <p className="text-sm sm:text-base font-black font-mono text-emerald-400">
                        {metrics.hasEntryAndSl ? `1:${metrics.rrrVal.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {metrics.rrrVal >= 3 ? "✓ 1:3 Target" : "Under 1:3"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Risk %</p>
                      <p className="text-sm sm:text-base font-black font-mono text-amber-500">
                        {metrics.hasEntryAndSl ? `${metrics.riskPct.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">of Balance</p>
                    </div>
                  </div>

                  {/* Row 6: Trade Result Selector (Auto-fill Close Price) */}
                  <div className="space-y-1.5 pt-1 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Trade Result
                      </label>
                      {formData.pnl !== "" && (
                        <span className={`text-xs font-mono font-bold ${parseFloat(formData.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          PnL: {parseFloat(formData.pnl) >= 0 ? `+$${formData.pnl}` : `-$${Math.abs(parseFloat(formData.pnl))}`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("WIN", false)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          formData.outcome === "WIN"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ✅ Win
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("LOSS", false)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          formData.outcome === "LOSS"
                            ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ❌ Loss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("BREAKEVEN", false)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          formData.outcome === "BREAKEVEN"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ⚖️ BE
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Emotions & Mistakes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Emotions During Trade</label>
                    <select
                      value={formData.emotions}
                      onChange={(e) => setFormData((p) => ({ ...p, emotions: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="CALM">Calm & Disciplined ✓</option>
                      <option value="FOMO">FOMO (Chased the candle)</option>
                      <option value="REVENGE">Revenge Trade (Anger)</option>
                      <option value="ANXIOUS">Anxious / Scared</option>
                      <option value="GREED">Greedy (Wanted more)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Mistake Tag</label>
                    <select
                      value={formData.mistakes}
                      onChange={(e) => setFormData((p) => ({ ...p, mistakes: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="NONE">No Mistake (Followed Rules) ✓</option>
                      <option value="EARLY_EXIT">Exited Too Early in Profit</option>
                      <option value="MOVED_SL">Moved Stop Loss / Held Loser</option>
                      <option value="OVERTRADING">Overtrading</option>
                      <option value="OVER_LEVERAGED">Too Big Lot Size</option>
                    </select>
                  </div>
                </div>

                {/* 7. Setup Reason & Notes */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Technical Setup Reason & Notes</label>
                  <textarea
                    rows={2}
                    value={formData.setupReason}
                    onChange={(e) => setFormData((p) => ({ ...p, setupReason: e.target.value }))}
                    placeholder="e.g. Liquidity sweep on 15m SNR with rejection candle confirmation"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </div>

                {/* 8. Screenshot Upload */}
                <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span>Chart Screenshot (PNG, JPG, WEBP)</span>
                    </label>
                    {formData.screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, screenshotUrl: "" }))}
                        className="text-[10px] text-destructive hover:underline cursor-pointer font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {formData.screenshotUrl ? (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black/40 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.screenshotUrl}
                        alt="Trade preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1 backdrop-blur-xs">
                        <CheckCircle2 className="h-3 w-3" /> Screenshot Attached
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingScreenshot}
                          onChange={handleFileUpload}
                        />
                        {uploadingScreenshot ? (
                          <div className="flex items-center gap-2 text-primary text-xs font-semibold py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Uploading screenshot to CDN...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-center py-1">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs font-bold text-foreground">Click to upload chart screenshot</span>
                            <span className="text-[10px] text-muted-foreground">PNG, JPG, JPEG, WEBP up to 15MB</span>
                          </div>
                        )}
                      </label>

                      <input
                        type="url"
                        value={formData.screenshotUrl}
                        onChange={(e) => setFormData((p) => ({ ...p, screenshotUrl: e.target.value }))}
                        placeholder="Or paste screenshot URL (TradingView, Lightshot, etc.)"
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || uploadingScreenshot}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Journal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Student Edit Trade Modal */}
      {editingTrade && (() => {
        const editMetrics = calculateLiveMetrics(editFormData);
        const editRiskAlertVariant = editMetrics.riskPct <= 5 ? "safe" : editMetrics.riskPct <= 8 ? "warn" : "danger";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-primary" /> Edit Trade Journal
                  </h3>
                  <p className="text-[11px] text-amber-500 font-medium mt-0.5">
                    ⚠️ Note: Editing a trade resets Showcase status until re-approved by Mentor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                {/* 1. Date, Time & Session Bar */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Trade Date & Time</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSyncToNow(true)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      <span>🤖</span> Auto / Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Open Date</label>
                      <input
                        type="date"
                        value={editFormData.tradeDate}
                        onChange={(e) => setEditFormData((p) => ({ ...p, tradeDate: e.target.value }))}
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">Open Time</label>
                      <input
                        type="time"
                        value={editFormData.tradeTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditFormData((p) => ({
                            ...p,
                            tradeTime: val,
                            session: p.autoSession ? detectSessionFromTime(val) : p.session,
                          }));
                        }}
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Pair / Instrument */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground text-xs">Pair / Instrument *</label>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{editFormData.market}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {pairList.map((p) => {
                      const isSelected = editFormData.instrument.toUpperCase() === p.toUpperCase();
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPair(p, true)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm"
                              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Session */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground text-xs">Session</label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Active: <strong className="text-foreground">{editFormData.session}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "London", label: "🇬🇧 London" },
                      { key: "New York", label: "🇺🇸 New York" },
                      { key: "Asia", label: "🌏 Asia" },
                      { key: "Ldn-NY", label: "⚡ Ldn-NY" },
                    ].map((sess) => {
                      const isSelected = editFormData.session === sess.key;
                      return (
                        <button
                          key={sess.key}
                          type="button"
                          onClick={() => setEditFormData((p) => ({ ...p, session: sess.key as any, autoSession: false }))}
                          className={`rounded-xl py-1.5 px-2 text-center text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm"
                              : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {sess.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Direction */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground text-xs">Direction *</label>
                    <span className="text-[10px] text-muted-foreground italic">
                      (Auto-detected from Stop Loss)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFormData((p) => ({ ...p, direction: "BUY" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        editFormData.direction === "BUY"
                          ? "bg-emerald-500 text-white shadow-md border border-emerald-400/50"
                          : "border border-border bg-background text-muted-foreground hover:border-emerald-500/40"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span>▲ BUY / LONG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData((p) => ({ ...p, direction: "SELL" }))}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        editFormData.direction === "SELL"
                          ? "bg-red-500 text-white shadow-md border border-red-400/50"
                          : "border border-border bg-background text-muted-foreground hover:border-red-500/40"
                      }`}
                    >
                      <ArrowDownRight className="h-4 w-4" />
                      <span>▼ SELL / SHORT</span>
                    </button>
                  </div>
                </div>

                {/* 5. ⚡ EXECUTION & RISK CALCULATOR CARD (Matching Image 1) */}
                <div className="rounded-2xl border border-amber-500/30 bg-card/95 p-4 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span>Execution & Risk Calculator</span>
                    </div>
                    {editMetrics.hasEntryAndSl && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        SL Dist: <strong className="text-foreground">{editMetrics.riskPips.toFixed(1)} pips</strong>
                      </span>
                    )}
                  </div>

                  {/* Dynamic Risk Alert Banner */}
                  {editMetrics.hasEntryAndSl && (
                    <div
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold border flex items-center gap-1.5 ${
                        editRiskAlertVariant === "safe"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : editRiskAlertVariant === "warn"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {editRiskAlertVariant === "safe" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Risk ${editMetrics.riskUSD.toFixed(2)} ({editMetrics.riskPct.toFixed(1)}%) — safe zone.</span>
                        </>
                      ) : editRiskAlertVariant === "warn" ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Warning: Risk ${editMetrics.riskUSD.toFixed(2)} ({editMetrics.riskPct.toFixed(1)}%) is near 5% limit.</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Danger: Risk ${editMetrics.riskUSD.toFixed(2)} ({editMetrics.riskPct.toFixed(1)}%) exceeds safety rules!</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Row 1: Balance & Lot Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          Balance ($)
                        </label>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 uppercase">
                          Auto-Sync
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={editFormData.accountBalance}
                        onChange={(e) => handlePriceFieldChange("bal", e.target.value, true)}
                        placeholder="100.00"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Lot Size
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editFormData.lotSize}
                        onChange={(e) => handlePriceFieldChange("lot", e.target.value, true)}
                        placeholder="0.01"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                      <p className="text-[10px] text-muted-foreground truncate">
                        Rec. Lot: <strong className="text-amber-400">{editMetrics.recLot.toFixed(3)}</strong> (at 4% risk)
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Open Price & Stop Loss */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Open Price *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editFormData.entryPrice}
                        onChange={(e) => handlePriceFieldChange("entry", e.target.value, true)}
                        placeholder="e.g. 4415"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-red-400 uppercase">
                        Stop Loss *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editFormData.stopLoss}
                        onChange={(e) => handlePriceFieldChange("sl", e.target.value, true)}
                        placeholder="e.g. 4417"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold text-red-400 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: TP (RRR) & Target Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        TP (RRR)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editFormData.tpRrr}
                        onChange={(e) => handlePriceFieldChange("tpRrr", e.target.value, true)}
                        placeholder="3"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                        Target Price *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editFormData.takeProfit}
                        onChange={(e) => handlePriceFieldChange("target", e.target.value, true)}
                        placeholder="e.g. 4409"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Close Price & Pip Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Close Price (Exit)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editFormData.exitPrice}
                        onChange={(e) => handlePriceFieldChange("close", e.target.value, true)}
                        placeholder="e.g. 4405"
                        className="w-full rounded-xl border border-amber-500/50 bg-background px-3 py-2 font-mono text-xs font-bold text-amber-400 focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Pip Value ($/pip)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editFormData.pipValue}
                        onChange={(e) => handlePriceFieldChange("pipVal", e.target.value, true)}
                        placeholder="1"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 5: 4-Metrics Display (Matching Image 1) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Risk $</p>
                      <p className="text-sm sm:text-base font-black font-mono text-red-500">
                        {editMetrics.hasEntryAndSl ? `$${editMetrics.riskUSD.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {editMetrics.hasEntryAndSl ? `(${editMetrics.riskPips.toFixed(1)} pips)` : ""}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Reward $</p>
                      <p className="text-sm sm:text-base font-black font-mono text-emerald-500">
                        {editMetrics.hasTarget ? `+$${editMetrics.rewardUSD.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {editMetrics.hasTarget ? `(${editMetrics.rewardPips.toFixed(1)} pips)` : ""}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">RRR</p>
                      <p className="text-sm sm:text-base font-black font-mono text-emerald-400">
                        {editMetrics.hasEntryAndSl ? `1:${editMetrics.rrrVal.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {editMetrics.rrrVal >= 3 ? "✓ 1:3 Target" : "Under 1:3"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Risk %</p>
                      <p className="text-sm sm:text-base font-black font-mono text-amber-500">
                        {editMetrics.hasEntryAndSl ? `${editMetrics.riskPct.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">of Balance</p>
                    </div>
                  </div>

                  {/* Row 6: Trade Result Selector */}
                  <div className="space-y-1.5 pt-1 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        Trade Result
                      </label>
                      {editFormData.pnl !== "" && (
                        <span className={`text-xs font-mono font-bold ${parseFloat(editFormData.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          PnL: {parseFloat(editFormData.pnl) >= 0 ? `+$${editFormData.pnl}` : `-$${Math.abs(parseFloat(editFormData.pnl))}`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("WIN", true)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          editFormData.outcome === "WIN"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ✅ Win
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("LOSS", true)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          editFormData.outcome === "LOSS"
                            ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ❌ Loss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResultClick("BREAKEVEN", true)}
                        className={`rounded-xl py-2 font-bold cursor-pointer transition-all ${
                          editFormData.outcome === "BREAKEVEN"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow"
                            : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        ⚖️ BE
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Status & Outcome (Edit Mode only) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Position Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData((p) => ({ ...p, status: e.target.value as any }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="CLOSED">CLOSED</option>
                      <option value="OPEN">OPEN (Running Position)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Outcome Status</label>
                    <select
                      value={editFormData.outcome}
                      onChange={(e) => setEditFormData((p) => ({ ...p, outcome: e.target.value as any }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="WIN">WIN (Profit)</option>
                      <option value="LOSS">LOSS (Stop Loss)</option>
                      <option value="BREAKEVEN">BREAKEVEN (Cost)</option>
                      <option value="PENDING">PENDING (Still Open)</option>
                    </select>
                  </div>
                </div>

                {/* 7. Emotions & Mistakes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Emotions During Trade</label>
                    <select
                      value={editFormData.emotions}
                      onChange={(e) => setEditFormData((p) => ({ ...p, emotions: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="CALM">Calm & Disciplined ✓</option>
                      <option value="FOMO">FOMO (Chased the candle)</option>
                      <option value="REVENGE">Revenge Trade (Anger)</option>
                      <option value="ANXIOUS">Anxious / Scared</option>
                      <option value="GREED">Greedy (Wanted more)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Mistake Tag</label>
                    <select
                      value={editFormData.mistakes}
                      onChange={(e) => setEditFormData((p) => ({ ...p, mistakes: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-semibold focus:border-primary focus:outline-none"
                    >
                      <option value="NONE">No Mistake (Followed Rules) ✓</option>
                      <option value="EARLY_EXIT">Exited Too Early in Profit</option>
                      <option value="MOVED_SL">Moved Stop Loss / Held Loser</option>
                      <option value="OVERTRADING">Overtrading</option>
                      <option value="OVER_LEVERAGED">Too Big Lot Size</option>
                    </select>
                  </div>
                </div>

                {/* 8. Setup Reason & Notes */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Technical Setup Reason & Notes</label>
                  <textarea
                    rows={2}
                    value={editFormData.setupReason}
                    onChange={(e) => setEditFormData((p) => ({ ...p, setupReason: e.target.value }))}
                    placeholder="e.g. Liquidity sweep on 15m SNR with rejection candle confirmation"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </div>

                {/* 9. Screenshot Upload */}
                <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span>Chart Screenshot (PNG, JPG, WEBP)</span>
                    </label>
                    {editFormData.screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData((p) => ({ ...p, screenshotUrl: "" }))}
                        className="text-[10px] text-destructive hover:underline cursor-pointer font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {editFormData.screenshotUrl ? (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black/40 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editFormData.screenshotUrl}
                        alt="Trade preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1 backdrop-blur-xs">
                        <CheckCircle2 className="h-3 w-3" /> Screenshot Attached
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingScreenshot}
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                        {uploadingScreenshot ? (
                          <div className="flex items-center gap-2 text-primary text-xs font-semibold py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Uploading screenshot to CDN...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-center py-1">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs font-bold text-foreground">Click to upload chart screenshot</span>
                            <span className="text-[10px] text-muted-foreground">PNG, JPG, JPEG, WEBP up to 15MB</span>
                          </div>
                        )}
                      </label>

                      <input
                        type="url"
                        value={editFormData.screenshotUrl}
                        onChange={(e) => setEditFormData((p) => ({ ...p, screenshotUrl: e.target.value }))}
                        placeholder="Or paste screenshot URL (TradingView, Lightshot, etc.)"
                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingTrade(null)}
                    className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || uploadingScreenshot}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* High-Res Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl border border-border overflow-hidden p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black cursor-pointer shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Trade chart screenshot"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
