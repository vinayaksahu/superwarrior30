"use client";

import { useState, useTransition } from "react";
import {
  Zap,
  Building2,
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  QrCode,
  Sparkles,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";
import {
  type PaymentMethodItem,
  createPaymentMethodAction,
  togglePaymentMethodStatusAction,
  deletePaymentMethodAction,
} from "@/server/actions/payment-method.actions";
import { cn } from "@/lib/utils";

interface PaymentMethodsClientProps {
  initialMethods: PaymentMethodItem[];
}

export function PaymentMethodsClient({ initialMethods }: PaymentMethodsClientProps) {
  const [methods, setMethods] = useState<PaymentMethodItem[]>(initialMethods);
  const [selectedTab, setSelectedTab] = useState<"ALL" | "CRYPTO" | "BANK" | "UPI">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"UPI" | "BANK" | "CRYPTO" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

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

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return;
    startTransition(async () => {
      const res = await deletePaymentMethodAction(id);
      if (res.success) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
        setActionMessage({ success: true, text: res.message || "Method deleted" });
      } else {
        setActionMessage({ success: false, text: res.message || "Failed to delete" });
      }
      setTimeout(() => setActionMessage(null), 4000);
    });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", activeModal || "UPI");

    startTransition(async () => {
      const res = await createPaymentMethodAction(null, formData);
      if (res.success) {
        setActiveModal(null);
        window.location.reload();
      } else {
        setActionMessage({ success: false, text: res.message || "Failed to create method" });
      }
    });
  };

  const cryptoCount = methods.filter((m) => m.type === "CRYPTO").length;
  const bankCount = methods.filter((m) => m.type === "BANK").length;
  const upiCount = methods.filter((m) => m.type === "UPI").length;

  const filteredMethods = methods.filter((m) => {
    if (selectedTab === "ALL") return true;
    return m.type === selectedTab;
  });

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
            Manage system deposit options and control active receiving payment methods (Crypto, Bank, UPI) enabled for students at checkout.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal("CRYPTO")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-amber-500" />
            Crypto
          </button>

          <button
            onClick={() => setActiveModal("BANK")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-sky-500" />
            Banking
          </button>

          <button
            onClick={() => setActiveModal("UPI")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            UPI
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
      <div className="flex items-center gap-2 border-b border-border pb-3">
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
      </div>

      {/* Payment Methods Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMethods.map((method) => (
          <div
            key={method.id}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all",
              method.isActive ? "border-border/80 hover:border-primary/40" : "border-border/40 opacity-60 bg-card/40"
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        method.type === "CRYPTO"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : method.type === "BANK"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {method.type === "CRYPTO" && <Zap className="h-2.5 w-2.5" />}
                      {method.type === "BANK" && <Building2 className="h-2.5 w-2.5" />}
                      {method.type === "UPI" && <Smartphone className="h-2.5 w-2.5" />}
                      {method.type}
                    </span>

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

              {/* QR Code Preview if available */}
              {method.details.qrCodeUrl && (
                <div className="flex justify-center py-2 bg-background/50 rounded-xl border border-border/40 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={method.details.qrCodeUrl}
                    alt={`${method.title} QR Code`}
                    className="h-36 w-36 rounded-lg object-contain bg-white p-1"
                  />
                </div>
              )}

              {/* Method Details Box */}
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

              <button
                onClick={() => handleDelete(method.id)}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                title="Delete Method"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog for Adding Payment Method */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  {activeModal === "UPI" && <Smartphone className="h-4 w-4" />}
                  {activeModal === "BANK" && <Building2 className="h-4 w-4" />}
                  {activeModal === "CRYPTO" && <Zap className="h-4 w-4" />}
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  Add {activeModal === "UPI" ? "UPI" : activeModal === "BANK" ? "Bank Transfer" : "Crypto"} Method
                </h2>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Display Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder={
                    activeModal === "UPI"
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
                      placeholder="e.g. Super Warrior 30 Mentorship"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Custom QR Code Image URL (Optional)
                    </label>
                    <input
                      name="qrCodeUrl"
                      type="url"
                      placeholder="Leave blank to auto-generate dynamic UPI QR"
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
                      defaultValue="BEP-20 (BNB Smart Chain)"
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
                      placeholder="e.g. 0x45127b42b72c3357d94bc3687fe6c..."
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Custom QR Code Image URL (Optional)
                    </label>
                    <input
                      name="qrCodeUrl"
                      type="url"
                      placeholder="Leave blank to auto-generate from wallet address"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
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
                      placeholder="e.g. Mumbai Main Branch"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Buyer Instructions (Optional)
                </label>
                <textarea
                  name="instructions"
                  rows={2}
                  placeholder="e.g. Transfer exact amount and paste your 12-digit UTR/Reference ID."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-input px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save Payment Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
