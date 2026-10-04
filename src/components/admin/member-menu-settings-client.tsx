"use client";

import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  BookMarked,
  Video,
  Radio,
  Gift,
  Users,
  Star,
  GitBranch,
  Wallet,
  ShoppingCart,
  LifeBuoy,
  User,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import type { MemberMenuItemConfig } from "@/lib/member-menu-config";
import { saveMemberMenuSettingsAction } from "@/server/actions/member-menu.actions";

interface MemberMenuSettingsClientProps {
  initialItems: MemberMenuItemConfig[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  courses: BookOpen,
  homework: Award,
  journal: BookMarked,
  live_proofs: Video,
  live: Radio,
  cashbacks: Gift,
  community: Users,
  testimonials: Star,
  referrals: GitBranch,
  wallet: Wallet,
  orders: ShoppingCart,
  support: LifeBuoy,
  profile: User,
};

export function MemberMenuSettingsClient({
  initialItems,
}: MemberMenuSettingsClientProps) {
  const [items, setItems] = useState<MemberMenuItemConfig[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Toggle single item
  const handleToggle = (key: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, isEnabled: !item.isEnabled } : item
      )
    );
    setStatusMessage(null);
  };

  // Quick preset: Hide YouTube Live Trades and Live Classes
  const handleHideLiveAndProofs = () => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key === "live_proofs" || item.key === "live") {
          return { ...item, isEnabled: false };
        }
        return item;
      })
    );
    setStatusMessage(null);
  };

  // Quick preset: Show all
  const handleShowAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, isEnabled: true })));
    setStatusMessage(null);
  };

  // Quick preset: Reset to defaults (all enabled)
  const handleResetToDefault = () => {
    setItems(initialItems.map((item) => ({ ...item, isEnabled: true })));
    setStatusMessage(null);
  };

  // Save changes to database
  const handleSave = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const payload = items.map((item) => ({
        key: item.key,
        isEnabled: item.isEnabled,
      }));
      const res = await saveMemberMenuSettingsAction(payload);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || "Member portal menu settings saved successfully!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.message || "Failed to save settings. Please try again.",
        });
      }
    });
  };

  // Filter items
  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.href.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleCount = items.filter((i) => i.isEnabled).length;
  const hiddenCount = items.length - visibleCount;

  const isLiveOrProofsHidden =
    items.find((i) => i.key === "live_proofs")?.isEnabled === false &&
    items.find((i) => i.key === "live")?.isEnabled === false;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Member Portal Menu Visibility Control
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Select which menu items are visible or hidden in the student navigation sidebar &amp; mobile menu.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
              <Eye className="h-3.5 w-3.5" />
              <span>{visibleCount} Visible</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500">
              <EyeOff className="h-3.5 w-3.5" />
              <span>{hiddenCount} Hidden</span>
            </div>
          </div>
        </div>

        {/* Quick Action Presets */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">
            Quick Actions:
          </span>
          <button
            type="button"
            onClick={handleHideLiveAndProofs}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              isLiveOrProofsHidden
                ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                : "border-border bg-secondary/60 text-foreground hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            Hide YouTube Live &amp; Live Classes
          </button>
          <button
            type="button"
            onClick={handleShowAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            Show All Menus
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold shadow-sm transition-all ${
            statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-rose-500/30 bg-rose-500/10 text-rose-500"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Search and Save Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu items (e.g. Live, Course, Journal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Menu Visibility</span>
            </>
          )}
        </button>
      </div>

      {/* Menu Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const Icon = ICON_MAP[item.key] || LayoutDashboard;
          const isEnabled = item.isEnabled;
          const isTargetedHighlight =
            item.key === "live_proofs" || item.key === "live";

          return (
            <div
              key={item.key}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                isEnabled
                  ? "border-border bg-card shadow-xs hover:border-border/80"
                  : "border-border/40 bg-card/40 opacity-75 hover:opacity-100"
              } ${
                isTargetedHighlight && !isEnabled
                  ? "ring-1 ring-rose-500/30"
                  : ""
              }`}
            >
              {/* Item Info */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isEnabled
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      {item.label}
                    </span>
                    <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40">
                      {item.href}
                    </span>
                    {isTargetedHighlight && (
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/20">
                        Requested Target
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Toggle & Status */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    isEnabled
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  }`}
                >
                  {isEnabled ? (
                    <>
                      <Eye className="h-3 w-3" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" />
                      Hidden
                    </>
                  )}
                </span>

                {/* Switch Toggle Button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No menu items found matching &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Menu Visibility</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
