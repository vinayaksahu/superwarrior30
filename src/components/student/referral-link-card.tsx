"use client";

import { useState, useEffect } from "react";
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
  const [currentLink, setCurrentLink] = useState(referralLink);

  // Ensure link matches the live browser origin (e.g. https://www.superwarrior30.com)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      // If server returned a localhost link or outdated url, replace with live browser origin
      const origin = window.location.origin;
      setCurrentLink(`${origin}/register?ref=${referralCode}`);
    }
  }, [referralCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("Affiliate code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentLink);
    setCopiedLink(true);
    toast.success("Affiliate link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const shareMessage = `Join Super Warrior 30 and master trading with professional strategies! Use my affiliate link: ${currentLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full max-w-full rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-6 shadow-md space-y-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm uppercase tracking-wider">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>Your Affiliate Invitation</span>
      </div>

      {/* Inputs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 min-w-0">
        {/* Referral Code Box */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground">
            Unique Affiliate Code
          </label>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 sm:px-4 py-2.5 shadow-inner min-w-0 w-full overflow-hidden">
            <span className="font-mono text-lg sm:text-xl font-extrabold tracking-widest text-primary truncate select-all">
              {referralCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 cursor-pointer"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground">
            Shareable Affiliate Link
          </label>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 sm:px-4 py-2.5 shadow-inner min-w-0 w-full overflow-hidden">
            <span className="truncate flex-1 min-w-0 text-xs font-mono text-muted-foreground select-all">
              {currentLink}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Share Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground min-w-0">
        <span className="leading-relaxed">
          Share your link to earn multi-tier commissions when friends enroll.
        </span>
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-500 active:scale-98 transition-all cursor-pointer shrink-0 w-full sm:w-auto"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          <span>Share via WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
