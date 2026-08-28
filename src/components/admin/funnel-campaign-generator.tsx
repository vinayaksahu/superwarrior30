"use client";

import { useState, useTransition } from "react";
import {
  Link2,
  Copy,
  Check,
  Sparkles,
  Send,
  MessageCircle,
  Megaphone,
  Globe,
  Save,
  Loader2,
  Video,
  Camera,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { updateFunnelCourseSettingAction } from "@/server/actions/lead.actions";
import { APP_URL } from "@/lib/constants";

interface CourseOption {
  id: string;
  title: string;
  slug: string;
  price: number;
}

interface FunnelCampaignGeneratorProps {
  courses: CourseOption[];
  defaultCourseId: string;
}

const PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: Video, defaultMedium: "video_description", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  { id: "instagram", label: "Instagram", icon: Camera, defaultMedium: "bio", color: "text-pink-500 bg-pink-500/10 border-pink-500/30" },
  { id: "facebook", label: "Facebook", icon: Share2, defaultMedium: "post", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "telegram", label: "Telegram", icon: Send, defaultMedium: "channel", color: "text-sky-500 bg-sky-500/10 border-sky-500/30" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, defaultMedium: "chat_broadcast", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { id: "ads", label: "Paid Ads", icon: Megaphone, defaultMedium: "cpc", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "custom", label: "Custom Link", icon: Globe, defaultMedium: "social", color: "text-primary bg-primary/10 border-primary/30" },
];

export function FunnelCampaignGenerator({
  courses,
  defaultCourseId,
}: FunnelCampaignGeneratorProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : APP_URL;

  // Selected default course setting
  const [selectedDefaultCourse, setSelectedDefaultCourse] = useState<string>(defaultCourseId);
  const [isPending, startTransition] = useTransition();

  // Campaign builder state
  const [platform, setPlatform] = useState<string>("youtube");
  const [customSource, setCustomSource] = useState<string>("");
  const [medium, setMedium] = useState<string>("video_description");
  const [campaignName, setCampaignName] = useState<string>("sw30_launch");
  const [targetCourseId, setTargetCourseId] = useState<string>(defaultCourseId || courses[0]?.id || "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Compute generated link
  const selectedCourse = courses.find((c) => c.id === targetCourseId);
  const effectiveSource = platform === "custom" ? (customSource.trim().toLowerCase() || "custom") : platform;
  const effectiveMedium = medium.trim().toLowerCase() || "social";
  const effectiveCampaign = campaignName.trim().toLowerCase() || "promo";

  const urlParams = new URLSearchParams();
  urlParams.set("utm_source", effectiveSource);
  urlParams.set("utm_medium", effectiveMedium);
  urlParams.set("utm_campaign", effectiveCampaign);
  if (selectedCourse && selectedCourse.id !== selectedDefaultCourse) {
    urlParams.set("course", selectedCourse.slug || selectedCourse.id);
  }

  const generatedUrl = `${baseUrl}/super-warrior-30?${urlParams.toString()}`;

  const handleCopy = (textToCopy: string, key: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    toast.success("Tracking link copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveDefaultCourse = () => {
    startTransition(async () => {
      const res = await updateFunnelCourseSettingAction(selectedDefaultCourse);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Global Default Landing Page Course Selector */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Default Landing Page Course
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which course is promoted by default on `/super-warrior-30` (Curriculum & Checkout)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDefaultCourse}
              onChange={(e) => setSelectedDefaultCourse(e.target.value)}
              className="rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} (₹{c.price})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSaveDefaultCourse}
              disabled={isPending || selectedDefaultCourse === defaultCourseId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Save Default Course
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Social Media & UTM Campaign Link Generator */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Social Media Campaign Link Generator & UTM Tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create custom tracked links for YouTube, Instagram, Facebook, Telegram, WhatsApp, or Paid Ads. Track clicks, leads, and sales in real-time.
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">
            1. Select Social Platform:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatform(p.id);
                    setMedium(p.defaultMedium);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${p.color} ring-1 ring-primary shadow-sm`
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {platform === "custom" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Custom Source (utm_source) *</label>
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="e.g. newsletter, influencer_rahul"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Campaign Name (utm_campaign) *</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. sw30_reels, march_launch"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Medium / Placement (utm_medium)</label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="e.g. bio, story, video, post"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-foreground">Target Course for this Link</label>
            <select
              value={targetCourseId}
              onChange={(e) => setTargetCourseId(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.id === selectedDefaultCourse ? "(Default Funnel Course)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Generated URL Box */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generated Campaign URL:
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">
              Ready for sharing
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none select-all"
            />

            <button
              type="button"
              onClick={() => handleCopy(generatedUrl, "generator")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer shrink-0"
            >
              {copiedKey === "generator" ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Tracked Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Quick Ready-To-Copy Campaign Presets */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            ⚡ Quick 1-Click Share Links (Default Course)
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "YouTube Video Link",
                desc: "For video descriptions & pinned comments",
                source: "youtube",
                medium: "video",
                campaign: "sw30",
                icon: Video,
                color: "text-red-500",
              },
              {
                title: "Instagram Bio Link",
                desc: "For your Instagram profile bio",
                source: "instagram",
                medium: "bio",
                campaign: "sw30",
                icon: Camera,
                color: "text-pink-500",
              },
              {
                title: "Instagram Story Link",
                desc: "For daily story swipe-up/sticker",
                source: "instagram",
                medium: "story",
                campaign: "sw30_daily",
                icon: Camera,
                color: "text-pink-500",
              },
              {
                title: "Telegram Channel Link",
                desc: "For channel posts & trading alerts",
                source: "telegram",
                medium: "channel",
                campaign: "sw30",
                icon: Send,
                color: "text-sky-500",
              },
              {
                title: "WhatsApp Group Broadcast",
                desc: "For community groups & status updates",
                source: "whatsapp",
                medium: "broadcast",
                campaign: "sw30",
                icon: MessageCircle,
                color: "text-emerald-500",
              },
              {
                title: "Facebook Ads Campaign",
                desc: "For Meta Paid Ads (Facebook & IG)",
                source: "facebook",
                medium: "paid_ad",
                campaign: "sw30_meta_ads",
                icon: Share2,
                color: "text-blue-500",
              },
            ].map((preset) => {
              const Icon = preset.icon;
              const presetUrl = `${baseUrl}/super-warrior-30?utm_source=${preset.source}&utm_medium=${preset.medium}&utm_campaign=${preset.campaign}`;
              const isCopied = copiedKey === preset.title;

              return (
                <div
                  key={preset.title}
                  className="rounded-xl border border-border bg-background p-4 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${preset.color}`} />
                      <p className="text-xs font-bold text-foreground">{preset.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(presetUrl, preset.title)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-muted-foreground" /> Copy Preset Link
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
