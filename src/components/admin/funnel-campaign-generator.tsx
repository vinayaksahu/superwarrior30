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
  Zap,
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
  { id: "youtube", label: "YouTube", icon: Video, shortPath: "/yt", defaultMedium: "video", defaultCampaign: "sw30", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  { id: "instagram", label: "Instagram", icon: Camera, shortPath: "/bio", defaultMedium: "bio", defaultCampaign: "sw30", color: "text-pink-500 bg-pink-500/10 border-pink-500/30" },
  { id: "facebook", label: "Facebook", icon: Share2, shortPath: "/fb", defaultMedium: "post", defaultCampaign: "sw30", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "telegram", label: "Telegram", icon: Send, shortPath: "/tg", defaultMedium: "channel", defaultCampaign: "sw30", color: "text-sky-500 bg-sky-500/10 border-sky-500/30" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, shortPath: "/wa", defaultMedium: "broadcast", defaultCampaign: "sw30", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { id: "ads", label: "Paid Ads", icon: Megaphone, shortPath: "/ads", defaultMedium: "paid_ad", defaultCampaign: "sw30_meta_ads", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "custom", label: "Custom Link", icon: Globe, shortPath: "/go", defaultMedium: "social", defaultCampaign: "promo", color: "text-primary bg-primary/10 border-primary/30" },
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
  const [medium, setMedium] = useState<string>("video");
  const [campaignName, setCampaignName] = useState<string>("sw30");
  const [targetCourseId, setTargetCourseId] = useState<string>(defaultCourseId || courses[0]?.id || "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Compute generated link
  const activePlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
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

  const generatedFullUrl = `${baseUrl}/super-warrior-30?${urlParams.toString()}`;

  // Compute clean Short Link
  let generatedShortUrl = `${baseUrl}${activePlatform.shortPath}`;
  if (platform === "custom" && customSource.trim()) {
    generatedShortUrl = `${baseUrl}/go/${encodeURIComponent(customSource.trim().toLowerCase())}`;
  }
  if (selectedCourse && selectedCourse.id !== selectedDefaultCourse) {
    generatedShortUrl += `?course=${encodeURIComponent(selectedCourse.slug || selectedCourse.id)}`;
  }

  const handleCopy = (textToCopy: string, key: string, label: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
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
            Social Media Campaign Link & Short URL Generator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create clean short links (like <span className="font-mono text-primary font-bold">/yt</span>, <span className="font-mono text-pink-400 font-bold">/bio</span>, <span className="font-mono text-sky-400 font-bold">/tg</span>, <span className="font-mono text-emerald-400 font-bold">/wa</span>) for YouTube descriptions, Instagram bios, and Telegram channels. Clicks and leads are automatically tracked with full UTM analytics.
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
                    setCampaignName(p.defaultCampaign);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${p.color} ring-1 ring-primary shadow-sm`
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{p.label}</span>
                  <span className="text-[10px] font-mono opacity-80">{p.shortPath}</span>
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
                placeholder="e.g. newsletter, podcast"
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
              placeholder="e.g. sw30, march_launch"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Medium / Placement (utm_medium)</label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="e.g. video, bio, story, post"
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

        {/* Live Generated URL Output Box */}
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 space-y-4">
          {/* 1. Short Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary fill-primary" /> Clean Short Link (Best for Bio & Descriptions):
              </span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md">
                ⚡ Recommended
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedShortUrl}
                className="flex-1 rounded-xl border border-primary/30 bg-background px-3.5 py-2 text-xs font-mono font-bold text-primary focus:outline-none select-all"
              />

              <button
                type="button"
                onClick={() => handleCopy(generatedShortUrl, "short_gen", "Short link")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer shrink-0"
              >
                {copiedKey === "short_gen" ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied Short Link!
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-current" /> Copy Short Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Full Tracking URL */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> Full Tracking URL (with UTM tags):
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedFullUrl}
                className="flex-1 rounded-lg border border-input bg-background/80 px-3 py-1.5 text-[11px] font-mono text-muted-foreground focus:outline-none select-all"
              />

              <button
                type="button"
                onClick={() => handleCopy(generatedFullUrl, "full_gen", "Full URL")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer shrink-0"
              >
                {copiedKey === "full_gen" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Full URL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Quick Ready-To-Copy Campaign Presets */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Instant Short Links for Social Media (1-Click Copy)
            </h3>
            <span className="text-[11px] text-muted-foreground">
              All short links automatically preserve and pass full UTM tags to analytics
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "YouTube Video Description",
                desc: "For video descriptions & pinned comments",
                shortPath: "/yt",
                fullQuery: "utm_source=youtube&utm_medium=video&utm_campaign=sw30",
                icon: Video,
                color: "text-red-500",
                badgeColor: "bg-red-500/10 text-red-500 border-red-500/20",
              },
              {
                title: "Instagram Bio Link",
                desc: "For your main Instagram profile bio",
                shortPath: "/bio",
                fullQuery: "utm_source=instagram&utm_medium=bio&utm_campaign=sw30",
                icon: Camera,
                color: "text-pink-500",
                badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
              },
              {
                title: "Instagram Story / Reel",
                desc: "For daily story links & reel descriptions",
                shortPath: "/story",
                fullQuery: "utm_source=instagram&utm_medium=story&utm_campaign=sw30_daily",
                icon: Camera,
                color: "text-pink-500",
                badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
              },
              {
                title: "Telegram Channel Link",
                desc: "For channel broadcasts & signal alerts",
                shortPath: "/tg",
                fullQuery: "utm_source=telegram&utm_medium=channel&utm_campaign=sw30",
                icon: Send,
                color: "text-sky-500",
                badgeColor: "bg-sky-500/10 text-sky-500 border-sky-500/20",
              },
              {
                title: "WhatsApp Broadcast / Status",
                desc: "For WhatsApp community & status share",
                shortPath: "/wa",
                fullQuery: "utm_source=whatsapp&utm_medium=broadcast&utm_campaign=sw30",
                icon: MessageCircle,
                color: "text-emerald-500",
                badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
              },
              {
                title: "Facebook Ads / Posts",
                desc: "For Facebook groups & Meta ad campaigns",
                shortPath: "/fb",
                fullQuery: "utm_source=facebook&utm_medium=post&utm_campaign=sw30",
                icon: Share2,
                color: "text-blue-500",
                badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
              },
            ].map((preset) => {
              const Icon = preset.icon;
              const shortUrl = `${baseUrl}${preset.shortPath}`;
              const fullUrl = `${baseUrl}/super-warrior-30?${preset.fullQuery}`;
              const isCopiedShort = copiedKey === `short_${preset.title}`;

              return (
                <div
                  key={preset.title}
                  className="rounded-xl border border-border bg-background p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${preset.color}`} />
                        <p className="text-xs font-bold text-foreground">{preset.title}</p>
                      </div>
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                        {preset.shortPath}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
                    <p className="text-xs font-mono font-bold text-primary break-all">
                      {shortUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(shortUrl, `short_${preset.title}`, `Short link for ${preset.title}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      {isCopiedShort ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 fill-current" /> Copy Short Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(fullUrl, `full_${preset.title}`, `Full URL for ${preset.title}`)}
                      title="Copy Full URL with UTM"
                      className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
