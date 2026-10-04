"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Plus,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit3,
  UploadCloud,
  Loader2,
  ExternalLink,
  Eye,
  MessageCircle,
  Send,
  FileText,
  ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AffiliatePromotionalMaterial,
  type PromotionalMaterialType,
  saveAffiliateMaterialAction,
  deleteAffiliateMaterialAction,
  toggleAffiliateMaterialStatusAction,
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

interface AffiliateMaterialsManagerProps {
  initialMaterials: AffiliatePromotionalMaterial[];
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
    label: "General Text",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
};

export function AffiliateMaterialsManager({
  initialMaterials,
}: AffiliateMaterialsManagerProps) {
  const [materials, setMaterials] = useState<AffiliatePromotionalMaterial[]>(initialMaterials);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<AffiliatePromotionalMaterial | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PromotionalMaterialType>("WHATSAPP");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    if (activeTab === "ALL") return true;
    return m.type === activeTab;
  });

  const openCreateModal = () => {
    setEditingMaterial(null);
    setTitle("");
    setType("WHATSAPP");
    setDescription("");
    setImageUrl("");
    setContent(
      `🚀 *Join Super Warrior 30 Trading Academy!*\n\nLearn institutional price action and market structure from professional traders.\n\n👉 *Join with my discount:* {AFFILIATE_LINK}\nReferral Code: *{REFERRAL_CODE}*`
    );
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (material: AffiliatePromotionalMaterial) => {
    setEditingMaterial(material);
    setTitle(material.title);
    setType(material.type);
    setDescription(material.description || "");
    setImageUrl(material.imageUrl || "");
    setContent(material.content);
    setIsActive(material.isActive);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image file size should be less than 20MB");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "materials");

      setUploadProgress(40);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to upload image to CDN");
      }

      setUploadProgress(100);
      setImageUrl(result.cdnUrl || result.url);
      toast.success("Poster/Banner uploaded to Bunny CDN successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setContent((prev) => prev + " " + placeholder);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter message content");
      return;
    }

    try {
      setIsSaving(true);
      const res = await saveAffiliateMaterialAction({
        id: editingMaterial?.id,
        title: title.trim(),
        type,
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        content: content.trim(),
        isActive,
      });

      if (!res.success) {
        toast.error(res.message || "Failed to save");
        return;
      }

      toast.success(res.message);
      setIsModalOpen(false);

      // Local optimistic update
      if (editingMaterial) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === editingMaterial.id
              ? {
                  ...m,
                  title: title.trim(),
                  type,
                  description: description.trim(),
                  imageUrl: imageUrl.trim() || undefined,
                  content: content.trim(),
                  isActive,
                  updatedAt: new Date().toISOString(),
                }
              : m
          )
        );
      } else {
        const newObj: AffiliatePromotionalMaterial = {
          id: `mat-${Date.now()}`,
          title: title.trim(),
          type,
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          content: content.trim(),
          isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMaterials((prev) => [newObj, ...prev]);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await deleteAffiliateMaterialAction(id);
      if (res.success) {
        toast.success(res.message);
        setMaterials((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete promotional material");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const next = !current;
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: next } : m))
      );
      const res = await toggleAffiliateMaterialStatusAction(id, next);
      if (!res.success) {
        // revert
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: current } : m))
        );
        toast.error(res.message);
      } else {
        toast.success(res.message);
      }
    } catch {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: current } : m))
      );
      toast.error("Failed to toggle status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Promotional Creatives & Share Materials
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Create high-converting posters, banners, and ready-made WhatsApp, Telegram, and social messages. Members can share these instantly in 1-click with their personalized affiliate link and referral code!
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Promotional Material</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { key: "ALL", label: `All Materials (${materials.length})` },
          { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
          { key: "TELEGRAM", label: "Telegram", icon: Send },
          { key: "INSTAGRAM", label: "Instagram", icon: InstagramIcon },
          { key: "FACEBOOK", label: "Facebook", icon: FacebookIcon },
          { key: "BANNER", label: "Banners & Posters", icon: ImageIcon },
          { key: "TEXT", label: "General Copy", icon: FileText },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMaterials.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Share2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No promotional materials in this category</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click &quot;Add Promotional Material&quot; to upload promotional banners, posters, or ready-to-share social messages for your affiliates.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First Material
          </button>
        </div>
      )}

      {/* Materials Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMaterials.map((item) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.TEXT;
          const Icon = cfg.icon;

          return (
            <div
              key={item.id}
              className={`relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                item.isActive ? "border-border" : "border-border/40 opacity-70"
              }`}
            >
              <div className="space-y-4">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{cfg.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id, item.isActive)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer transition ${
                        item.isActive
                          ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition"
                      title="Edit Creative"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition"
                      title="Delete Creative"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Poster / Banner Preview (if present) */}
                {item.imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      loading="lazy"
                    />
                    <a
                      href={item.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur flex items-center gap-1 hover:bg-black"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Image
                    </a>
                  </div>
                )}

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Message Copy Box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Message Copy</span>
                    <span className="text-[10px] text-amber-500 font-mono">
                      Dynamic Link & Code
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-xs font-mono text-muted-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap select-all">
                    {item.content}
                  </div>
                </div>
              </div>

                {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  Updated {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const testCopy = item.content
                      .replace(/{AFFILIATE_LINK}/g, "https://superwarrior30.com/register?ref=DEMO123")
                      .replace(/{REFERRAL_CODE}/g, "DEMO123");
                    navigator.clipboard.writeText(testCopy);
                    toast.success("Sample message copied with demo link!");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy Sample</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {editingMaterial ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {editingMaterial ? "Edit Promotional Material" : "Add Promotional Material"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              {/* Title & Platform */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. WhatsApp Daily Market Hook"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target Platform / Format <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PromotionalMaterialType)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="WHATSAPP">💬 WhatsApp Message</option>
                    <option value="TELEGRAM">✈️ Telegram Post</option>
                    <option value="INSTAGRAM">📸 Instagram Caption / Story</option>
                    <option value="FACEBOOK">📘 Facebook Post / Group</option>
                    <option value="BANNER">🖼️ Poster / Banner Graphic</option>
                    <option value="TEXT">📝 General Text Copy</option>
                  </select>
                </div>
              </div>

              {/* Description / Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Affiliate Tip / Best Placement Note (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Recommended for WhatsApp status and active trading groups"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Poster / Banner Image (Upload or URL) */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    <span>Poster / Banner Image (Optional)</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {imageUrl ? (
                  <div className="relative aspect-video w-full max-w-sm rounded-xl overflow-hidden border border-border bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Creative Preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 p-5 text-center transition hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading to Bunny CDN ({uploadProgress || 50}%)...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Click or Drag &amp; Drop to upload creative image
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              PNG, JPG, WebP up to 20MB (Stored on Bunny CDN)
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold shrink-0">OR Paste URL:</span>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://cdn.example.com/banner.png"
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Message Content & Placeholder Helpers */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Message Body <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Insert:</span>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("{AFFILIATE_LINK}")}
                      className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500 hover:bg-amber-500/20 cursor-pointer"
                    >
                      + {"{AFFILIATE_LINK}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("{REFERRAL_CODE}")}
                      className="rounded-lg bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 cursor-pointer"
                    >
                      + {"{REFERRAL_CODE}"}
                    </button>
                  </div>
                </div>

                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the promotional message here..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs leading-relaxed"
                />

                <p className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    When members click to share, <strong>{"{AFFILIATE_LINK}"}</strong> will be dynamically replaced with their actual affiliate URL and <strong>{"{REFERRAL_CODE}"}</strong> with their code!
                  </span>
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Active for Affiliates</p>
                  <p className="text-[10px] text-muted-foreground">
                    If enabled, this creative will appear immediately in the student affiliate portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isActive ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingMaterial ? "Update Creative" : "Save Creative"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
