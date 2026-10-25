"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  CreditCard,
  Info,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
  MessageCircle,
  BadgePercent,
  Check,
  Copy,
  Users,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateCopyTradingTier } from "@/lib/copy-trading-risk";
import {
  submitStudentSubscriptionAction,
  toggleStudentCopyPauseAction,
  disconnectStudentSubscriptionAction,
  refreshStudentCopyTradingDataAction,
  StudentCopyTradingPayload,
  CopyTradingAffiliateInfo,
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
  initialAffiliateInfo?: CopyTradingAffiliateInfo;
  initialInvoices?: any[];
  initialVpsPayments?: any[];
  settings: Record<string, string>;
}

export function StudentCopyTradingClient({
  initialMaster,
  initialSubscription,
  initialLogs,
  initialAffiliateInfo,
  initialInvoices = [],
  initialVpsPayments = [],
}: StudentCopyTradingClientProps) {
  const router = useRouter();
  const [master, setMaster] = useState<MasterData | null>(initialMaster);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(initialSubscription);
  const [logs, setLogs] = useState<TradeLog[]>(initialLogs);
  const [affiliateInfo, setAffiliateInfo] = useState<CopyTradingAffiliateInfo | undefined>(initialAffiliateInfo);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [vpsPayments, setVpsPayments] = useState<any[]>(initialVpsPayments);

  const handleOpenConnectModal = () => {
    if (!affiliateInfo?.hostingStatus?.canConnect) {
      router.push("/dashboard/copy-trading/checkout");
      return;
    }
    setIsModalOpen(true);
  };

  const referralCode = affiliateInfo?.referralCode || "";
  const referralUrl =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `https://superwarrior30.com/register?ref=${referralCode}`;

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      toast.success("Affiliate referral link copied to clipboard!");
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch {
      toast.error("Failed to copy referral link.");
    }
  };

  // Form State
  const initialTier = calculateCopyTradingTier(subscription?.balance || 300);
  const [formData, setFormData] = useState<StudentCopyTradingPayload>({
    brokerName: "GTCFX",
    accountNumber: subscription?.accountNumber || "",
    serverName: subscription?.serverName || "GTCFX MT5 - Server 2",
    platform: (subscription?.platform as "MT5" | "MT4") || "MT5",
    password: "",
    accountCurrency: subscription?.accountCurrency || "USD",
    balance: subscription?.balance || 300,
    equity: subscription?.equity || (subscription?.balance || 300),
    riskMode: (subscription?.riskMode as any) || "FIXED_LOT",
    multiplier: subscription?.multiplier || 1.0,
    fixedLot: subscription?.fixedLot || initialTier.lotPerTrade,
    maxDrawdownGuard: 15.0,
    maxLotLimit: initialTier.totalMaxLotExposure,
  });

  const liveTier = calculateCopyTradingTier(formData.balance || 300);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountNumber.trim() || !formData.serverName.trim()) {
      toast.error("Please fill in your account number and broker server.");
      return;
    }
    if (!formData.balance || formData.balance <= 0) {
      toast.error("Please enter a valid initial balance.");
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
      if (freshData.affiliateInfo) setAffiliateInfo(freshData.affiliateInfo);
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Automated MT5 Copy Trading
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
              <Zap className="h-3 w-3" /> Live Master Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Mirror Rahul Trade Warrior Academy&apos;s verified trades directly into your MT4/MT5 account with ultra-low latency execution.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/copy-trading/settlement"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Weekly Settlement
          </Link>
          <Link
            href="/dashboard/copy-trading/checkout"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-accent/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Server className="h-3.5 w-3.5 text-primary" />
            Cloud VPS
          </Link>
          <button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            title="Fetch latest status from server"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>
      </div>

      {/* Last Refreshed Timestamp */}
      {lastRefreshedAt && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
      )}

      {/* Pending Weekly Settlement Alert Banner (USDT Blockchain Gateway) */}
      {invoices.some((inv: any) => inv.status === "PENDING") && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                Weekly Profit Sharing Settlement Due (30% USDT)
                <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  Monday Cycle Qualification
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Your 70% realized profit remains directly in your MT5 account. Please settle the 30% sharing in USDT (BEP-20) to qualify for next week&apos;s copy trading cycle (starting Monday).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/copy-trading/settlement"
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-2 text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              Verify on Blockchain (USDT) →
            </Link>
          </div>
        </div>
      )}

      {/* Course VIP Fee Exemption Benefit Banner */}
      {affiliateInfo?.has14999Course ? (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-primary/10 to-emerald-500/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-foreground text-sm">₹14,999 Course VIP Member</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                  100% Free Lifetime VPS + AMC
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Because you are enrolled in the ₹14,999 course, you do NOT need to pay the ₹1,999/month VPS + AMC fee. Your account runs 24/7 on dedicated cloud hosting at <strong>₹0 / month</strong>!
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-border/60 sm:pl-4 shrink-0">
            <div className="text-xs text-muted-foreground">Monthly VPS + AMC Fee</div>
            <div className="text-lg font-bold text-emerald-500">
              ₹0 <span className="text-xs text-muted-foreground line-through font-normal">₹1,999/mo</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground text-sm">Dedicated Cloud VPS &amp; AMC Hosting</span>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium">
                  Standard Plan
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard monthly hosting is ₹1,999/mo. <em>Enrolled ₹14,999 Masterclass students get 100% Free Lifetime VPS + AMC!</em>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-border/60 sm:pl-4 shrink-0">
            <div className="text-xs text-muted-foreground">Monthly Fee</div>
            <div className="text-base font-bold text-foreground">₹1,999 / mo</div>
          </div>
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

      {/* Official Copy Trading Risk & Lot Sizing Rules Banner */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Copy Trading Capital Protection &amp; Lot Sizing Rules
                <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                  100% Enforced
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Regardless of the lot size or risk taken on the Master account, your MT5 account strictly executes within these protective risk limits.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-accent/40 border border-border/60 p-3 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary"></span> Fixed Lot by Balance
            </span>
            <div className="font-bold text-foreground text-sm">
              0.01 Lot per $300
            </div>
            <p className="text-[11px] text-muted-foreground">
              0.01 lot for every $300 balance ($600 = 0.02, $1,200 = 0.04).
            </p>
          </div>

          <div className="rounded-lg bg-accent/40 border border-border/60 p-3 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Max Open Trades
            </span>
            <div className="font-bold text-foreground text-sm">
              Max 2 Trades Concurrent
            </div>
            <p className="text-[11px] text-muted-foreground">
              Maximum 2 open positions at a time (e.g. 0.01 + 0.01 for $300).
            </p>
          </div>

          <div className="rounded-lg bg-accent/40 border border-border/60 p-3 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Daily DD Limit (5%)
            </span>
            <div className="font-bold text-amber-500 text-sm">
              5% Daily Circuit Breaker
            </div>
            <p className="text-[11px] text-muted-foreground">
              Trading pauses for the day if 5% loss is hit; resumes next trading day.
            </p>
          </div>

          <div className="rounded-lg bg-accent/40 border border-border/60 p-3 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive"></span> Max DD Limit (15%)
            </span>
            <div className="font-bold text-destructive text-sm">
              15% Hard Exit Limit
            </div>
            <p className="text-[11px] text-muted-foreground">
              Account permanently exits copy trading if 15% total drawdown is reached.
            </p>
          </div>
        </div>

        {/* Lot Size & DD Scale Table */}
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-accent/60 text-muted-foreground font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Account Balance</th>
                <th className="py-2.5 px-3">Lot Per Trade</th>
                <th className="py-2.5 px-3">Max Open Trades</th>
                <th className="py-2.5 px-3">Max Lot Exposure</th>
                <th className="py-2.5 px-3">Daily DD Limit (5%)</th>
                <th className="py-2.5 px-3">Max DD Exit (15%)</th>
                <th className="py-2.5 px-3">Cutoff Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              <tr className="hover:bg-accent/30 transition-colors font-medium">
                <td className="py-2 px-3 font-mono font-bold text-primary">$300</td>
                <td className="py-2 px-3 font-mono">0.01 lot</td>
                <td className="py-2 px-3">2 trades</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">0.02 lot</td>
                <td className="py-2 px-3 font-mono text-amber-500">-$15.00</td>
                <td className="py-2 px-3 font-mono text-destructive">-$45.00</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">&lt; $255.00</td>
              </tr>
              <tr className="hover:bg-accent/30 transition-colors font-medium">
                <td className="py-2 px-3 font-mono font-bold text-primary">$600</td>
                <td className="py-2 px-3 font-mono">0.02 lot</td>
                <td className="py-2 px-3">2 trades</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">0.04 lot</td>
                <td className="py-2 px-3 font-mono text-amber-500">-$30.00</td>
                <td className="py-2 px-3 font-mono text-destructive">-$90.00</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">&lt; $510.00</td>
              </tr>
              <tr className="hover:bg-accent/30 transition-colors font-medium">
                <td className="py-2 px-3 font-mono font-bold text-primary">$900</td>
                <td className="py-2 px-3 font-mono">0.03 lot</td>
                <td className="py-2 px-3">2 trades</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">0.06 lot</td>
                <td className="py-2 px-3 font-mono text-amber-500">-$45.00</td>
                <td className="py-2 px-3 font-mono text-destructive">-$135.00</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">&lt; $765.00</td>
              </tr>
              <tr className="hover:bg-accent/30 transition-colors font-medium">
                <td className="py-2 px-3 font-mono font-bold text-primary">$1,200</td>
                <td className="py-2 px-3 font-mono">0.04 lot</td>
                <td className="py-2 px-3">2 trades</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">0.08 lot</td>
                <td className="py-2 px-3 font-mono text-amber-500">-$60.00</td>
                <td className="py-2 px-3 font-mono text-destructive">-$180.00</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">&lt; $1,020.00</td>
              </tr>
              <tr className="hover:bg-accent/30 transition-colors font-medium">
                <td className="py-2 px-3 font-mono font-bold text-primary">$1,500+</td>
                <td className="py-2 px-3 font-mono">0.05 lot</td>
                <td className="py-2 px-3">2 trades</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">0.10 lot</td>
                <td className="py-2 px-3 font-mono text-amber-500">-$75.00</td>
                <td className="py-2 px-3 font-mono text-destructive">-$225.00</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">&lt; $1,275.00</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
          <span>* Linear Progression: Each <strong>+$300 balance</strong> increments lot size by <strong>+0.01 lot</strong>. Maximum open positions at any time are strictly capped at <strong>2 trades</strong>.</span>
        </div>
      </div>

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
            <div className="flex flex-wrap items-center gap-2">
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
                Connect your GTCFX MT5 account under our IB. Our dedicated high-speed cloud VPS will copy all Gold &amp; BTC trades automatically with zero manual effort.
              </p>
            </div>
            <button
              onClick={handleOpenConnectModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" /> Connect My GTCFX MT5 Account
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
                  Your MT5 credentials for account <span className="font-mono font-medium text-foreground">#{subscription.accountNumber}</span> ({subscription.brokerName}) have been recorded. Admin is setting up a lightweight isolated terminal on our dedicated Cloud Trading VPS. You will be notified as soon as sync is live!
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
                  Slot #{subscription.vpsSlotNumber || "1"} ({subscription.vpsNode?.replace(/Oracle-Ampere-|Oracle-/gi, "Cloud-") || "Dedicated-Node1"})
                </p>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Latency / Ping:</span>
                <p className="font-semibold text-emerald-500 text-xs mt-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {subscription.latencyMs} ms
                </p>
              </div>

              <div className="rounded-lg bg-accent/40 border border-border/40 p-3">
                <span className="text-muted-foreground text-xs">Risk & Lot Size:</span>
                <p className="font-semibold text-foreground text-xs mt-1">
                  {calculateCopyTradingTier(subscription.balance).lotPerTrade} Lot / trade
                </p>
                <span className="text-[10px] text-muted-foreground block">Max 2 trades ({calculateCopyTradingTier(subscription.balance).totalMaxLotExposure} total)</span>
              </div>
            </div>

            {/* Account Info Pill */}
            <div className="rounded-lg bg-card border border-border/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">MT5 Login:</span>
                <span className="font-mono font-semibold text-foreground">#{subscription.accountNumber}</span>
                <span className="text-muted-foreground text-[11px]">({subscription.brokerName} - {subscription.serverName})</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <span>Balance: <strong className="text-foreground">${subscription.balance.toFixed(2)}</strong></span>
                <span>Equity: <strong className="text-foreground">${subscription.equity.toFixed(2)}</strong></span>
                <span>Daily DD Limit: <strong className="text-amber-500">5% (-${calculateCopyTradingTier(subscription.balance).dailyDDLimitUsd})</strong></span>
                <span>Max DD Cutoff: <strong className="text-destructive">15% (${calculateCopyTradingTier(subscription.balance).cutoffEquity})</strong></span>
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
          <div className="overflow-x-auto mt-4 -mx-5 px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[680px] text-left text-xs">
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

      {/* Copy Trading Affiliate & Weekly Settlement Program */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Copy Trading Affiliate &amp; Weekly Settlement
                </h3>
                <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold">
                  10% Profit Share
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Earn 10% commission on the weekly net profit of every investor who joins copy trading using your referral link.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Way Profit Split Card */}
        <div className="rounded-xl bg-gradient-to-br from-primary/5 via-accent/30 to-background border border-border/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BadgePercent className="h-4 w-4 text-primary" />
              Weekly Profit Sharing Structure
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              0% Fee Until Capital Recovered
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* 70% Investor */}
            <div className="rounded-lg bg-card border border-emerald-500/30 p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Investor Share</span>
              <div className="text-2xl font-black text-emerald-500">70%</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                The investor/student retains the dominant 70% of all weekly net profits directly in their own trading account.
              </p>
            </div>

            {/* 20% Academy */}
            <div className="rounded-lg bg-card border border-primary/30 p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 rounded-bl-full pointer-events-none"></div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Rahul Trade Warrior Academy</span>
              <div className="text-2xl font-black text-primary">20%</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Covers master trader execution, algorithmic trade management, and round-the-clock dedicated risk monitoring.
              </p>
            </div>

            {/* 10% Affiliate */}
            <div className="rounded-lg bg-card border border-amber-500/30 p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/10 rounded-bl-full pointer-events-none"></div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Affiliate Partner Share</span>
              <div className="text-2xl font-black text-amber-500">10%</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Paid out weekly to you on the net realized profits of the students/investors you referred.
              </p>
            </div>
          </div>
        </div>

        {/* Affiliate Link & Sharing Controls */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground block">
            Your Personal Copy Trading Referral Link
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="w-full rounded-lg border border-border bg-accent/40 px-3.5 py-2.5 text-xs text-foreground font-mono select-all"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyReferralLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-xs font-semibold transition-colors shrink-0 shadow-sm"
            >
              {copiedReferral ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Link
                </>
              )}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join SuperWarrior30 Copy Trading with Rahul Trade Warrior Academy! Automated Gold & BTC trading directly into your MT5 account. Register with my link: ${referralUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-semibold transition-colors shrink-0 shadow-sm"
            >
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </a>
          </div>
        </div>

        {/* Affiliate Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <span className="text-muted-foreground text-[11px] block">Total Referred</span>
            <strong className="text-lg font-bold text-foreground mt-0.5 block">
              {affiliateInfo?.totalReferredInvestors || 0}
            </strong>
            <span className="text-[10px] text-muted-foreground">Students registered</span>
          </div>

          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <span className="text-muted-foreground text-[11px] block">Active Copying</span>
            <strong className="text-lg font-bold text-emerald-500 mt-0.5 block">
              {affiliateInfo?.activeCopyingReferrals || 0}
            </strong>
            <span className="text-[10px] text-muted-foreground">Generating commissions</span>
          </div>

          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <span className="text-muted-foreground text-[11px] block">Weekly Commission</span>
            <strong className="text-lg font-bold text-amber-500 mt-0.5 block">10%</strong>
            <span className="text-[10px] text-muted-foreground">On weekly net profit</span>
          </div>

          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <span className="text-muted-foreground text-[11px] block">Your Hosting Fee</span>
            <strong className={cn("text-base font-bold mt-0.5 block", affiliateInfo?.has14999Course ? "text-emerald-500" : "text-foreground")}>
              {affiliateInfo?.has14999Course ? "₹0 (VIP Exempt)" : "₹1,999 / mo"}
            </strong>
            <span className="text-[10px] text-muted-foreground">
              {affiliateInfo?.has14999Course ? "₹14,999 Course Benefit" : "Standard Plan"}
            </span>
          </div>
        </div>

        {/* Referred Investors List (if any) */}
        {affiliateInfo?.referredUsers && affiliateInfo.referredUsers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-foreground block">
              Your Referred Investors ({affiliateInfo.referredUsers.length})
            </span>
            <div className="rounded-lg border border-border/60 overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] border-b border-border/60">
                  <tr>
                    <th className="py-2 px-3">Student Name</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Joined On</th>
                    <th className="py-2 px-3 text-right">Copy Trading Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {affiliateInfo.referredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground">{u.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{u.email}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(u.joinedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {u.isCopying ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                            🟢 Copying Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">
                            Registered
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Profit Sharing & Settlement Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Weekly Profit Sharing Settlement (70 / 20 / 10 in USDT)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              70% Kept in MT5 • 20% Academy Execution • 10% Affiliate Partner. (0% fee charged until initial capital is recovered. Paid in USDT BEP-20).
            </p>
          </div>
          <Link
            href="/dashboard/copy-trading/settlement"
            className="rounded-lg bg-primary text-primary-foreground font-bold px-3.5 py-1.5 text-xs shadow hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            Open Settlement Gateway →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">70% Student Share</span>
            <p className="text-xs text-muted-foreground mt-1">Kept directly in your MT5 trading balance.</p>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">20% Academy Share</span>
            <p className="text-xs text-muted-foreground mt-1">Platform management &amp; master execution.</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">10% Affiliate Share</span>
            <p className="text-xs text-muted-foreground mt-1">Credited directly to referring partner wallet.</p>
          </div>
        </div>
      </div>

      {/* SuperWarrior30 Copy Trading Highlights & Official FAQ (English) */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
        {/* Banner from Poster */}
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/5 border border-primary/20 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-bold">
                  BTC &amp; GOLD TRADING
                </span>
                <span className="rounded bg-emerald-500/15 text-emerald-500 px-2 py-0.5 text-[11px] font-semibold border border-emerald-500/20">
                  GTCFX Under Our IB
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                SuperWarrior30 Copy Trading • Follow Expert Trades In Your Own Account
              </h3>
              <p className="text-xs text-muted-foreground">
                Ideal for individuals who don&apos;t have time for live trading or cannot follow signal channels continuously.
              </p>
            </div>

            <a
              href="https://wa.me/919580957721?text=Hi%20SuperWarrior30,%20I%20want%20to%20start%20Copy%20Trading%20in%20GTCFX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold shadow transition-colors shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp: +91 95809 57721</span>
            </a>
          </div>

          {/* 4 Feature Badges from Poster */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-border/50 text-[11px]">
            <div className="rounded-lg bg-background/60 border border-border/40 p-2.5">
              <span className="text-muted-foreground block text-[10px]">Execution:</span>
              <strong className="text-foreground">In Your Own Trading Account</strong>
            </div>
            <div className="rounded-lg bg-background/60 border border-border/40 p-2.5">
              <span className="text-muted-foreground block text-[10px]">Manual Effort:</span>
              <strong className="text-foreground">100% Automated (Zero Copying)</strong>
            </div>
            <div className="rounded-lg bg-background/60 border border-border/40 p-2.5">
              <span className="text-muted-foreground block text-[10px]">Profit Sharing:</span>
              <strong className="text-emerald-500">70% / 20% / 10% (0% till capital recovered)</strong>
            </div>
            <div className="rounded-lg bg-background/60 border border-border/40 p-2.5">
              <span className="text-muted-foreground block text-[10px]">Monthly VPS + AMC Fee:</span>
              <strong className={affiliateInfo?.has14999Course ? "text-emerald-500 font-bold" : "text-foreground"}>
                {affiliateInfo?.has14999Course ? "₹0 / Free (Course VIP)" : "₹1,999 / month"}
              </strong>
            </div>
          </div>
        </div>

        {/* FAQ Grid */}
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            Frequently Asked Questions &amp; Copy Trading Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                1. What is SuperWarrior30 Copy Trading and how does it work?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                High-probability positions executed by our Master Trader on <strong>Gold (XAUUSD) and Bitcoin (BTC)</strong> are automatically mirrored into your personal account in real-time. There is zero manual effort or screen-watching needed.
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                2. Which broker is supported and how do I register?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Copy trading is exclusively supported on <strong>GTCFX</strong> under our official IB. You must register your MT5 account under our IB link. The dedicated server for live sync is <strong>GTCFX MT5 - Server 2</strong>.
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                3. How does the Profit Sharing policy work?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                We follow an unmatched student-friendly policy: <strong>0% profit sharing until your initial capital is 100% recovered!</strong> Once in net profit, weekly settlements follow a transparent 3-way split: <strong>70% retained by the Investor</strong>, <strong>20% to Rahul Trade Warrior Academy</strong>, and <strong>10% Affiliate Commission</strong> to the partner who referred you.
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                4. What is the Monthly Fee and do ₹14,999 Course students need to pay?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                The standard fee is <strong>₹1,999 per month</strong> covering high-speed Cloud VPS hosting, 24/7 terminal uptime, and zero-latency execution. <strong>Special Exemption:</strong> Students who enrolled in the <strong>₹14,999 Institutional Masterclass</strong> do NOT pay this fee—they receive <strong>100% FREE Lifetime VPS + AMC hosting!</strong>
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                5. Are my funds and capital secure?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Yes, 100% safe.</strong> Your capital remains exclusively in your own GTCFX account. Your <strong>Trading password</strong> is used only for executing copied trades in your terminal. Withdrawals cannot be made from MT5—only you can deposit or withdraw money from your GTCFX client portal.
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                6. Do I need to keep my laptop or mobile phone powered on 24/7?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                <strong>No!</strong> Your copy terminal operates 24/7 on our dedicated cloud VPS cluster. Trades copy flawlessly in real-time even when your phone, computer, or internet connection is switched off.
              </p>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                7. What are the essential risk rules I must follow?
              </h4>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Don&apos;t chase during open trade:</strong> Never manually interfere or close trades early.</li>
                <li><strong>Patience and consistency:</strong> Allow the tested strategy to perform through complete market cycles.</li>
                <li><strong>Risk awareness:</strong> Trading financial markets carries risk. Profits are not guaranteed.</li>
              </ul>
            </div>

            <div className="rounded-lg bg-accent/30 border border-border/40 p-4 space-y-1.5">
              <h4 className="font-semibold text-foreground">
                8. How do I get my GTCFX account link or onboarding assistance?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Connect directly with our team on WhatsApp at <strong className="text-foreground">+91 95809 57721</strong>. We will guide you step-by-step through account creation under our IB, fund deposit, and live terminal synchronization.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 p-4 sm:p-5 shrink-0 bg-card">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Connect MT4 / MT5 Account
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Credentials are encrypted and loaded directly into your isolated VPS slot.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground text-sm transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleConnectSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Hosting Fee Status in Modal */}
              {!affiliateInfo?.hostingStatus?.canConnect ? (
                <div className="rounded-xl border border-primary/40 bg-card p-5 text-center space-y-4 my-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Server className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">Dedicated Cloud VPS Hosting Required</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Each student account requires a dedicated isolated Cloud VPS (₹1,999/month) to run and copy trades 24/7 without terminal downtime. (₹14,999 Course students get 1st year free).
                    </p>
                  </div>
                  <Link
                    href="/dashboard/copy-trading/checkout"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold shadow hover:bg-primary/90 transition-colors"
                  >
                    <CreditCard className="h-4 w-4" /> Pay ₹1,999 VPS Hosting Fee &amp; Unlock Form →
                  </Link>
                </div>
              ) : affiliateInfo?.hostingStatus?.isOneYearExempt ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-foreground text-xs block">₹14,999 Course VIP Member</span>
                      <span className="text-[11px] text-muted-foreground">
                        1-Year Free Dedicated Cloud VPS Hosting ({affiliateInfo.hostingStatus.exemptionDaysRemaining} days remaining)
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-500/20 text-emerald-500 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                    ₹0 / Month (1-Yr Free)
                  </span>
                </div>
              ) : affiliateInfo?.hostingStatus?.hasActiveVpsPayment ? (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="font-bold text-foreground text-xs block">Dedicated Cloud VPS Active</span>
                      <span className="text-[11px] text-muted-foreground">
                        Valid till {affiliateInfo.hostingStatus.vpsPaymentExpiresAt ? new Date(affiliateInfo.hostingStatus.vpsPaymentExpiresAt).toLocaleDateString("en-IN") : "Active period"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-primary/20 text-primary px-2.5 py-0.5 text-[10px] font-bold border border-primary/30">
                    Active
                  </span>
                </div>
              ) : null}

              {/* Platform & Broker Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs"
                  >
                    <option value="MT5">MetaTrader 5 (MT5 - Recommended)</option>
                    <option value="MT4">MetaTrader 4 (MT4)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Broker Name</label>
                  <select
                    value={formData.brokerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        brokerName: val,
                        serverName: val === "GTCFX" ? "GTCFX MT5 - Server 2" : formData.serverName,
                      });
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs font-semibold"
                  >
                    <option value="GTCFX">GTCFX</option>
                  </select>
                </div>
              </div>

              {/* Account Number & Broker Server Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Login / Account Number</label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. 14920391"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Broker Server Name</label>
                  <input
                    type="text"
                    required
                    value={formData.serverName}
                    onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                    placeholder="GTCFX MT5 - Server 2"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              {/* Initial Balance & Trading Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Initial Balance ($ USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={formData.balance || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const tier = calculateCopyTradingTier(val);
                      setFormData({
                        ...formData,
                        balance: val,
                        equity: val,
                        fixedLot: tier.lotPerTrade,
                        maxLotLimit: tier.totalMaxLotExposure,
                      });
                    }}
                    placeholder="e.g. 300, 600, 1200"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Your starting balance in GTCFX account.</p>
                </div>

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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Trading password.</p>
                </div>
              </div>

              {/* Dynamic Risk Sizing & DD Rules Live Preview */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-xs text-foreground">
                      Copy Trading Risk Rules (Enforced by System)
                    </span>
                  </div>
                  <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">
                    Linear Lot Guard
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="rounded-lg bg-background/90 border border-border/60 p-2 text-center">
                    <span className="text-muted-foreground block text-[10px]">Lot Size / Trade</span>
                    <strong className="text-primary text-xs mt-0.5 block">{liveTier.lotPerTrade} Lot</strong>
                    <span className="text-[9px] text-muted-foreground">$300 = 0.01 lot</span>
                  </div>

                  <div className="rounded-lg bg-background/90 border border-border/60 p-2 text-center">
                    <span className="text-muted-foreground block text-[10px]">Max Open Trades</span>
                    <strong className="text-foreground text-xs mt-0.5 block">Max 2 Trades</strong>
                    <span className="text-[9px] text-muted-foreground">Max {liveTier.totalMaxLotExposure} lot</span>
                  </div>

                  <div className="rounded-lg bg-background/90 border border-border/60 p-2 text-center">
                    <span className="text-muted-foreground block text-[10px]">Daily DD Limit (5%)</span>
                    <strong className="text-amber-500 text-xs mt-0.5 block">-${liveTier.dailyDDLimitUsd}</strong>
                    <span className="text-[9px] text-muted-foreground">Pause for day</span>
                  </div>

                  <div className="rounded-lg bg-background/90 border border-border/60 p-2 text-center">
                    <span className="text-muted-foreground block text-[10px]">Max DD Limit (15%)</span>
                    <strong className="text-destructive text-xs mt-0.5 block">-${liveTier.maxDDLimitUsd}</strong>
                    <span className="text-[9px] text-muted-foreground">Exit below ${liveTier.cutoffEquity}</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-normal">
                  💡 <strong>Protection Rule:</strong> Regardless of master lot size or risk, your account strictly trades <strong>{liveTier.lotPerTrade} lot</strong> with a maximum of <strong>2 concurrent trades</strong>. Reaching 5% daily loss halts trading for the day, and reaching 15% overall drawdown permanently disconnects the account.
                </p>
              </div>

              {/* WhatsApp IB Account Assistance Banner */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-xs">
                  <span className="font-semibold text-emerald-500">Need a GTCFX Account under our IB?</span>
                  <p className="text-[11px] text-muted-foreground">Open your account under our IB to activate zero-fee copy trading sync.</p>
                </div>
                <a
                  href="https://wa.me/919580957721?text=Hi%20SuperWarrior30,%20I%20need%20the%20GTCFX%20IB%20account%20opening%20link%20for%20Copy%20Trading"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-semibold shrink-0 transition-colors w-full sm:w-auto"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Help
                </a>
              </div>

              {/* Risk Mode Selection */}
              <div className="space-y-2 border-t border-border/60 pt-3">
                <label className="font-semibold text-foreground block">Risk Sizing Mode</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "MULTIPLIER" })}
                    className={cn(
                      "rounded-lg border p-2 sm:p-2.5 text-center transition-all",
                      formData.riskMode === "MULTIPLIER"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="text-[11px] sm:text-xs">Multiplier (x)</div>
                    <div className="text-[9px] sm:text-[10px] font-normal opacity-80 mt-0.5">Scale with Master</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "FIXED_LOT" })}
                    className={cn(
                      "rounded-lg border p-2 sm:p-2.5 text-center transition-all",
                      formData.riskMode === "FIXED_LOT"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="text-[11px] sm:text-xs">Fixed Lot</div>
                    <div className="text-[9px] sm:text-[10px] font-normal opacity-80 mt-0.5">e.g. Always 0.01</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, riskMode: "PROPORTIONAL_EQUITY" })}
                    className={cn(
                      "rounded-lg border p-2 sm:p-2.5 text-center transition-all",
                      formData.riskMode === "PROPORTIONAL_EQUITY"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="text-[11px] sm:text-xs">Auto Equity</div>
                    <div className="text-[9px] sm:text-[10px] font-normal opacity-80 mt-0.5">Balance Ratio</div>
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs"
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs"
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
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs"
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
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="sticky bottom-0 bg-card pt-4 border-t border-border/60 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Save & Connect Account"
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
