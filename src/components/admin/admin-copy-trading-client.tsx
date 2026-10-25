"use client";

import { useState } from "react";
import {
  Share2,
  Users,
  Server,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Trash2,
  Unlink,
  Search,
  Filter,
  Settings,
  Activity,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateCopyTradingTier } from "@/lib/copy-trading-risk";
import {
  adminUpdateSubscriptionStatusAction,
  adminUpdateMasterAccountAction,
  adminSimulateTradeSyncAction,
  refreshAdminCopyTradingDataAction,
  MasterAccountPayload,
} from "@/server/actions/copy-trading.actions";

interface MasterData {
  id: string;
  accountName: string;
  brokerName: string;
  accountNumber: string;
  serverName: string;
  platform: string;
  strategyDescription: string | null;
  riskLevel: string;
  minCapitalUsd: number;
  isActive: boolean;
  totalTrades: number;
  winRate: number;
  totalProfitUsd: number;
  profitFactor: number;
  maxDrawdown: number;
  roiMonthly: number;
  vpsNodeName: string | null;
}

interface StudentSubscription {
  id: string;
  userId: string;
  masterId: string;
  brokerName: string;
  accountNumber: string;
  serverName: string;
  platform: string;
  encryptedPassword?: string | null;
  accountCurrency: string;
  balance: number;
  equity: number;
  riskMode: "FIXED_LOT" | "MULTIPLIER" | "PROPORTIONAL_EQUITY";
  multiplier: number;
  fixedLot: number;
  maxDrawdownGuard: number;
  maxLotLimit: number;
  status: "PENDING_APPROVAL" | "ACTIVE" | "PAUSED" | "DISCONNECTED" | "REJECTED";
  rejectionReason: string | null;
  vpsNode: string | null;
  vpsSlotNumber: number | null;
  latencyMs: number;
  isOnline: boolean;
  lastSyncedAt: Date | string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    referralCode: string;
  };
}

interface TradeLog {
  id: string;
  tradeTicket: string;
  symbol: string;
  orderType: string;
  masterLots: number;
  copiedLots: number | null;
  masterOpenPrice: number;
  childOpenPrice: number | null;
  masterClosePrice: number | null;
  childClosePrice: number | null;
  slippagePips: number;
  latencyMs: number;
  profit: number;
  status: string;
  openedAt: Date | string;
  subscription?: {
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface VpsNodeInfo {
  nodeId: string;
  name: string;
  specs: string;
  ipAddress: string;
  status: string;
  totalCapacity: number;
  occupiedSlots: number;
  cpuUsagePercent: number;
  ramUsageGb: string;
  maxRamGb: number;
  avgPingMs: number;
  idleReclaimProtected: boolean;
}

interface AdminCopyTradingClientProps {
  initialMasters: MasterData[];
  initialSubscriptions: StudentSubscription[];
  initialLogs: TradeLog[];
  initialKpi: {
    totalStudents: number;
    activeStudents: number;
    pendingApprovals: number;
    pausedStudents: number;
  };
  vpsFleet: VpsNodeInfo[];
  settings: Record<string, string>;
}

export function AdminCopyTradingClient({
  initialMasters,
  initialSubscriptions,
  initialLogs,
  initialKpi,
  vpsFleet,
}: AdminCopyTradingClientProps) {
  const [activeTab, setActiveTab] = useState<"FLEET" | "MASTER" | "VPS" | "LOGS">("FLEET");
  const [subscriptions, setSubscriptions] = useState<StudentSubscription[]>(initialSubscriptions);
  const [masters, setMasters] = useState<MasterData[]>(initialMasters);
  const [logs, setLogs] = useState<TradeLog[]>(initialLogs);
  const [kpi, setKpi] = useState(initialKpi);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Action Loading
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Master Edit Form State
  const activeMaster = masters[0] || null;
  const [masterForm, setMasterForm] = useState<MasterAccountPayload>({
    id: activeMaster?.id,
    accountName: activeMaster?.accountName || "SuperWarrior30 Master Trader",
    brokerName: activeMaster?.brokerName || "GTCFX",
    accountNumber: activeMaster?.accountNumber || "148932014",
    serverName: activeMaster?.serverName || "GTCFX MT5 - Server 2",
    platform: (activeMaster?.platform as any) || "MT5",
    strategyDescription: activeMaster?.strategyDescription || "",
    riskLevel: (activeMaster?.riskLevel as any) || "MODERATE",
    minCapitalUsd: activeMaster?.minCapitalUsd || 100,
    isActive: activeMaster?.isActive !== false,
    winRate: activeMaster?.winRate || 78.5,
    totalTrades: activeMaster?.totalTrades || 150,
    totalProfitUsd: activeMaster?.totalProfitUsd || 18450,
    profitFactor: activeMaster?.profitFactor || 2.65,
    maxDrawdown: activeMaster?.maxDrawdown || 5.4,
    roiMonthly: activeMaster?.roiMonthly || 21.8,
    vpsNodeName: activeMaster?.vpsNodeName || "SW30-CloudNode-01",
  });
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Simulation Form
  const [simForm, setSimForm] = useState({
    symbol: "XAUUSD",
    orderType: "BUY" as "BUY" | "SELL",
    masterLots: 0.50,
    openPrice: 2655.20,
    profitPerLot: 180.0,
  });

  const handleUpdateStatus = async (
    subId: string,
    action: "APPROVE" | "REJECT" | "PAUSE" | "ACTIVATE" | "DISCONNECT" | "DELETE"
  ) => {
    try {
      setProcessingId(subId);
      const res = await adminUpdateSubscriptionStatusAction(subId, action);
      if (res.success) {
        toast.success(res.message);
        if (action === "DELETE") {
          setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
        } else {
          setSubscriptions((prev) =>
            prev.map((s) => {
              if (s.id !== subId) return s;
              let nextStatus = s.status;
              if (action === "APPROVE" || action === "ACTIVATE") nextStatus = "ACTIVE";
              if (action === "REJECT") nextStatus = "REJECTED";
              if (action === "PAUSE") nextStatus = "PAUSED";
              if (action === "DISCONNECT") nextStatus = "DISCONNECTED";
              return { ...s, status: nextStatus };
            })
          );
        }
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingMaster(true);
      const res = await adminUpdateMasterAccountAction(masterForm);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to save master account.");
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleTriggerSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await adminSimulateTradeSyncAction(
        simForm.symbol,
        simForm.orderType,
        simForm.masterLots,
        simForm.openPrice,
        undefined,
        simForm.profitPerLot
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setIsRefreshing(true);
      const freshData = await refreshAdminCopyTradingDataAction();
      setMasters(freshData.masters as any);
      setSubscriptions(freshData.subscriptions as any);
      setLogs(freshData.recentLogs as any);
      setKpi(freshData.kpi);
      setLastRefreshedAt(freshData.refreshedAt);
      toast.success("Fleet status refreshed from database!");
    } catch {
      toast.error("Failed to refresh fleet status.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (statusFilter !== "ALL" && sub.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.user.name?.toLowerCase().includes(q);
      const matchEmail = sub.user.email.toLowerCase().includes(q);
      const matchAccount = sub.accountNumber.toLowerCase().includes(q);
      const matchBroker = sub.brokerName.toLowerCase().includes(q);
      return matchName || matchEmail || matchAccount || matchBroker;
    }
    return true;
  });

  const node = vpsFleet[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Copy Trading Fleet Management
            </h1>
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold border border-primary/20">
              Dedicated VPS Cloud
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized terminal management, student MT5 child slot allocation, and real-time execution synchronization.
          </p>
        </div>

        {/* Global Master Status Pill + Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            title="Fetch latest VPS & fleet data from database"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Live Status"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-foreground">Master:</span>
            <span className="text-muted-foreground">SuperWarrior30 Master Trader (GTCFX)</span>
          </div>
        </div>
      </div>

      {/* Last Refreshed Timestamp */}
      {lastRefreshedAt && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Active Child Accounts</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">
            {kpi.activeStudents}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Connected &amp; copying live
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Pending Approvals</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-2">
            {kpi.pendingApprovals}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Awaiting slot assignment
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Trading VPS Capacity</span>
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {node ? `${node.occupiedSlots} / ${node.totalCapacity}` : "0 / 20"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Dedicated Ultra-Low Latency Cluster
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Fleet Latency (Avg)</span>
            <Zap className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">
            3.2 ms
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ultra-fast cloud bridge
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border text-xs overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab("FLEET")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors",
            activeTab === "FLEET"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Child Accounts ({subscriptions.length})
          {kpi.pendingApprovals > 0 && (
            <span className="rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.2">
              {kpi.pendingApprovals}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("MASTER")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors",
            activeTab === "MASTER"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Master Account Settings
        </button>

        <button
          onClick={() => setActiveTab("VPS")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors",
            activeTab === "VPS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Server className="h-3.5 w-3.5" />
          Trading Cloud VPS Monitor
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors",
            activeTab === "LOGS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Execution Logs &amp; Simulation
        </button>
      </div>

      {/* Copy Trading Risk Sizing & DD Rules Matrix Card */}
      <div className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold text-sm text-foreground">
              Official Copy Trading Risk Policy ($300 = 0.01 Lot | Max 2 Trades | 5% Daily DD | 15% Max DD)
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Active on all Child Terminals
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="rounded-lg bg-accent/40 border border-border/60 p-2.5">
            <span className="text-[10px] text-muted-foreground block font-medium">Linear Sizing</span>
            <div className="font-bold text-foreground text-xs mt-0.5">0.01 Lot / $300</div>
            <span className="text-[10px] text-muted-foreground">$600=0.02, $1200=0.04</span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border/60 p-2.5">
            <span className="text-[10px] text-muted-foreground block font-medium">Concurrency Cap</span>
            <div className="font-bold text-foreground text-xs mt-0.5">Max 2 Trades Concurrent</div>
            <span className="text-[10px] text-muted-foreground">0.01+0.01 for $300</span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border/60 p-2.5">
            <span className="text-[10px] text-muted-foreground block font-medium">Daily Drawdown</span>
            <div className="font-bold text-amber-500 text-xs mt-0.5">5% Daily Stop</div>
            <span className="text-[10px] text-muted-foreground">Locks for today, resets 00:00</span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border/60 p-2.5">
            <span className="text-[10px] text-muted-foreground block font-medium">Max Drawdown</span>
            <div className="font-bold text-destructive text-xs mt-0.5">15% Max DD Hard Exit</div>
            <span className="text-[10px] text-muted-foreground">Auto-disconnects from fleet</span>
          </div>
        </div>
      </div>

      {/* TAB 1: FLEET TABLE */}
      {activeTab === "FLEET" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search student, email or MT5 login..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING_APPROVAL">Pending Review</option>
                <option value="ACTIVE">Actively Copying</option>
                <option value="PAUSED">Paused</option>
                <option value="REJECTED">Rejected</option>
                <option value="DISCONNECTED">Disconnected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="border-b border-border/60 bg-accent/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Broker &amp; Server</th>
                    <th className="py-3 px-3">Trading ID &amp; Credentials</th>
                    <th className="py-3 px-3">Risk Setting</th>
                    <th className="py-3 px-3">VPS Slot</th>
                    <th className="py-3 px-3">Latency</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No student child accounts found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const isPending = sub.status === "PENDING_APPROVAL";
                      const isActive = sub.status === "ACTIVE";
                      const isPaused = sub.status === "PAUSED";
                      const isBusy = processingId === sub.id;

                      return (
                        <tr key={sub.id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">
                              {sub.user.name || "Student"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{sub.user.email}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-medium text-foreground">{sub.brokerName}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{sub.serverName}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                              <span>#{sub.accountNumber}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">({sub.platform})</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(sub.accountNumber, "Login ID")}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                title="Copy Trading Login ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-muted-foreground font-medium">Pwd:</span>
                              {sub.encryptedPassword ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[11px] bg-accent/80 border border-border/60 px-1.5 py-0.5 rounded text-foreground select-all">
                                    {visiblePasswords[sub.id] ? sub.encryptedPassword : "••••••••"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(sub.id)}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                    title={visiblePasswords[sub.id] ? "Hide Password" : "Show Password"}
                                  >
                                    {visiblePasswords[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-primary" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(sub.encryptedPassword || "", "Password")}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                    title="Copy Password"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Not set</span>
                              )}
                            </div>

                            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                              <span>Initial Bal:</span>
                              <strong className="text-emerald-500 font-mono font-bold">
                                ${sub.balance?.toFixed(2) || "0.00"}
                              </strong>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {(() => {
                              const tier = calculateCopyTradingTier(sub.balance || 300);
                              return (
                                <div>
                                  <div className="font-semibold text-primary text-xs">
                                    {tier.lotPerTrade} Lot / trade
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Max 2 trades ({tier.totalMaxLotExposure} lot)
                                  </div>
                                  <div className="text-[10px] text-amber-500 font-medium">
                                    5% Daily: -${tier.dailyDDLimitUsd} | 15% Max: -${tier.maxDDLimitUsd}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3 px-3">
                            {sub.vpsSlotNumber ? (
                              <span className="font-mono text-xs font-semibold text-primary">
                                Slot #{sub.vpsSlotNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">None</span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-emerald-500">
                            {sub.latencyMs}ms
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                isActive && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                isPending && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                isPaused && "bg-slate-500/10 text-slate-400 border-slate-500/20",
                                sub.status === "REJECTED" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                sub.status === "DISCONNECTED" && "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                              )}
                            >
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(sub.id, "APPROVE")}
                                    disabled={isBusy}
                                    className="rounded bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 px-2 py-1 font-semibold text-[11px] border border-emerald-500/30 transition-colors"
                                  >
                                    Approve Slot
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(sub.id, "REJECT")}
                                    disabled={isBusy}
                                    className="rounded bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 px-2 py-1 font-semibold text-[11px] border border-rose-500/30 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {isActive && (
                                <button
                                  onClick={() => handleUpdateStatus(sub.id, "PAUSE")}
                                  disabled={isBusy}
                                  className="rounded bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 px-2 py-1 font-semibold text-[11px] border border-amber-500/30 transition-colors"
                                  title="Pause Copying"
                                >
                                  <Pause className="h-3 w-3 inline mr-1" /> Pause
                                </button>
                              )}

                              {isPaused && (
                                <button
                                  onClick={() => handleUpdateStatus(sub.id, "ACTIVATE")}
                                  disabled={isBusy}
                                  className="rounded bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 px-2 py-1 font-semibold text-[11px] border border-emerald-500/30 transition-colors"
                                  title="Resume Copying"
                                >
                                  <Play className="h-3 w-3 inline mr-1" /> Resume
                                </button>
                              )}

                              <button
                                onClick={() => handleUpdateStatus(sub.id, "DISCONNECT")}
                                disabled={isBusy}
                                className="rounded bg-accent text-muted-foreground hover:text-foreground px-1.5 py-1 text-[11px] border border-border transition-colors"
                                title="Disconnect & Free Slot"
                              >
                                <Unlink className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(sub.id, "DELETE")}
                                disabled={isBusy}
                                className="rounded bg-destructive/10 text-destructive hover:bg-destructive/20 px-1.5 py-1 text-[11px] border border-destructive/20 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER ACCOUNT CONFIGURATION */}
      {activeTab === "MASTER" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Master Account Connection &amp; Display Metrics
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These details determine how trades are originated and what track record metrics are showcased to students.
            </p>
          </div>

          <form onSubmit={handleSaveMaster} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-foreground block mb-1">Master Account Name</label>
                <input
                  type="text"
                  required
                  value={masterForm.accountName}
                  onChange={(e) => setMasterForm({ ...masterForm, accountName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Broker Name</label>
                <input
                  type="text"
                  required
                  value={masterForm.brokerName}
                  onChange={(e) => setMasterForm({ ...masterForm, brokerName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-medium text-foreground block mb-1">Account / Login ID</label>
                <input
                  type="text"
                  required
                  value={masterForm.accountNumber}
                  onChange={(e) => setMasterForm({ ...masterForm, accountNumber: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  value={masterForm.serverName}
                  onChange={(e) => setMasterForm({ ...masterForm, serverName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Platform</label>
                <select
                  value={masterForm.platform}
                  onChange={(e) => setMasterForm({ ...masterForm, platform: e.target.value as any })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                >
                  <option value="MT5">MetaTrader 5 (MT5)</option>
                  <option value="MT4">MetaTrader 4 (MT4)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Strategy Description</label>
              <textarea
                rows={2}
                value={masterForm.strategyDescription || ""}
                onChange={(e) => setMasterForm({ ...masterForm, strategyDescription: e.target.value })}
                placeholder="Briefly describe the strategy (e.g. Price action, Gold scalping, London/NY sweeps)..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs leading-relaxed"
              />
            </div>

            <div className="border-t border-border/60 pt-4">
              <h4 className="font-semibold text-foreground mb-3">Showcase Performance Metrics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Win Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={masterForm.winRate}
                    onChange={(e) => setMasterForm({ ...masterForm, winRate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Monthly ROI (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={masterForm.roiMonthly}
                    onChange={(e) => setMasterForm({ ...masterForm, roiMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Profit Factor</label>
                  <input
                    type="number"
                    step="0.05"
                    value={masterForm.profitFactor}
                    onChange={(e) => setMasterForm({ ...masterForm, profitFactor: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Max Drawdown (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={masterForm.maxDrawdown}
                    onChange={(e) => setMasterForm({ ...masterForm, maxDrawdown: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterForm.isActive}
                  onChange={(e) => setMasterForm({ ...masterForm, isActive: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="font-semibold text-foreground">Copy Trading Active (Accepting New Syncs)</span>
              </label>

              <button
                type="submit"
                disabled={isSavingMaster}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {isSavingMaster ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Save Master Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TRADING CLOUD VPS MONITOR */}
      {activeTab === "VPS" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    SuperWarrior Dedicated Cloud Node #1
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold">
                    Healthy • Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Architecture: <strong>Ultra-Low Latency Cloud Cluster</strong> • Specs: 4 Dedicated vCPUs, 24 GB RAM • 200 GB NVMe Storage
                </p>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-500 font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero-Slippage Execution Bridge (&lt; 3ms Latency)</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">CPU Usage:</span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {node?.cpuUsagePercent.toFixed(1)}%
                </div>
                <div className="w-full bg-background/80 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${node?.cpuUsagePercent || 15}%` }}
                  ></div>
                </div>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">RAM Consumption:</span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {node?.ramUsageGb} GB / {node?.maxRamGb} GB
                </div>
                <div className="w-full bg-background/80 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${((parseFloat(node?.ramUsageGb || "4") / 24) * 100).toFixed(0)}%` }}
                  ></div>
                </div>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Slot Allocation:</span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {node?.occupiedSlots} / {node?.totalCapacity} Terminals
                </div>
                <div className="w-full bg-background/80 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${((node?.occupiedSlots || 0) / (node?.totalCapacity || 20)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Internal Ping:</span>
                <div className="text-lg font-bold text-emerald-500 mt-1">
                  &lt; 3.0 ms
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Direct broker socket</p>
              </div>
            </div>

            {/* Visual Slots Grid */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-foreground">
                  Child Terminal Slot Allocation (Capacity: 20 Max)
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-500"></span> Occupied (Active)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-accent border border-border"></span> Free Slot
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((slotNum) => {
                  const assigned = subscriptions.find((s) => s.vpsSlotNumber === slotNum && s.status === "ACTIVE");
                  return (
                    <div
                      key={slotNum}
                      className={cn(
                        "rounded-lg border p-2 text-center transition-all",
                        assigned
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold shadow-sm"
                          : "border-border/60 bg-accent/20 text-muted-foreground"
                      )}
                    >
                      <div className="text-xs">Slot #{slotNum}</div>
                      <div className="text-[9px] truncate mt-0.5 font-normal">
                        {assigned ? assigned.user.name?.split(" ")[0] || "Active" : "Free"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRADE LOGS & SIMULATION */}
      {activeTab === "LOGS" && (
        <div className="space-y-6">
          {/* Simulation Tool Card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Live Trade Synchronization Simulator
                </h3>
                <p className="text-xs text-muted-foreground">
                  Test and demonstrate instant trade replication across all active student MT5 terminals.
                </p>
              </div>

              <button
                onClick={handleTriggerSimulation}
                disabled={isSimulating}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Broadcasting...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Execute Test Trade Across Fleet
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Symbol</label>
                <select
                  value={simForm.symbol}
                  onChange={(e) => setSimForm({ ...simForm, symbol: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
                >
                  <option value="XAUUSD">Gold (XAUUSD)</option>
                  <option value="EURUSD">EURUSD</option>
                  <option value="GBPUSD">GBPUSD</option>
                  <option value="BTCUSD">BTCUSD</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">Order Type</label>
                <select
                  value={simForm.orderType}
                  onChange={(e) => setSimForm({ ...simForm, orderType: e.target.value as any })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">Master Lot</label>
                <input
                  type="number"
                  step="0.1"
                  value={simForm.masterLots}
                  onChange={(e) => setSimForm({ ...simForm, masterLots: parseFloat(e.target.value) || 0.5 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">Profit Per Lot ($)</label>
                <input
                  type="number"
                  step="10"
                  value={simForm.profitPerLot}
                  onChange={(e) => setSimForm({ ...simForm, profitPerLot: parseFloat(e.target.value) || 180 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold font-mono"
                />
              </div>
            </div>

            <div className="rounded-lg bg-background/80 border border-primary/20 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>
                🛡️ <strong>Risk Policy Enforced:</strong> Master jitna bhi lot le, har client account me <strong>0.01 lot per $300 balance</strong>, <strong>max 2 concurrent trades</strong>, <strong>5% Daily DD stop</strong>, aur <strong>15% Max DD breach exit</strong> strictly follow hoga.
              </span>
            </div>
          </div>

          {/* Trade Logs Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <h3 className="font-semibold text-xs text-foreground">
                Fleet Trade Execution Logs ({logs.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">Updated in real-time</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-accent/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Ticket</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Master Lot</th>
                    <th className="py-2.5 px-3">Child Lot</th>
                    <th className="py-2.5 px-3">Profit</th>
                    <th className="py-2.5 px-3">Slippage</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No trade logs recorded yet. Run a simulation or wait for live trades.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isProfit = log.profit >= 0;
                      return (
                        <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">#{log.tradeTicket}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {log.subscription?.user.name || "Master"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground">{log.symbol}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 font-semibold text-[10px]",
                                log.orderType === "BUY"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              )}
                            >
                              {log.orderType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{log.masterLots}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                            {log.copiedLots || log.masterLots}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={cn(
                                "font-bold font-mono",
                                isProfit ? "text-emerald-500" : "text-rose-500"
                              )}
                            >
                              {isProfit ? `+$${log.profit.toFixed(2)}` : `-$${Math.abs(log.profit).toFixed(2)}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono">
                            {log.slippagePips} pips
                          </td>
                          <td className="py-2.5 px-3 text-emerald-500 font-mono">
                            {log.latencyMs} ms
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {new Date(log.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
