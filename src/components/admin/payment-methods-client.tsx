"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Zap,
  Building2,
  Smartphone,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  QrCode,
  Sparkles,
  ShieldCheck,
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Globe,
  Radio,
} from "lucide-react";
import {
  type PaymentMethodItem,
  createPaymentMethodAction,
  updatePaymentMethodAction,
  togglePaymentMethodStatusAction,
  deletePaymentMethodAction,
} from "@/server/actions/payment-method.actions";
import { cn } from "@/lib/utils";

interface PaymentMethodsClientProps {
  initialMethods: PaymentMethodItem[];
}

export function PaymentMethodsClient({ initialMethods }: PaymentMethodsClientProps) {
  const [methods, setMethods] = useState<PaymentMethodItem[]>(initialMethods);
  const [selectedTab, setSelectedTab] = useState<"ALL" | "GATEWAY" | "UPI" | "BANK" | "CRYPTO">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"GATEWAY" | "UPI" | "BANK" | "CRYPTO" | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [customQrUrl, setCustomQrUrl] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Gateway form state
  const [gatewayProvider, setGatewayProvider] = useState<"RAZORPAY" | "PHONEPE" | "CASHFREE" | "PAYTM">("RAZORPAY");
  const [gatewayMode, setGatewayMode] = useState<"TEST" | "LIVE">("TEST");
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [originUrl, setOriginUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await togglePaymentMethodStatusAction(id);
      if (res.success) {
        setMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
        );
        setActionMessage({ success: true, text: res.message || "Status updated" });
      } else {
        setActionMessage({ success: false, text: res.message || "Failed to update status" });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const handleConfirmDelete = (id: string) => {
    startTransition(async () => {
      const res = await deletePaymentMethodAction(id);
      if (res.success) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
        setActionMessage({ success: true, text: res.message || "Method deleted successfully" });
        setDeleteTarget(null);
      } else {
        setActionMessage({ success: false, text: res.message || "Failed to delete" });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const handleOpenCreate = (type: "GATEWAY" | "UPI" | "BANK" | "CRYPTO") => {
    setEditingMethod(null);
    setCustomQrUrl("");
    setShowSecret(false);
    if (type === "GATEWAY") {
      setGatewayProvider("RAZORPAY");
      setGatewayMode("TEST");
    }
    setActiveModal(type);
  };

  const handleOpenEdit = (method: PaymentMethodItem) => {
    setEditingMethod(method);
    setCustomQrUrl(method.details.qrCodeUrl || "");
    setShowSecret(false);
    if (method.type === "GATEWAY") {
      setGatewayProvider(method.details.provider || "RAZORPAY");
      setGatewayMode(method.details.mode || "TEST");
    }
    setActiveModal(method.type);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomQrUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", activeModal || "UPI");
    if (activeModal === "GATEWAY") {
      formData.set("provider", gatewayProvider);
      formData.set("mode", gatewayMode);
    }
    if (customQrUrl) {
      formData.set("qrCodeUrl", customQrUrl);
    }

    startTransition(async () => {
      let res;
      if (editingMethod) {
        res = await updatePaymentMethodAction(editingMethod.id, formData);
      } else {
        res = await createPaymentMethodAction(null, formData);
      }

      if (res.success) {
        setActiveModal(null);
        setEditingMethod(null);
        window.location.reload();
      } else {
        setActionMessage({ success: false, text: res.message || "Operation failed" });
      }
    });
  };

  const gatewayCount = methods.filter((m) => m.type === "GATEWAY").length;
  const upiCount = methods.filter((m) => m.type === "UPI").length;
  const bankCount = methods.filter((m) => m.type === "BANK").length;
  const cryptoCount = methods.filter((m) => m.type === "CRYPTO").length;

  const filteredMethods = methods.filter((m) => {
    if (selectedTab === "ALL") return true;
    return m.type === selectedTab;
  });

  const webhookUrl = `${originUrl || "https://yourdomain.com"}/api/webhooks/razorpay`;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Deposit & Payout Payment Methods
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure automated Payment Gateways (Razorpay, PhonePe) or manual receiving methods (UPI, Bank, Crypto) enabled for students at checkout.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreate("GATEWAY")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer ring-2 ring-primary/20"
          >
            <CreditCard className="h-3.5 w-3.5 text-primary-foreground" />
            + Payment Gateway
          </button>

          <button
            onClick={() => handleOpenCreate("UPI")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-500" />
            UPI
          </button>

          <button
            onClick={() => handleOpenCreate("BANK")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-sky-500" />
            Banking
          </button>

          <button
            onClick={() => handleOpenCreate("CRYPTO")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-amber-500" />
            Crypto
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {actionMessage && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold",
            actionMessage.success
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          )}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setSelectedTab("ALL")}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
            selectedTab === "ALL"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          )}
        >
          All ({methods.length})
        </button>

        <button
          onClick={() => setSelectedTab("GATEWAY")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
            selectedTab === "GATEWAY"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          )}
        >
          <CreditCard className="h-3 w-3 text-primary" />
          Gateways ({gatewayCount})
        </button>

        <button
          onClick={() => setSelectedTab("UPI")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
            selectedTab === "UPI"
              ? "bg-emerald-500 text-black shadow"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          )}
        >
          <Smartphone className="h-3 w-3 text-emerald-500" />
          UPI ({upiCount})
        </button>

        <button
          onClick={() => setSelectedTab("BANK")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
            selectedTab === "BANK"
              ? "bg-sky-500 text-white shadow"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          )}
        >
          <Building2 className="h-3 w-3 text-sky-500" />
          Banking ({bankCount})
        </button>

        <button
          onClick={() => setSelectedTab("CRYPTO")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
            selectedTab === "CRYPTO"
              ? "bg-amber-500 text-black shadow"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          )}
        >
          <Zap className="h-3 w-3 text-amber-500" />
          Crypto ({cryptoCount})
        </button>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMethods.map((method) => (
          <div
            key={method.id}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all",
              method.type === "GATEWAY" && method.isActive
                ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                : method.isActive
                ? "border-border/80 hover:border-primary/40"
                : "border-border/40 opacity-60 bg-card/40"
            )}
          >
            <div className="space-y-4">
              {/* Method Title & Badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-foreground text-base line-clamp-1">
                      {method.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        method.type === "GATEWAY"
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : method.type === "CRYPTO"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : method.type === "BANK"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {method.type === "GATEWAY" && <CreditCard className="h-2.5 w-2.5 text-primary" />}
                      {method.type === "CRYPTO" && <Zap className="h-2.5 w-2.5" />}
                      {method.type === "BANK" && <Building2 className="h-2.5 w-2.5" />}
                      {method.type === "UPI" && <Smartphone className="h-2.5 w-2.5" />}
                      {method.type === "GATEWAY" ? (method.details.provider || "GATEWAY") : method.type}
                    </span>

                    {method.type === "GATEWAY" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          method.details.mode === "LIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        )}
                      >
                        {method.details.mode === "LIVE" ? "Live Mode" : "Test Mode"}
                      </span>
                    )}

                    {method.details.network && (
                      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {method.details.network}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(method.id)}
                  disabled={isPending}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
                    method.isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30"
                      : "bg-muted text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-400"
                  )}
                  title="Click to toggle status"
                >
                  {method.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Gateway Details Box */}
              {method.type === "GATEWAY" && (
                <div className="space-y-2.5 rounded-xl bg-background/60 p-3.5 text-xs border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Gateway Provider:</span>
                    <span className="font-bold text-foreground">
                      {method.details.provider || "RAZORPAY"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Key ID:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-foreground truncate max-w-[150px]">
                          {method.details.keyId
                            ? `${method.details.keyId.substring(0, 8)}••••••••`
                            : "Not Set"}
                        </span>
                        {method.details.keyId && (
                          <button
                            onClick={() => copyToClipboard(method.details.keyId || "", method.id)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Copy Key ID"
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Key Secret:</span>
                    <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Encrypted & Stored
                    </span>
                  </div>

                  {method.details.webhookSecret && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Webhook Secret:</span>
                      <span className="font-mono text-xs text-foreground">Configured</span>
                    </div>
                  )}

                  {/* Webhook endpoint helper box */}
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-semibold">Webhook URL:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, `wh_${method.id}`)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === `wh_${method.id}` ? (
                          <>
                            <Check className="h-2.5 w-2.5 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5" /> Copy Webhook URL
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground break-all bg-background/90 p-1.5 rounded border border-border/40">
                      {webhookUrl}
                    </p>
                  </div>
                </div>
              )}

              {/* QR Code Preview if available for UPI/Crypto */}
              {method.type !== "GATEWAY" && (method.details.qrCodeUrl || method.details.upiId || method.details.walletAddress) && (
                <div className="flex justify-center py-2 bg-background/50 rounded-xl border border-border/40 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      method.details.qrCodeUrl ||
                      (method.type === "UPI"
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(
                            method.details.upiId || ""
                          )}`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                            method.details.walletAddress || ""
                          )}`)
                    }
                    alt={`${method.title} QR Code`}
                    className="h-36 w-36 rounded-lg object-contain bg-white p-1"
                  />
                </div>
              )}

              {/* Method Details Box for UPI/Crypto/Bank */}
              {method.type !== "GATEWAY" && (
                <div className="space-y-2 rounded-xl bg-background/60 p-3.5 text-xs border border-border/40">
                  {method.type === "UPI" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">UPI ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-foreground">
                            {method.details.upiId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(method.details.upiId || "", method.id)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Copy UPI ID"
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      {method.details.payeeName && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Payee:</span>
                          <span className="font-medium text-foreground">{method.details.payeeName}</span>
                        </div>
                      )}
                    </>
                  )}

                  {method.type === "CRYPTO" && (
                    <>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium block">Deposit Address:</span>
                        <div className="flex items-center justify-between gap-1 rounded bg-muted/40 px-2 py-1.5">
                          <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-[200px]">
                            {method.details.walletAddress}
                          </span>
                          <button
                            onClick={() => copyToClipboard(method.details.walletAddress || "", method.id)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground shrink-0"
                            title="Copy Address"
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {method.type === "BANK" && (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-bold text-foreground">{method.details.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium text-foreground">{method.details.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Account No:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-foreground">
                            {method.details.accountNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(method.details.accountNumber || "", method.id)}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === method.id ? (
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IFSC Code:</span>
                        <span className="font-mono font-bold text-foreground">{method.details.ifsc}</span>
                      </div>
                      {method.details.branch && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch:</span>
                          <span className="text-foreground">{method.details.branch}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {method.instructions && (
                <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                  {method.instructions}
                </p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Added {new Date(method.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(method)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors cursor-pointer"
                  title="Edit Method"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>

                <button
                  onClick={() => setDeleteTarget(method)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title="Delete Method"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Web App Confirmation Dialog for Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Remove Payment Method</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed bg-background/80 p-3.5 rounded-xl border border-border/50">
              Are you sure you want to permanently remove <strong className="text-foreground">{deleteTarget.title}</strong>? Students will no longer be able to choose this payment option during checkout.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleConfirmDelete(deleteTarget.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Yes, Delete Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for Adding / Editing Payment Method */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  {activeModal === "GATEWAY" && <CreditCard className="h-4 w-4" />}
                  {activeModal === "UPI" && <Smartphone className="h-4 w-4" />}
                  {activeModal === "BANK" && <Building2 className="h-4 w-4" />}
                  {activeModal === "CRYPTO" && <Zap className="h-4 w-4" />}
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {editingMethod ? "Edit" : "Add"} {activeModal === "GATEWAY" ? "Payment Gateway" : activeModal === "UPI" ? "UPI" : activeModal === "BANK" ? "Bank Transfer" : "Crypto"} Method
                </h2>
              </div>

              <button
                onClick={() => {
                  setActiveModal(null);
                  setEditingMethod(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Gateway Specific Settings */}
              {activeModal === "GATEWAY" && (
                <>
                  {/* Provider Selection */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Choose Payment Gateway Provider *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "RAZORPAY", name: "Razorpay", desc: "Cards, UPI, NetBanking", popular: true },
                        { id: "PHONEPE", name: "PhonePe", desc: "UPI, Cards PG" },
                        { id: "CASHFREE", name: "Cashfree", desc: "Instant Gateway" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGatewayProvider(item.id as "RAZORPAY" | "PHONEPE" | "CASHFREE")}
                          className={cn(
                            "relative flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer",
                            gatewayProvider === item.id
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-background/50 hover:bg-accent text-foreground"
                          )}
                        >
                          {item.popular && (
                            <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                              Popular
                            </span>
                          )}
                          <span className="font-bold text-xs">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Environment Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGatewayMode("TEST")}
                        className={cn(
                          "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          gatewayMode === "TEST"
                            ? "border-amber-500/80 bg-amber-500/15 text-amber-400 shadow-sm"
                            : "border-border bg-background/50 hover:bg-accent text-muted-foreground"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        Test / Sandbox Mode
                      </button>

                      <button
                        type="button"
                        onClick={() => setGatewayMode("LIVE")}
                        className={cn(
                          "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          gatewayMode === "LIVE"
                            ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-400 shadow-sm"
                            : "border-border bg-background/50 hover:bg-accent text-muted-foreground"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Live / Production Mode
                      </button>
                    </div>
                  </div>

                  {/* Gateway Key ID */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      {gatewayProvider === "RAZORPAY" ? "Razorpay Key ID *" : `${gatewayProvider} Merchant / Key ID *`}
                    </label>
                    <input
                      name="keyId"
                      type="text"
                      required
                      defaultValue={editingMethod?.details?.keyId || ""}
                      placeholder={
                        gatewayMode === "TEST"
                          ? "e.g. rzp_test_1DP5mmOlF5G5ag"
                          : "e.g. rzp_live_xxxxxxxxxxxxxx"
                      }
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Gateway Key Secret */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        {gatewayProvider === "RAZORPAY" ? "Razorpay Key Secret *" : `${gatewayProvider} Secret / Salt Key *`}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSecret ? "Hide Secret" : "Show Secret"}
                      </button>
                    </div>
                    <input
                      name="keySecret"
                      type={showSecret ? "text" : "password"}
                      required
                      defaultValue={editingMethod?.details?.keySecret || ""}
                      placeholder="e.g. 21zN8xxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Optional Webhook Secret */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Webhook Secret (Optional, for asynchronous event verification)
                    </label>
                    <input
                      name="webhookSecret"
                      type="text"
                      defaultValue={editingMethod?.details?.webhookSecret || ""}
                      placeholder="e.g. your_webhook_secret_key"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Helpful Quick Guide */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      How to get Razorpay API Keys:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-[11px]">
                      <li>Log in to your <strong>Razorpay Dashboard</strong> (razorpay.com).</li>
                      <li>Go to <strong>Settings</strong> &gt; <strong>API Keys</strong> &gt; Click <strong>Generate Key</strong>.</li>
                      <li>Copy your <strong>Key ID</strong> and <strong>Key Secret</strong> and paste them above.</li>
                      <li>To enable webhooks, add endpoint <code className="bg-background px-1 py-0.5 rounded text-[10px] text-foreground">{webhookUrl}</code> in Settings &gt; Webhooks.</li>
                    </ol>
                  </div>
                </>
              )}

              {/* Title Input */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Display Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={
                    editingMethod?.title ||
                    (activeModal === "GATEWAY" ? "Razorpay Instant Pay (UPI, Cards, NetBanking)" : "")
                  }
                  placeholder={
                    activeModal === "GATEWAY"
                      ? "e.g. Razorpay Instant Pay (Cards, UPI, NetBanking)"
                      : activeModal === "UPI"
                      ? "e.g. PhonePe / GooglePay / Paytm UPI"
                      : activeModal === "BANK"
                      ? "e.g. HDFC Bank Direct Transfer"
                      : "e.g. USDT (BEP-20 / Binance)"
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {activeModal === "UPI" && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      UPI ID (VPA) *
                    </label>
                    <input
                      name="upiId"
                      type="text"
                      required
                      defaultValue={editingMethod?.details?.upiId || ""}
                      placeholder="e.g. yourname@okaxis or business@upi"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Payee / Merchant Name
                    </label>
                    <input
                      name="payeeName"
                      type="text"
                      defaultValue={editingMethod?.details?.payeeName || ""}
                      placeholder="e.g. Super Warrior 30 Mentorship"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeModal === "CRYPTO" && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Blockchain Network *
                    </label>
                    <input
                      name="network"
                      type="text"
                      required
                      defaultValue={editingMethod?.details?.network || "BEP-20 (BNB Smart Chain)"}
                      placeholder="e.g. BEP-20, TRC-20, Polygon"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Deposit Wallet Address *
                    </label>
                    <input
                      name="walletAddress"
                      type="text"
                      required
                      defaultValue={editingMethod?.details?.walletAddress || ""}
                      placeholder="e.g. 0x45127b42b72c3357d94bc3687fe6c..."
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeModal === "BANK" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Bank Name *
                      </label>
                      <input
                        name="bankName"
                        type="text"
                        required
                        defaultValue={editingMethod?.details?.bankName || ""}
                        placeholder="e.g. HDFC Bank"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Account Holder Name *
                      </label>
                      <input
                        name="accountName"
                        type="text"
                        required
                        defaultValue={editingMethod?.details?.accountName || ""}
                        placeholder="e.g. Super Warrior 30"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Account Number *
                      </label>
                      <input
                        name="accountNumber"
                        type="text"
                        required
                        defaultValue={editingMethod?.details?.accountNumber || ""}
                        placeholder="e.g. 50200084920192"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        IFSC Code *
                      </label>
                      <input
                        name="ifsc"
                        type="text"
                        required
                        defaultValue={editingMethod?.details?.ifsc || ""}
                        placeholder="e.g. HDFC0001234"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Branch (Optional)
                    </label>
                    <input
                      name="branch"
                      type="text"
                      defaultValue={editingMethod?.details?.branch || ""}
                      placeholder="e.g. Mumbai Main Branch"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* QR Code Upload & URL Section for UPI and Crypto */}
              {(activeModal === "UPI" || activeModal === "CRYPTO") && (
                <div className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <QrCode className="h-3.5 w-3.5 text-primary" />
                      QR Code (Custom Upload or Auto)
                    </label>
                    {customQrUrl && (
                      <button
                        type="button"
                        onClick={() => setCustomQrUrl("")}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>

                  {/* Device File Upload */}
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-accent transition-all cursor-pointer shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      Upload QR Image from Device
                    </button>

                    {customQrUrl && (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Image Loaded
                      </span>
                    )}
                  </div>

                  {/* Preview if uploaded */}
                  {customQrUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customQrUrl}
                        alt="QR Preview"
                        className="h-16 w-16 rounded-lg border border-border bg-white p-1 object-contain"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Custom QR code will be displayed to buyers during checkout.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Buyer Instructions / Subtitle (Optional)
                </label>
                <textarea
                  name="instructions"
                  rows={2}
                  defaultValue={editingMethod?.instructions || ""}
                  placeholder={
                    activeModal === "GATEWAY"
                      ? "e.g. Instant access via UPI, Credit/Debit Cards, NetBanking, and Wallets."
                      : "e.g. Transfer exact amount and paste your 12-digit UTR/Reference ID."
                  }
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingMethod(null);
                  }}
                  className="rounded-xl border border-input px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving..." : editingMethod ? "Update Method" : "Save Payment Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
