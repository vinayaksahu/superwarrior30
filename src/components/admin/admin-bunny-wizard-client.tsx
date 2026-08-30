"use client";

import { useState } from "react";
import {
  Sparkles,
  Key,
  Database,
  Cloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  FileText,
  Video,
  Radio,
  Layers,
  Settings2,
  Check,
  X,
  Play,
  Copy,
  Lock,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PublicAdminBunnyConfig,
  connectBunnyApiKeyAction,
  autoProvisionStorageAndCdnAction,
  saveLmsMediaConfigAction,
  runBunnyDiagnosticsAction,
  finalizeProductionReadyAction,
  disconnectBunnyAction,
} from "@/server/actions/bunny-admin.actions";
import { BunnyAccountResources, TestResultItem } from "@/lib/bunny/service";

interface AdminBunnyWizardClientProps {
  initialConfig: PublicAdminBunnyConfig;
}

export function AdminBunnyWizardClient({ initialConfig }: AdminBunnyWizardClientProps) {
  const router = useRouter();

  // Wizard Step State (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (!initialConfig.hasAccountKey) return 1;
    if (!initialConfig.storageZoneName) return 3;
    if (!initialConfig.isProductionReady) return 5;
    return 6;
  });

  const [config, setConfig] = useState<PublicAdminBunnyConfig>(initialConfig);

  // Step 1: Connect API Key State
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [discoveredResources, setDiscoveredResources] = useState<BunnyAccountResources | null>(null);

  // Step 3: Provisioning State
  const [provisionMode, setProvisionMode] = useState<"AUTO_CREATE" | "SELECT_EXISTING">("AUTO_CREATE");
  const [newStorageName, setNewStorageName] = useState(`lms-prod-storage-${Date.now().toString().slice(-4)}`);
  const [storageRegion, setStorageRegion] = useState("DE");
  const [newPullName, setNewPullName] = useState(`lms-prod-cdn-${Date.now().toString().slice(-4)}`);
  const [newStreamName, setNewStreamName] = useState("LMS Production Academy");

  const [selectedStorageZoneId, setSelectedStorageZoneId] = useState<string>("");
  const [selectedPullZoneId, setSelectedPullZoneId] = useState<string>("");
  const [selectedStreamLibraryId, setSelectedStreamLibraryId] = useState<string>("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Step 4: LMS Media Configuration Form
  const [storageZoneNameInput, setStorageZoneNameInput] = useState(config.storageZoneName || "");
  const [storagePasswordInput, setStoragePasswordInput] = useState("");
  const [cdnHostnameInput, setCdnHostnameInput] = useState(config.cdnHostname || "");
  const [streamLibraryIdInput, setStreamLibraryIdInput] = useState(config.streamLibraryId || "");
  const [streamApiKeyInput, setStreamApiKeyInput] = useState("");
  const [tokenSecurityKeyInput, setTokenSecurityKeyInput] = useState("");
  const [enableTokenAuthInput, setEnableTokenAuthInput] = useState(config.enableTokenAuth || false);
  const [isSavingMediaConfig, setIsSavingMediaConfig] = useState(false);

  // Step 5: Live Test Suite State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResultItem[]>(() => {
    return (config.testResults?.tests as TestResultItem[]) || [];
  });

  // Step 6: Activation State
  const [isActivating, setIsActivating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ==========================================
  // STEP 1 & 2: Connect Bunny API Key
  // ==========================================
  const handleConnectApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      toast.error("Please enter your Bunny.net Account API Key.");
      return;
    }

    setIsConnecting(true);
    try {
      const res = await connectBunnyApiKeyAction(apiKeyInput.trim());
      if (res.success && res.resources) {
        toast.success(res.message);
        setDiscoveredResources(res.resources);
        setApiKeyInput("");
        router.refresh();
        setCurrentStep(2);
      } else {
        toast.error(res.message || "Failed to authenticate with Bunny.net.");
      }
    } catch (err: any) {
      toast.error(err.message || "Connection error.");
    } finally {
      setIsConnecting(false);
    }
  };

  // ==========================================
  // STEP 3: Auto-Provision or Map Resources
  // ==========================================
  const handleProvisionStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);

    try {
      if (provisionMode === "AUTO_CREATE") {
        const res = await autoProvisionStorageAndCdnAction({
          actionType: "AUTO_CREATE_ALL",
          newStorageZoneName: newStorageName.trim(),
          storageRegion,
          newPullZoneName: newPullName.trim(),
          newStreamLibraryName: newStreamName.trim(),
        });

        if (res.success && res.config) {
          toast.success(res.message);
          setStorageZoneNameInput(res.config.storageZoneName || "");
          setCdnHostnameInput(res.config.cdnHostname || "");
          setStreamLibraryIdInput(res.config.streamLibraryId || "");
          router.refresh();
          setCurrentStep(4);
        } else {
          toast.error(res.message || "Failed to auto-create Bunny resources.");
        }
      } else {
        const res = await autoProvisionStorageAndCdnAction({
          actionType: "MAP_EXISTING",
          selectedStorageZoneId,
          selectedPullZoneId,
          selectedStreamLibraryId,
        });

        if (res.success && res.config) {
          toast.success(res.message);
          setStorageZoneNameInput(res.config.storageZoneName || "");
          setCdnHostnameInput(res.config.cdnHostname || "");
          setStreamLibraryIdInput(res.config.streamLibraryId || "");
          router.refresh();
          setCurrentStep(4);
        } else {
          toast.error(res.message || "Failed to map selected resources.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Provisioning error.");
    } finally {
      setIsProvisioning(false);
    }
  };

  // ==========================================
  // STEP 4: Save LMS Media Configuration
  // ==========================================
  const handleSaveMediaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storageZoneNameInput.trim() || !cdnHostnameInput.trim()) {
      toast.error("Storage Zone Name and CDN Hostname are required.");
      return;
    }

    setIsSavingMediaConfig(true);
    try {
      const res = await saveLmsMediaConfigAction({
        storageZoneName: storageZoneNameInput.trim(),
        storagePassword: storagePasswordInput.trim() || undefined,
        cdnHostname: cdnHostnameInput.trim(),
        streamLibraryId: streamLibraryIdInput.trim() || undefined,
        streamApiKey: streamApiKeyInput.trim() || undefined,
        tokenSecurityKey: tokenSecurityKeyInput.trim() || undefined,
        enableTokenAuth: enableTokenAuthInput,
      });

      if (res.success) {
        toast.success(res.message);
        router.refresh();
        setCurrentStep(5);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save media config.");
    } finally {
      setIsSavingMediaConfig(false);
    }
  };

  // ==========================================
  // STEP 5: Run Diagnostics Tests
  // ==========================================
  const handleRunSingleTest = async (
    scope: "CONNECTION" | "PDF_UPLOAD" | "PDF_DELIVERY" | "VIDEO_UPLOAD" | "VIDEO_DELIVERY"
  ) => {
    setRunningTestId(scope);
    try {
      const diag = await runBunnyDiagnosticsAction(scope);
      setTestResults((prev) => {
        const filtered = prev.filter((p) => !diag.tests.some((n) => n.id === p.id));
        return [...filtered, ...diag.tests];
      });

      const passed = diag.tests.every((t) => t.success);
      if (passed) {
        toast.success(`${scope} test passed!`);
      } else {
        toast.error(`${scope} test failed. Review error message below.`);
      }
    } catch (err: any) {
      toast.error(`Test execution failed: ${err.message}`);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunAllTests = async () => {
    setIsRunningTests(true);
    try {
      const diag = await runBunnyDiagnosticsAction("ALL");
      setTestResults(diag.tests);

      if (diag.overallSuccess) {
        toast.success("All 5 Bunny diagnostic tests passed successfully!");
      } else {
        toast.warning("Some diagnostic tests failed. Review the technical log below.");
      }
    } catch (err: any) {
      toast.error(`Test suite failed: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // ==========================================
  // STEP 6: Production Activation
  // ==========================================
  const handleFinalizeProduction = async () => {
    setIsActivating(true);
    try {
      const res = await finalizeProductionReadyAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to activate production mode.");
    } finally {
      setIsActivating(false);
    }
  };

  // Disconnect Handler
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this Bunny.net account? Client media uploads will be paused until reconnected.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await disconnectBunnyAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
        setCurrentStep(1);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const stepLabels = [
    { num: 1, title: "Connect API", icon: Key },
    { num: 2, title: "Detect Account", icon: Search },
    { num: 3, title: "Storage & CDN", icon: Database },
    { num: 4, title: "LMS Media Config", icon: Settings2 },
    { num: 5, title: "Test Connection", icon: Play },
    { num: 6, title: "Production Ready", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link href="/admin/settings" className="hover:text-foreground transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-foreground">Media Storage</span>
            <span>/</span>
            <span className="text-amber-400 font-bold">Bunny.net CDN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Cloud className="h-5 w-5" />
            </span>
            Bunny.net Production Setup Wizard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Connect the client&apos;s Bunny.net production account for high-speed video streaming, PDF storage, and CDN delivery.
          </p>
        </div>

        {config.hasAccountKey && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={handleDisconnect}
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Disconnect Account
            </button>
          </div>
        )}
      </div>

      {/* Production Status & Overview Banner */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                config.isProductionReady
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : config.hasAccountKey
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {config.isProductionReady ? (
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              ) : config.hasAccountKey ? (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              ) : (
                <Cloud className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Bunny CDN Infrastructure
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                    config.isProductionReady
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : config.hasAccountKey
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {config.isProductionReady
                    ? "PRODUCTION READY"
                    : config.hasAccountKey
                    ? "CONNECTED (SETUP IN PROGRESS)"
                    : "NOT CONFIGURED"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Provider Source: <strong>{config.source}</strong> &middot; Environment:{" "}
                <strong className="capitalize">{config.environment}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRunAllTests()}
              disabled={isRunningTests || !config.storageZoneName}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              {isRunningTests ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run All Tests
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-background/60 p-3 border border-border/50">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block">Storage Zone</span>
            <span className="font-bold text-foreground font-mono truncate block">
              {config.storageZoneName || "Not configured"}
            </span>
          </div>

          <div className="rounded-xl bg-background/60 p-3 border border-border/50">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block">CDN Hostname</span>
            <span className="font-bold text-foreground font-mono truncate block">
              {config.cdnHostname || "Not configured"}
            </span>
          </div>

          <div className="rounded-xl bg-background/60 p-3 border border-border/50">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block">Video Library ID</span>
            <span className="font-bold text-foreground font-mono truncate block">
              {config.streamLibraryId || "Not configured"}
            </span>
          </div>

          <div className="rounded-xl bg-background/60 p-3 border border-border/50">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block">Last Verification</span>
            <span className="font-bold text-foreground">
              {config.lastTestedAt ? new Date(config.lastTestedAt).toLocaleDateString() : "Never"}
            </span>
          </div>
        </div>

        {(config.lastActivatedAt || config.configuredBy) && (
          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 px-1 border-t border-border/40">
            <span>
              Configured By: <strong className="text-foreground">{config.configuredBy || "Super Admin"}</strong>
            </span>
            {config.lastActivatedAt && (
              <span>
                Last Activated: <strong className="text-foreground">{new Date(config.lastActivatedAt).toLocaleString()}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 6-Step Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stepLabels.map((step) => {
          const isCurrent = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          const Icon = step.icon;

          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setCurrentStep(step.num)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isCurrent
                  ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30"
                  : isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground hover:text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-extrabold uppercase font-mono text-muted-foreground">
                  Step {step.num}
                </span>
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-amber-400" : "text-muted-foreground"}`} />
                )}
              </div>
              <span className={`text-xs font-bold ${isCurrent ? "text-foreground font-black" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Connect Bunny API Key */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" />
              STEP 1 — Connect Bunny Account API Key
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Provide the client&apos;s Global Account API Key. The LMS will authenticate with Bunny.net and discover all existing storage zones, CDN pull zones, and stream libraries.
            </p>
          </div>

          <div className="rounded-xl bg-background/80 p-4 border border-border/60 text-xs space-y-2">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" /> Where to find the Account API Key?
            </p>
            <p className="text-muted-foreground leading-relaxed">
              1. Log into the client&apos;s Bunny.net dashboard at{" "}
              <a href="https://dash.bunny.net" target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5">
                dash.bunny.net <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              2. Go to <strong>Account Settings</strong> → <strong>API</strong>.
              <br />
              3. Copy the <strong>Account API Key</strong> and paste it below.
            </p>
          </div>

          {config.hasAccountKey && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Current API Key Connected: <strong>{config.accountApiKeyMasked}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 px-2 py-0.5 rounded">
                Encrypted at rest
              </span>
            </div>
          )}

          <form onSubmit={handleConnectApiKey} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {config.hasAccountKey ? "Replace / Update Account API Key" : "Enter Account API Key"} *
              </label>
              <input
                type="password"
                required
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="e.g. 54a8b792-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Credentials are encrypted using AES-256-GCM and never exposed to client browsers or logs.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span />
              <button
                type="submit"
                disabled={isConnecting || !apiKeyInput.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Bunny.net...
                  </>
                ) : (
                  <>
                    Connect &amp; Discover Resources <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Detect Account & Resource Discovery */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              STEP 2 — Account Verified &amp; Discovered Resources
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Bunny.net credentials authenticated successfully. Below are the storage zones, CDN pull zones, and stream video libraries currently detected.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Storage Zones</span>
              <p className="text-xl font-bold text-foreground">
                {discoveredResources?.storageZones.length || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">PDFs &amp; thumbnails</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Pull Zones (CDN)</span>
              <p className="text-xl font-bold text-foreground">
                {discoveredResources?.pullZones.length || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Edge delivery network</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Stream Video Libraries</span>
              <p className="text-xl font-bold text-foreground">
                {discoveredResources?.videoLibraries.length || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">HLS video transcoding</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              Continue to Storage &amp; CDN Setup <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Production Storage & CDN Provisioning */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              STEP 3 — Production Storage &amp; CDN Provisioning
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically create dedicated production resources or select existing zones from the connected account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvisionMode("AUTO_CREATE")}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                provisionMode === "AUTO_CREATE"
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30"
                  : "border-border bg-background hover:border-border/80"
              }`}
            >
              <span className="text-xs font-bold text-foreground block mb-1">
                ⚡ Option A: 1-Click Auto-Provision (Recommended)
              </span>
              <p className="text-[11px] text-muted-foreground">
                LMS will automatically create a Storage Zone, Pull Zone CDN, and Video Library via Bunny API.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProvisionMode("SELECT_EXISTING")}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                provisionMode === "SELECT_EXISTING"
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30"
                  : "border-border bg-background hover:border-border/80"
              }`}
            >
              <span className="text-xs font-bold text-foreground block mb-1">
                📂 Option B: Map Existing Resources
              </span>
              <p className="text-[11px] text-muted-foreground">
                Select from existing Storage Zones, Pull Zones, or Video Libraries found in this Bunny account.
              </p>
            </button>
          </div>

          <form onSubmit={handleProvisionStorage} className="space-y-4">
            {provisionMode === "AUTO_CREATE" ? (
              <div className="space-y-3 rounded-xl bg-background/50 p-4 border border-border">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    New Storage Zone Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStorageName}
                    onChange={(e) => setNewStorageName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Storage Region
                    </label>
                    <select
                      value={storageRegion}
                      onChange={(e) => setStorageRegion(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="DE">Germany (Falkenstein) - Standard Europe</option>
                      <option value="NY">US East (New York)</option>
                      <option value="LA">US West (Los Angeles)</option>
                      <option value="SG">Singapore (Asia)</option>
                      <option value="SYD">Sydney (Oceania)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      New Pull Zone (CDN) Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newPullName}
                      onChange={(e) => setNewPullName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    New Stream Video Library Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl bg-background/50 p-4 border border-border">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Select Storage Zone
                  </label>
                  <select
                    value={selectedStorageZoneId}
                    onChange={(e) => setSelectedStorageZoneId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Choose Storage Zone --</option>
                    {discoveredResources?.storageZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.region}) - {z.filesStored} files
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Select Pull Zone (CDN)
                  </label>
                  <select
                    value={selectedPullZoneId}
                    onChange={(e) => setSelectedPullZoneId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Choose Pull Zone --</option>
                    {discoveredResources?.pullZones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.primaryHostname})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Select Stream Video Library
                  </label>
                  <select
                    value={selectedStreamLibraryId}
                    onChange={(e) => setSelectedStreamLibraryId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Choose Video Library --</option>
                    {discoveredResources?.videoLibraries.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Library #{v.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <button
                type="submit"
                disabled={isProvisioning}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Resources...
                  </>
                ) : (
                  <>
                    Provision &amp; Configure <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: LMS Media Configuration Details */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-amber-400" />
              STEP 4 — LMS Media &amp; Token Auth Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Review and fine-tune the exact storage paths, CDN hostnames, and stream credentials used by LMS lessons and courses.
            </p>
          </div>

          <form onSubmit={handleSaveMediaConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Storage Zone Name *
                </label>
                <input
                  type="text"
                  required
                  value={storageZoneNameInput}
                  onChange={(e) => setStorageZoneNameInput(e.target.value)}
                  placeholder="e.g. lms-storage-prod"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Storage Password / AccessKey {config.hasStoragePassword && "(Leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={storagePasswordInput}
                  onChange={(e) => setStoragePasswordInput(e.target.value)}
                  placeholder={config.hasStoragePassword ? config.storagePasswordMasked : "Enter Storage Password"}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  CDN Pull Zone Hostname *
                </label>
                <input
                  type="text"
                  required
                  value={cdnHostnameInput}
                  onChange={(e) => setCdnHostnameInput(e.target.value)}
                  placeholder="e.g. lms-cdn.b-cdn.net or cdn.yourdomain.com"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Public delivery domain for PDFs and course thumbnails.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Stream Library ID
                </label>
                <input
                  type="text"
                  value={streamLibraryIdInput}
                  onChange={(e) => setStreamLibraryIdInput(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Stream API Key {config.hasStreamApiKey && "(Leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={streamApiKeyInput}
                  onChange={(e) => setStreamApiKeyInput(e.target.value)}
                  placeholder={config.hasStreamApiKey ? config.streamApiKeyMasked : "Enter Stream API Key"}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 rounded-xl bg-background/50 p-4 border border-border space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableTokenAuthInput}
                    onChange={(e) => setEnableTokenAuthInput(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Enable Bunny Token Authentication (URL Signing)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Generates short-lived SHA256 signed URLs for private PDF downloads to prevent unauthorized hotlinking.
                    </p>
                  </div>
                </label>

                {enableTokenAuthInput && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Bunny Token Authentication Security Key
                    </label>
                    <input
                      type="password"
                      value={tokenSecurityKeyInput}
                      onChange={(e) => setTokenSecurityKeyInput(e.target.value)}
                      placeholder={config.hasTokenKey ? config.tokenSecurityKeyMasked : "Enter Token Security Key"}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <button
                type="submit"
                disabled={isSavingMediaConfig}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingMediaConfig ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Configuration...
                  </>
                ) : (
                  <>
                    Save &amp; Continue to Live Diagnostics <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: Interactive Diagnostics Test Suite */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Play className="h-4 w-4 text-amber-400" />
                STEP 5 — Live Connection &amp; Media Diagnostics
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Execute live tests to verify storage uploads, CDN edge delivery, and video streaming endpoints.
              </p>
            </div>

            <button
              type="button"
              disabled={isRunningTests}
              onClick={handleRunAllTests}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running All Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" /> Run All 5 Tests
                </>
              )}
            </button>
          </div>

          {/* Test Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Test 1: Storage Connection */}
            <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">1. Storage API Connection</p>
                <p className="text-[11px] text-muted-foreground">Authenticates with Storage Zone</p>
              </div>
              <button
                type="button"
                disabled={Boolean(runningTestId)}
                onClick={() => handleRunSingleTest("CONNECTION")}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                {runningTestId === "CONNECTION" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </button>
            </div>

            {/* Test 2: PDF Upload */}
            <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">2. Test PDF Upload</p>
                <p className="text-[11px] text-muted-foreground">Uploads health check probe file</p>
              </div>
              <button
                type="button"
                disabled={Boolean(runningTestId)}
                onClick={() => handleRunSingleTest("PDF_UPLOAD")}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                {runningTestId === "PDF_UPLOAD" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </button>
            </div>

            {/* Test 3: PDF Delivery */}
            <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">3. Test PDF Delivery</p>
                <p className="text-[11px] text-muted-foreground">Verifies CDN URL reachability</p>
              </div>
              <button
                type="button"
                disabled={Boolean(runningTestId)}
                onClick={() => handleRunSingleTest("PDF_DELIVERY")}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                {runningTestId === "PDF_DELIVERY" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </button>
            </div>

            {/* Test 4: Video Upload */}
            <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">4. Test Video Upload</p>
                <p className="text-[11px] text-muted-foreground">Creates Stream Library entry</p>
              </div>
              <button
                type="button"
                disabled={Boolean(runningTestId)}
                onClick={() => handleRunSingleTest("VIDEO_UPLOAD")}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                {runningTestId === "VIDEO_UPLOAD" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </button>
            </div>

            {/* Test 5: Video Delivery */}
            <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-3 sm:col-span-2">
              <div>
                <p className="text-xs font-bold text-foreground">5. Test Video Delivery</p>
                <p className="text-[11px] text-muted-foreground">Validates player embed gateway and HLS endpoint</p>
              </div>
              <button
                type="button"
                disabled={Boolean(runningTestId)}
                onClick={() => handleRunSingleTest("VIDEO_DELIVERY")}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                {runningTestId === "VIDEO_DELIVERY" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </button>
            </div>
          </div>

          {/* Test Results Log */}
          {testResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Diagnostic Results ({testResults.filter((t) => t.success).length}/{testResults.length} Passed)
              </h4>
              <div className="space-y-2">
                {testResults.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3 text-xs flex items-start justify-between gap-3 ${
                      t.success
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        : "border-destructive/30 bg-destructive/5 text-destructive"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {t.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold text-foreground">{t.name}</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed">{t.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-70 shrink-0">{t.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              Proceed to Activation <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: Save & Activate Production Configuration */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 max-w-3xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              STEP 6 — Production Configuration &amp; Final Activation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Verify your setup and mark the Bunny.net media integration as active for the entire LMS.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Production Configuration Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border/50">
                <span className="text-[10px] text-muted-foreground font-mono uppercase block">Storage Zone</span>
                <span className="font-bold text-foreground font-mono">{config.storageZoneName || "—"}</span>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50">
                <span className="text-[10px] text-muted-foreground font-mono uppercase block">CDN Hostname</span>
                <span className="font-bold text-foreground font-mono">{config.cdnHostname || "—"}</span>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50">
                <span className="text-[10px] text-muted-foreground font-mono uppercase block">Stream Library ID</span>
                <span className="font-bold text-foreground font-mono">{config.streamLibraryId || "—"}</span>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50">
                <span className="text-[10px] text-muted-foreground font-mono uppercase block">Token URL Signing</span>
                <span className="font-bold text-foreground">
                  {config.enableTokenAuth ? "Enabled (Signed SHA256)" : "Disabled (Public CDN)"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-1.5 text-amber-200">
            <p className="font-bold text-amber-400">✨ Ready to Serve Production Traffic</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Once activated, all upcoming lesson PDF uploads, course thumbnails, and video transcoding will be routed through the client&apos;s Bunny.net production infrastructure.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Diagnostics
            </button>

            <button
              type="button"
              disabled={isActivating || !config.storageZoneName}
              onClick={handleFinalizeProduction}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Activating Production...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Mark as Production Ready &amp; Activate
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
