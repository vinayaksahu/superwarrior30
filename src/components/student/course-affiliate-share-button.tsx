"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Sparkles,
  Gift,
  ExternalLink,
  X,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface CourseAffiliateShareButtonProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  referralCode: string;
}

export function CourseAffiliateShareButton({
  courseId,
  courseTitle,
  courseSlug,
  referralCode,
}: CourseAffiliateShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<"course" | "checkout" | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const baseOrigin = origin || "https://superwarrior30.com";
  const courseAffiliateLink = `${baseOrigin}/courses/${courseSlug}?ref=${referralCode}`;
  const checkoutAffiliateLink = `${baseOrigin}/checkout/${courseId}?ref=${referralCode}`;

  const shareMessage = `🚀 Join "${courseTitle}" on Super Warrior 30 Trading Academy!

Learn institutional price action, market structure & liquidity strategies from expert traders.

🎁 Exclusive Referral Discount Applied automatically at checkout!
👉 Direct Course Link: ${courseAffiliateLink}

Referral Code: ${referralCode}`;

  const handleCopy = (type: "course" | "checkout", url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    toast.success(
      type === "course"
        ? "Course affiliate link copied!"
        : "Direct checkout affiliate link copied!"
    );
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(courseAffiliateLink)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 shadow-xs hover:bg-amber-500/20 hover:border-amber-400 active:scale-95 transition-all cursor-pointer"
        title="Share course with your affiliate link and earn commissions"
      >
        <Gift className="h-3.5 w-3.5" />
        <span>Affiliate Link</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Course Affiliate Link
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-applies your referral bonus discount for friends
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Course Information Box */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Selected Course
              </span>
              <p className="text-sm font-bold text-foreground line-clamp-1">
                {courseTitle}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <span>Your Referral Code:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {referralCode}
                </span>
              </div>
            </div>

            {/* Link 1: Direct Course Detail Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Course Page Link (With Auto Referral Discount)
                </label>
                <span className="text-[10px] text-muted-foreground">Recommended</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-inner">
                <span className="flex-1 truncate text-xs font-mono text-muted-foreground select-all px-1">
                  {courseAffiliateLink}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("course", courseAffiliateLink)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedLink === "course" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedLink === "course" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Link 2: Direct Checkout Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Instant Checkout Link (Skips to payment)
                </label>
                <span className="text-[10px] text-amber-500 font-semibold">Fast Purchase</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-inner">
                <span className="flex-1 truncate text-xs font-mono text-muted-foreground select-all px-1">
                  {checkoutAffiliateLink}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("checkout", checkoutAffiliateLink)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/80 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedLink === "checkout" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedLink === "checkout" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* 1-Click Social Shares */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-semibold text-foreground">
                1-Click Social Share:
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 cursor-pointer transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-500 active:scale-95 cursor-pointer transition"
                >
                  <Send className="h-4 w-4" />
                  <span>Share on Telegram</span>
                </button>
              </div>
            </div>

            {/* Benefit Footer Info */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                When anyone clicks your link, your <strong>Referral Discount</strong> automatically activates for them and you receive referral commissions directly in your wallet!
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
