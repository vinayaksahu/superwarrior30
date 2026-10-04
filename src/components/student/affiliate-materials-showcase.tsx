"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  Send,
  FileText,
  ImageIcon,
  Sparkles,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AffiliatePromotionalMaterial,
  PromotionalMaterialType,
} from "@/server/actions/referral.actions";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

interface AffiliateMaterialsShowcaseProps {
  materials: AffiliatePromotionalMaterial[];
  referralCode: string;
  referralLink: string;
}

const TYPE_CONFIG: Record<
  PromotionalMaterialType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: Send,
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/30",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: InstagramIcon,
    color: "text-pink-500",
    bg: "bg-pink-500/10 border-pink-500/30",
  },
  FACEBOOK: {
    label: "Facebook",
    icon: FacebookIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  BANNER: {
    label: "Poster / Banner",
    icon: ImageIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  TEXT: {
    label: "Marketing Copy",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
};

export function AffiliateMaterialsShowcase({
  materials,
  referralCode,
  referralLink,
}: AffiliateMaterialsShowcaseProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actualLink, setActualLink] = useState(referralLink);

  // Sync actual link to browser origin
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setActualLink(`${window.location.origin}/register?ref=${referralCode}`);
    }
  }, [referralCode]);

  const filteredMaterials = materials.filter((m) => {
    if (!m.isActive) return false;
    if (activeTab === "ALL") return true;
    return m.type === activeTab;
  });

  const getPersonalizedContent = (template: string) => {
    return template
      .replace(/{AFFILIATE_LINK}/g, actualLink)
      .replace(/{REFERRAL_CODE}/g, referralCode);
  };

  const handleCopyMessage = (id: string, text: string) => {
    const personalized = getPersonalizedContent(text);
    navigator.clipboard.writeText(personalized);
    setCopiedId(id);
    toast.success("Marketing message copied with your affiliate link!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleWhatsAppShare = (template: string) => {
    const message = getPersonalizedContent(template);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleTelegramShare = (template: string) => {
    const message = getPersonalizedContent(template);
    const url = `https://t.me/share/url?url=${encodeURIComponent(actualLink)}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleFacebookShare = (template: string) => {
    const message = getPersonalizedContent(template);
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(actualLink)}&quote=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleDownloadImage = async (imgUrl: string, title: string) => {
    try {
      const a = document.createElement("a");
      a.href = imgUrl;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Opening poster/banner for download...");
    } catch {
      window.open(imgUrl, "_blank");
    }
  };

  if (!materials || materials.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-primary/20 bg-card p-4 sm:p-6 shadow-sm">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Flame className="h-4 w-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Promotional Creatives &amp; 1-Click Share Kit
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Share pre-made banners, posters, and viral messages pre-loaded with your personalized affiliate link and referral code!
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 shrink-0 self-start sm:self-auto">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Earn Commissions Instantly</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "ALL", label: `All Materials (${materials.filter((m) => m.isActive).length})` },
          { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
          { key: "TELEGRAM", label: "Telegram", icon: Send },
          { key: "INSTAGRAM", label: "Instagram", icon: InstagramIcon },
          { key: "FACEBOOK", label: "Facebook", icon: FacebookIcon },
          { key: "BANNER", label: "Banners & Posters", icon: ImageIcon },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Creatives */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredMaterials.map((item) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.TEXT;
          const Icon = cfg.icon;
          const isCopied = copiedId === item.id;
          const personalizedMessage = getPersonalizedContent(item.content);

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-background p-4 sm:p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md space-y-4"
            >
              <div className="space-y-3">
                {/* Type Badge & Header */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{cfg.label}</span>
                  </span>

                  {item.imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(item.imageUrl!, item.title)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary cursor-pointer transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Banner</span>
                    </button>
                  )}
                </div>

                {/* Poster / Graphic Preview (if present) */}
                {item.imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black/30 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(item.imageUrl!, item.title)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black shadow hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Personalized Content Preview */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Personalized Share Copy</span>
                    <span className="text-primary font-mono lowercase">your link included</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-xs font-sans text-foreground leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                    {personalizedMessage}
                  </div>
                </div>
              </div>

              {/* Action Buttons: 1-Click Share & Copy */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="grid grid-cols-2 gap-2">
                  {/* WhatsApp Direct Share */}
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(item.content)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 cursor-pointer transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Telegram Direct Share */}
                  <button
                    type="button"
                    onClick={() => handleTelegramShare(item.content)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-sky-500 active:scale-95 cursor-pointer transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Telegram</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Facebook Direct Share */}
                  <button
                    type="button"
                    onClick={() => handleFacebookShare(item.content)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-blue-500 active:scale-95 cursor-pointer transition"
                  >
                    <FacebookIcon className="h-3.5 w-3.5" />
                    <span>Facebook</span>
                  </button>

                  {/* Copy Message Text */}
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(item.id, item.content)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/70 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted active:scale-95 cursor-pointer transition"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? "Copied!" : "Copy Text"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
