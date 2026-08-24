"use client";

import { useState } from "react";
import { Copy, Check, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ReferralLinkCardProps {
  referralCode: string;
  referralLink: string;
}

export function ReferralLinkCard({
  referralCode,
  referralLink,
}: ReferralLinkCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Join Super Warrior 30 and master trading with professional strategies! Use my referral link: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-primary/5 p-6 shadow-md space-y-6">
      <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
        <Sparkles className="h-4 w-4" />
        <span>Your Referral Invitation</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Referral Code Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Unique Referral Code
          </label>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-inner">
            <span className="font-mono text-xl font-extrabold tracking-widest text-primary">
              {referralCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedCode ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Shareable Invitation Link
          </label>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-inner">
            <span className="truncate text-xs font-mono text-muted-foreground max-w-[200px] sm:max-w-xs">
              {referralLink}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span>Share your link to earn multi-tier commissions when friends enroll.</span>
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share via WhatsApp
        </button>
      </div>
    </div>
  );
}
