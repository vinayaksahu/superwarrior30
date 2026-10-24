"use client";

import { useState } from "react";
import {
  Share2,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Server,
  Zap,
  Pause,
  Play,
  Unlink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  submitStudentSubscriptionAction,
  toggleStudentCopyPauseAction,
  disconnectStudentSubscriptionAction,
  refreshStudentCopyTradingDataAction,
  StudentCopyTradingPayload,
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

interface SubscriptionData {
  id: string;
  userId: string;
  masterId: string;
  brokerName: string;
  accountNumber: string;
  serverName: string;
  platform: string;
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
  closedAt: Date | string | null;
}

interface StudentCopyTradingClientProps {
  initialMaster: MasterData | null;
  initialSubscription: SubscriptionData | null;
  initialLogs: TradeLog[];
  settings: Record<string, string>;
}

export function StudentCopyTradingClient({
  initialMaster,
  initialSubscription,
  initialLogs,
}: StudentCopyTradingClientProps) {
  const [master, setMaster] = useState<MasterData | null>(initialMaster);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(initialSubscription);
  const [logs, setLogs] = useState<TradeLog[]>(initialLogs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<StudentCopyTradingPayload>({
    brokerName: subscription?.brokerName || "Exness",
    accountNumber: subscription?.accountNumber || "",
    serverName: subscription?.serverName || "Exness-Real21",
    platform: (subscription?.platform as "MT5" | "MT4") || "MT5",
    password: "",
    accountCurrency: subscription?.accountCurrency || "USD",
    balance: subscription?.balance || 1000,
    equity: subscription?.equity || 1000,
    riskMode: (subscription?.riskMode as any) || "MULTIPLIER",
    multiplier: subscription?.multiplier || 1.0,
    fixedLot: subscription?.fixedLot || 0.01,
    maxDrawdownGuard: subscription?.maxDrawdownGuard || 15.0,
    maxLotLimit: subscription?.maxLotLimit || 0.50,
  });

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountNumber.trim() || !formData.serverName.trim()) {
      toast.error("Please fill in your account number and broker server.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitStudentSubscriptionAction(formData);
      if (res.success) {
        toast.success(res.message);
        setIsModalOpen(false);
        // Optimistic update
        setSubscription((prev) => ({
          ...(prev || ({} as any)),
          ...formData,
          id: res.data?.id || prev?.id || "temp-id",
          status: "PENDING_APPROVAL",
          isOnline: true,
          latencyMs: 3,
        }));
      } else {
        toast.error(res.message || "Failed to submit connection details.");
      }
    } catch {
      toast.error("Network error while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    if (!subscription) return;
    try {
      setIsActionPending(true);
      const res = await toggleStudentCopyPauseAction(subscription.id);
      if (res.success && res.data) {
        toast.success(res.message);
        setSubscription({
          ...subscription,
          status: res.data.status as any,
        });
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to toggle state.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDisconnect = async () => {
    if (!subscription) return;
    if (!confirm("Are you sure you want to disconnect your MT5 account from the copy trading VPS?")) {
      return;
    }

    try {
      setIsActionPending(true);
      const res = await disconnectStudentSubscriptionAction(subscription.id);
      if (res.success) {
        toast.success(res.message);
        setSubscription({
          ...subscription,
          status: "DISCONNECTED",
          isOnline: false,
          vpsSlotNumber: null,
        });
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to disconnect account.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setIsRefreshing(true);
      const freshData = await refreshStudentCopyTradingDataAction();
      if (freshData.master) setMaster(freshData.master as any);
      if (freshData.subscription) setSubscription(freshData.subscription as any);
      setLogs(freshData.logs as any);
      setLastRefreshedAt(freshData.refreshedAt);
      toast.success("Status refreshed from VPS!");
    } catch {
      toast.error("Failed to refresh status.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Automated MT5 Copy Trading
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
              <Zap className="h-3 w-3" /> Live Master Sync
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Mirror Rahul Trade Warrior Academy&apos;s verified trades directly into your MT4/MT5 account with ultra-low latency execution.
          </p>
        </div>

        {/* Oracle Cloud VPS Server Status Banner + Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            title="Fetch latest status from VPS"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <div>
              <div className="font-medium text-foreground flex items-center gap-1">
                <Server className="h-3 w-3 text-primary" /> Oracle Cloud VPS (Ampere A1)
              </div>
              <div className="text-muted-foreground">Execution Latency: &lt; 4ms • 24/7 Active</div>
            </div>
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

      {/* Master Trader Performance Showcase */}
      {master && (
        <div className="rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/20 text-primary p-1.5 font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {master.accountName}
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold border border-primary/20">
                      Official Academy Master
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Broker: <span className="font-medium text-foreground">{master.brokerName}</span> • Platform: <span className="font-medium text-foreground">{master.platform}</span> • Server: <span className="font-mono text-xs">{master.serverName}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Min Capital: </span>
                <span className="font-bold text-foreground">${master.minCapitalUsd}</span>
              </div>
              <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Risk Profile: </span>
                <span className="font-bold text-emerald-500">{master.riskLevel}</span>
              </div>
            </div>
          </div>

          {/* Strategy description */}
          {master.strategyDescription && (
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              <span className="font-semibold text-foreground">Strategy: </span>
              {master.strategyDescription}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
            <div className="rounded-lg bg-background/60 border border-border/60 p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Win Rate</div>
              <div className="text-xl font-bold text-emerald-500 mt-1 flex items-baseline gap-1">
                {master.winRate}%
                <span className="text-[10px] text-muted-foreground font-normal">verified</span>
              </div>
            </div>

            <div className="rounded-lg bg-background/60 border border-border/60 p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monthly ROI</div>
              <div className="text-xl font-bold text-emerald-500 mt-1 flex items-baseline gap-1">
                +{master.roiMonthly}%
                <ArrowUpRight className="h-4 w-4 text-emerald-500 inline" />
              </div>
            </div>

            <div className="rounded-lg bg-background/60 border border-border/60 p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Profit Factor</div>
              <div className="text-xl font-bold text-foreground mt-1">
                {master.profitFactor}x
              </div>
            </div>

            <div className="rounded-lg bg-background/60 border border-border/60 p-3">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Max Drawdown</div>
              <div className="text-xl font-bold text-amber-500 mt-1 flex items-baseline gap-1">
                {master.maxDrawdown}%
                <span className="text-[10px] text-muted-foreground font-normal">strict</span>
              </div>
            </div>

            <div className="rounded-lg bg-background/60 border border-border/60 p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Trades</div>
              <div className="text-xl font-bold text-foreground mt-1">
                {master.totalTrades}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Account Connection Status Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              My Connected MT4 / MT5 Terminal
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cloud execution status and terminal slot allocated on the Academy VPS cluster.
            </p>
          </div>

          {subscription && (
            <div className="flex items-center gap-2">
              {subscription.status === "ACTIVE" && (
                <button
                  onClick={handleTogglePause}
                  disabled={isActionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" /> Pause Copying
                </button>
              )}

              {subscription.status === "PAUSED" && (
                <button
                  onClick={handleTogglePause}
                  disabled={isActionPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" /> Resume Copying
                </button>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Modify Settings
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isActionPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                title="Disconnect Account"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Status Content */}
        {!subscription || subscription.status === "DISCONNECTED" ? (
          <div className="py-8 text-center max-w-md mx-auto space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share2 className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">No Trading Account Connected</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your Exness, XM, OctaFX or any other MT5/MT4 account. Our cloud VPS will copy all trades automatically with zero manual effort.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" /> Connect My MT5 Account Now
            </button>
          </div>
        ) : subscription.status === "PENDING_APPROVAL" ? (
          <div className="py-6 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-sm text-foreground">
                  Connection Request Under Review (Slot Allocation in Progress)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your MT5 credentials for account <span className="font-mono font-medium text-foreground">#{subscription.accountNumber}</span> ({subscription.brokerName}) have been recorded. Admin is setting up a lightweight isolated terminal on the Oracle VPS Node. You will be notified as soon as sync is live!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground">Broker:</span>
                <p className="font-semibold text-foreground mt-0.5">{subscription.brokerName}</p>
              </div>
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground">Server:</span>
                <p className="font-mono font-semibold text-foreground mt-0.5">{subscription.serverName}</p>
              </div>
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground">Risk Mode:</span>
                <p className="font-semibold text-foreground mt-0.5">{subscription.riskMode} ({subscription.multiplier}x)</p>
              </div>
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground">Max DD Guard:</span>
                <p className="font-semibold text-foreground mt-0.5">{subscription.maxDrawdownGuard}%</p>
              </div>
            </div>
          </div>
        ) : subscription.status === "REJECTED" ? (
          <div className="py-6 space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-sm text-destructive">
                  Account Connection Rejected
                </div>
                <p className="text-xs text-muted-foreground">
                  Reason: {subscription.rejectionReason || "Invalid login credentials or unsupported server. Please check your details."}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 text-xs font-semibold text-primary underline hover:text-primary/80"
                >
                  Update Credentials & Re-submit
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Active Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Status:</span>
                <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                  {subscription.status === "ACTIVE" ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-emerald-500">Actively Copying</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      <span className="text-amber-500">Paused</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">VPS Slot:</span>
                <p className="font-semibold text-foreground text-xs mt-1">
                  Slot #{subscription.vpsSlotNumber || "1"} ({subscription.vpsNode || "Oracle-A1"})
                </p>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Latency / Ping:</span>
                <p className="font-semibold text-emerald-500 text-xs mt-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {subscription.latencyMs} ms
                </p>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Risk Multiplier:</span>
                <p className="font-semibold text-foreground text-xs mt-1">
                  {subscription.riskMode === "FIXED_LOT"
                    ? `Fixed ${subscription.fixedLot} Lot`
                    : `${subscription.multiplier}x of Master`}
                </p>
              </div>
            </div>

            {/* Account Info Pill */}
            <div className="rounded-lg bg-card border border-border/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">MT5 Login:</span>
                <span className="font-mono font-semibold text-foreground">#{subscription.accountNumber}</span>
                <span className="text-muted-foreground">({subscription.brokerName} - {subscription.serverName})</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Balance: <strong className="text-foreground">${subscription.balance.toFixed(2)}</strong></span>
                <span>Equity: <strong className="text-foreground">${subscription.equity.toFixed(2)}</strong></span>
                <span>Safety Stop: <strong className="text-amber-500">{subscription.maxDrawdownGuard}% DD</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Copied Trade Execution History */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Live Trade Execution Stream
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time trades mirrored from Rahul Master Account to your terminal.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {logs.length} trades recorded
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            No trades executed yet. When Master opens a position on Gold (XAUUSD) or Forex, it will appear here in real-time.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Lot</th>
                  <th className="py-2.5 px-3">Open Price</th>
                  <th className="py-2.5 px-3">Close Price</th>
                  <th className="py-2.5 px-3">Profit / PnL</th>
                  <th className="py-2.5 px-3">Ping</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => {
                  const isProfit = log.profit >= 0;
                  return (
                    <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">#{log.tradeTicket}</td>
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
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {log.copiedLots || log.masterLots}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {log.childOpenPrice?.toFixed(2) || log.masterOpenPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {log.childClosePrice?.toFixed(2) || log.masterClosePrice?.toFixed(2) || "OPEN"}
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
                        {log.latencyMs}ms
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(log.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Copy Trading FAQ & Safety Rules */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Frequently Asked Questions & Risk Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
            <h4 className="font-semibold text-foreground">1. Kya mujhe apna laptop/PC 24/7 on rakhna hoga?</h4>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Nahi!</strong> Aapka MT5 account hamare dedicated <strong>Oracle Cloud VPS (Always Free Ampere A1)</strong> par run hota hai. Yeh background me 24/7 online rehta hai chahe aapka phone ya PC band ho.
            </p>
          </div>

          <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
            <h4 className="font-semibold text-foreground">2. Risk Multiplier kaise kaam karta hai?</h4>
            <p className="text-muted-foreground leading-relaxed">
              Agar Master 1.00 lot open karega aur aapka multiplier <strong>0.5x</strong> hai, to aapke account me <strong>0.50 lot</strong> open hoga. Chote accounts ($100-$300) ke liye <strong>0.01 fixed lot</strong> ya <strong>0.5x</strong> recommended hai.
            </p>
          </div>

          <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
            <h4 className="font-semibold text-foreground">3. Max Drawdown Guard kya hai?</h4>
            <p className="text-muted-foreground leading-relaxed">
              Yeh aapke balance ka circuit breaker hai. Agar aapne 15% set kiya hai aur kisi bhi din drawdown 15% touch karta hai, to system auto-pause ho jayega taaki aapka capital safe rahe.
            </p>
          </div>

          <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
            <h4 className="font-semibold text-foreground">4. Kaunse Brokers Supported Hain?</h4>
            <p className="text-muted-foreground leading-relaxed">
              Exness, OctaFX, XM, JustMarkets, IC Markets samet sabhi standard MT5 & MT4 brokers supported hain. Best latency ke liye <strong>Exness</strong> ya <strong>XM</strong> recommended hai.
            </p>
          </div>
        </div>
      </div>

      {/* Account Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Connect MT4 / MT5 Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Credentials are encrypted and loaded only into your isolated VPS slot.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-4 text-xs">
              {/* Platform & Broker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  >
                    <option value="MT5">MetaTrader 5 (MT5 - Recommended)</option>
                    <option value="MT4">MetaTrader 4 (MT4)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Broker Name</label>
                  <input
                    type="text"
                    required
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    placeholder="e.g. Exness, XM, OctaFX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Account Number & Server Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Login / Account Number</label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. 14920391"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Broker Server Name</label>
                  <input
                    type="text"
                    required
                    value={formData.serverName}
                    onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                    placeholder="e.g. Exness-Real21"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              {/* Trading / Investor Password */}
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Trading Password (Required for Order Execution)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!subscription}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={subscription ? "Leave blank to keep existing password" : "Enter MT5 trading password"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Risk Mode Selection */}
              <div className="space-y-2 border-t border-border/60 pt-3">
                <label className="font-semibold text-foreground block">Risk Sizing Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "MULTIPLIER" })}
                    className={cn(
                      "rounded-lg border p-2.5 text-center text-xs transition-all",
                      formData.riskMode === "MULTIPLIER"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div>Multiplier (x)</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">Scale with Master</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "FIXED_LOT" })}
                    className={cn(
                      "rounded-lg border p-2.5 text-center text-xs transition-all",
                      formData.riskMode === "FIXED_LOT"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div>Fixed Lot</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">e.g. Always 0.01</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "PROPORTIONAL_EQUITY" })}
                    className={cn(
                      "rounded-lg border p-2.5 text-center text-xs transition-all",
                      formData.riskMode === "PROPORTIONAL_EQUITY"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div>Auto Equity</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">Balance Ratio</div>
                  </button>
                </div>
              </div>

              {/* Risk Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formData.riskMode === "MULTIPLIER" && (
                  <div>
                    <label className="font-medium text-foreground block mb-1">Multiplier (0.1x - 3.0x)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={formData.multiplier}
                      onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1.0 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                    />
                  </div>
                )}

                {formData.riskMode === "FIXED_LOT" && (
                  <div>
                    <label className="font-medium text-foreground block mb-1">Fixed Lot Size</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1.0"
                      value={formData.fixedLot}
                      onChange={(e) => setFormData({ ...formData, fixedLot: parseFloat(e.target.value) || 0.01 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="font-medium text-foreground block mb-1">Max Lot Cap (Safeguard)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="5.0"
                    value={formData.maxLotLimit}
                    onChange={(e) => setFormData({ ...formData, maxLotLimit: parseFloat(e.target.value) || 0.50 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Drawdown Circuit Breaker (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="50"
                    value={formData.maxDrawdownGuard}
                    onChange={(e) => setFormData({ ...formData, maxDrawdownGuard: parseFloat(e.target.value) || 15.0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Save & Connect to Oracle VPS"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
