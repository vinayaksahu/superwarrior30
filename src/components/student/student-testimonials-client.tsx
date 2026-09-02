"use client";

import { useState, useTransition } from "react";
import {
  submitStudentTestimonialAction,
  resubmitStudentTestimonialAction,
  uploadStudentTestimonialScreenshotAction,
} from "@/server/actions/testimonial.actions";
import {
  Star,
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Maximize2,
  Trash2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { TestUserBadge } from "@/components/shared/test-user-badge";

export interface StudentTestimonialRecord {
  id: string;
  studentName: string;
  content: string;
  photoUrl: string | null;
  rating: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  isApproved: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  tradingPlatform: string | null;
  accountType: string | null;
  tradingResult: string | null;
  experienceDuration: string | null;
  consentGiven: boolean;
  rejectionReason: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  isTestData: boolean;
  createdAt: string;
  updatedAt: string;
  media: Array<{
    id: string;
    url: string;
    caption: string | null;
    type: string;
  }>;
}

interface StudentTestimonialsClientProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    isTestData?: boolean;
  };
  initialTestimonials: StudentTestimonialRecord[];
}

export function StudentTestimonialsClient({
  user,
  initialTestimonials,
}: StudentTestimonialsClientProps) {
  const [testimonials, setTestimonials] = useState<StudentTestimonialRecord[]>(initialTestimonials);
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");
  const [isPending, startTransition] = useTransition();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.name || user.email.split("@")[0]);
  const [photoUrl, setPhotoUrl] = useState<string>(user.avatarUrl || "");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [tradingResult, setTradingResult] = useState<string>("");
  const [experienceDuration, setExperienceDuration] = useState<string>("3-6 Months");
  const [screenshots, setScreenshots] = useState<Array<{ url: string; caption: string }>>([]);
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Lightbox modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);

  // Rating descriptions
  const ratingDescriptions: Record<number, string> = {
    5: "⭐⭐⭐⭐⭐ 5 Stars - Outstanding Mentorship & Results!",
    4: "⭐⭐⭐⭐ 4 Stars - Very Good Learning Experience",
    3: "⭐⭐⭐ 3 Stars - Good Concept Clarity",
    2: "⭐⭐ 2 Stars - Fair Learning Curve",
    1: "⭐ 1 Star - Needs Improvement",
  };

  // Populate form for editing/resubmitting
  const handleEditClick = (item: StudentTestimonialRecord) => {
    setEditingId(item.id);
    setDisplayName(item.studentName);
    setPhotoUrl(item.photoUrl || "");
    setRating(item.rating);
    setContent(item.content);
    setTradingResult(item.tradingResult || "");
    setExperienceDuration(item.experienceDuration || "3-6 Months");
    setScreenshots(
      item.media.map((m) => ({
        url: m.url,
        caption: m.caption || "",
      }))
    );
    setConsentGiven(item.consentGiven);
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setContent("");
    setScreenshots([]);
    setTradingResult("");
    setConsentGiven(false);
  };

  // Upload Profile Avatar Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo exceeds 5MB limit.");
      return;
    }

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadStudentTestimonialScreenshotAction(formData);
      if (result.success && result.url) {
        setPhotoUrl(result.url);
        toast.success("Profile photo uploaded successfully!");
      } else {
        toast.error(result.error || "Failed to upload photo.");
      }
    } catch {
      toast.error("Failed to upload photo.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Process File List for Screenshots
  const processScreenshotFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - screenshots.length;
    if (remainingSlots <= 0) {
      toast.error("You have already added the maximum of 5 screenshots.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more screenshot(s) could be added (max 5 limit).`);
    }

    setIsUploading(true);
    let uploadedCount = 0;

    for (const file of filesToUpload) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 5MB limit.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const result = await uploadStudentTestimonialScreenshotAction(formData);
        if (result.success && result.url) {
          setScreenshots((prev) => [
            ...prev,
            { url: result.url!, caption: file.name.replace(/\.[^/.]+$/, "") },
          ]);
          uploadedCount++;
        } else {
          toast.error(result.error || `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (uploadedCount > 0) {
      toast.success(`Uploaded ${uploadedCount} screenshot(s) successfully!`);
    }
  };

  // Upload Screenshot from File Input
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processScreenshotFiles(e.target.files);
      e.target.value = "";
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processScreenshotFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setScreenshots((prev) =>
      prev.map((item, i) => (i === index ? { ...item, caption } : item))
    );
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven) {
      toast.error("Please tick the consent checkbox to agree to public display terms.");
      return;
    }

    if (content.trim().length < 20) {
      toast.error("Your review text must be at least 20 characters long.");
      return;
    }

    if (content.trim().length > 2000) {
      toast.error("Your review text cannot exceed 2000 characters.");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // Resubmit flow
        const res = await resubmitStudentTestimonialAction(editingId, {
          displayName,
          photoUrl: photoUrl || undefined,
          rating,
          content,
          tradingResult,
          experienceDuration,
          screenshots,
          consentGiven: true,
        });

        if (res.success) {
          toast.success("Review updated and resubmitted for admin verification!");
          setEditingId(null);
          setContent("");
          setScreenshots([]);
          setTradingResult("");
          setConsentGiven(false);
          setActiveTab("list");
          // Refresh list locally
          setTestimonials((prev) =>
            prev.map((t) =>
              t.id === editingId
                ? {
                    ...t,
                    studentName: displayName,
                    photoUrl: photoUrl || null,
                    rating,
                    content,
                    tradingResult,
                    experienceDuration,
                    status: "PENDING" as const,
                    isApproved: false,
                    rejectionReason: null,
                    media: screenshots.map((s, idx) => ({
                      id: `temp_${idx}`,
                      url: s.url,
                      caption: s.caption,
                      type: "SCREENSHOT",
                    })),
                  }
                : t
            )
          );
        } else {
          toast.error(res.error || "Failed to resubmit review.");
        }
      } else {
        // New submission flow
        const res = await submitStudentTestimonialAction({
          displayName,
          photoUrl: photoUrl || undefined,
          rating,
          content,
          tradingResult,
          experienceDuration,
          screenshots,
          consentGiven: true,
        });

        if (res.success) {
          toast.success("Thank you! Your review was submitted and is pending admin approval.");
          setContent("");
          setScreenshots([]);
          setTradingResult("");
          setConsentGiven(false);
          setActiveTab("list");
          // Add newly submitted pending record locally
          const newRecord: StudentTestimonialRecord = {
            id: res.id || `temp_${Date.now()}`,
            studentName: displayName,
            content,
            photoUrl: photoUrl || null,
            rating,
            status: "PENDING",
            isApproved: false,
            isVisible: true,
            isFeatured: false,
            tradingPlatform: null,
            accountType: null,
            tradingResult,
            experienceDuration,
            consentGiven: true,
            rejectionReason: null,
            reviewedAt: null,
            approvedAt: null,
            isTestData: Boolean(user.isTestData),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            media: screenshots.map((s, idx) => ({
              id: `m_${idx}`,
              url: s.url,
              caption: s.caption,
              type: "SCREENSHOT",
            })),
          };
          setTestimonials((prev) => [newRecord, ...prev]);
        } else {
          toast.error(res.error || "Failed to submit review.");
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Star className="h-5 w-5 fill-primary text-primary" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Student Reviews & Experience
            </h1>
            <TestUserBadge isTestData={user.isTestData} />
          </div>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Share your authentic learning experience, trading screenshots, and results with Rahul Trade Warrior Academy.
            Approved reviews are showcased on the official academy website!
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1 self-start sm:self-auto shrink-0">
          <button
            onClick={() => {
              setActiveTab("form");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "form"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{editingId ? "Edit Review" : "Write Review"}</span>
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>My Reviews</span>
            {testimonials.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-mono">
                {testimonials.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSION FORM */}
      {activeTab === "form" && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-200">
          {editingId && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
                <p className="text-xs font-bold text-amber-400">
                  Editing Review — Updating your review will submit it for fresh admin moderation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Student Identity & Photo */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Your Display Name</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pre-filled from your profile. Impersonation of other members is prohibited.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Profile Photo</span>
                  {photoUrl && (
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Photo Attached</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... photo URL"
                    className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <label
                    className={`inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3.5 py-2.5 text-xs font-bold hover:bg-muted/80 cursor-pointer shrink-0 transition-colors ${
                      isUploadingPhoto ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{isUploadingPhoto ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Upload an image from your device or paste an avatar link.
                </p>
              </div>
            </div>

            {/* 2. Rating Selector */}
            <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Overall Academy Rating</span>
                <span className="text-xs font-bold text-primary">
                  {ratingDescriptions[hoverRating || rating]}
                </span>
              </label>

              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      aria-label={`${star} Stars`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          isFilled
                            ? "fill-amber-400 text-amber-400 drop-shadow"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Written Review Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Your Review & Experience</span>
                  <span className="text-destructive">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    content.length > 2000
                      ? "text-destructive font-bold"
                      : content.length >= 20
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {content.length} / 2000 characters (min 20)
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                placeholder="Share your genuine experience with Rahul Trade Warrior Academy... What market concepts or strategies helped you the most? How has your trading discipline and risk management evolved?"
                className="w-full rounded-xl border border-input bg-background p-3.5 text-xs font-medium leading-relaxed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* 4. Multi-Screenshot Upload Dropzone & Grid */}
            <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Trading Screenshots & P&L Proof (Optional, up to 5)
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Upload chart setups, trade executions, P&L screenshots, or broker proof.
                  </p>
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                  {screenshots.length} / 5 Uploaded
                </span>
              </div>

              {/* Drag & Drop Zone */}
              {screenshots.length < 5 && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isUploading}
                    onChange={handleScreenshotUpload}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-2 pointer-events-none">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {isUploading ? (
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {isUploading
                          ? "Uploading screenshots to secure storage..."
                          : "Click to browse or Drag & drop trading screenshots here"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Supports PNG, JPG, WebP up to 5MB each (Max 5 files)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Screenshots Grid */}
              {screenshots.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                  {screenshots.map((s, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm"
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.url}
                          alt={s.caption || "Screenshot"}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage(s)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                          title="View Full Screenshot"
                        >
                          <Maximize2 className="h-5 w-5 drop-shadow" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="absolute top-1.5 right-1.5 rounded-full bg-destructive p-1 text-white shadow hover:bg-destructive/90 cursor-pointer"
                          title="Remove Screenshot"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={s.caption}
                        onChange={(e) => handleCaptionChange(idx, e.target.value)}
                        placeholder="Caption (e.g. Gold 1:3 RR setup)"
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[11px] focus:border-primary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Optional Result Details (Cleaned without Platform / Account Type) */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Trading Results & Mentorship Duration (Optional)
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Trading Result / P&L Info
                  </label>
                  <input
                    type="text"
                    value={tradingResult}
                    onChange={(e) => setTradingResult(e.target.value)}
                    placeholder="e.g. +$1,200 (1:3 RR) or +15% ROI"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Mentorship Duration
                  </label>
                  <select
                    value={experienceDuration}
                    onChange={(e) => setExperienceDuration(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
                  >
                    <option value="1-3 Months">1-3 Months</option>
                    <option value="3-6 Months">3-6 Months</option>
                    <option value="6-12 Months">6-12 Months</option>
                    <option value="1+ Year">1+ Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 6. Security Warning & Privacy Notice */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <span>Security & Privacy Warning</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Please ensure you <strong>NEVER</strong> upload screenshots containing private passwords,
                trading account login credentials, API secret keys, bank account numbers, or OTPs.
              </p>
            </div>

            {/* 7. Mandatory Consent Checkbox */}
            <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:bg-muted/20 transition-colors">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-xs text-foreground leading-relaxed">
                I agree that my testimonial, display name, profile photo, review, and submitted
                screenshots may be displayed publicly on the Rahul Trade Warrior Academy website if
                approved by the administration.
              </span>
            </label>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isPending || isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{isPending ? "Submitting..." : editingId ? "Update & Resubmit" : "Submit Review"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY TESTIMONIALS LIST */}
      {activeTab === "list" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {testimonials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-card">
              <Star className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No Reviews Submitted Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Share your journey with Rahul Trade Warrior Academy to inspire fellow traders!
              </p>
              <button
                onClick={() => setActiveTab("form")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Submit Your First Review
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((t) => {
                const isPendingReview = t.status === "PENDING";
                const isApproved = t.status === "APPROVED";
                const isRejected = t.status === "REJECTED";

                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                      isApproved
                        ? "border-emerald-500/30"
                        : isRejected
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-amber-500/30"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top status bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isApproved
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : isRejected
                                ? "bg-destructive/15 text-destructive border border-destructive/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="h-3 w-3" />}
                            {isPendingReview && <Clock className="h-3 w-3" />}
                            {isRejected && <X className="h-3 w-3" />}
                            <span>
                              {isApproved ? "Approved & Public" : isRejected ? "Revision Requested" : "Under Review"}
                            </span>
                          </span>

                          <TestUserBadge isTestData={t.isTestData} />
                        </div>

                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Rejection Reason Notice */}
                      {isRejected && t.rejectionReason && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                            Feedback from Moderation:
                          </p>
                          <p className="text-xs text-foreground font-medium">
                            &ldquo;{t.rejectionReason}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Review Text */}
                      <p className="text-xs text-foreground/90 leading-relaxed italic">
                        &ldquo;{t.content}&rdquo;
                      </p>

                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {t.tradingPlatform && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            💻 {t.tradingPlatform}
                          </span>
                        )}
                        {t.accountType && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            🏦 {t.accountType}
                          </span>
                        )}
                        {t.tradingResult && (
                          <span className="rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                            📈 {t.tradingResult}
                          </span>
                        )}
                        {t.experienceDuration && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            ⏳ {t.experienceDuration}
                          </span>
                        )}
                      </div>

                      {/* Screenshots Gallery */}
                      {t.media && t.media.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border/60">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Trading Screenshots ({t.media.length}):
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {t.media.map((m, idx) => (
                              <button
                                key={m.id || idx}
                                type="button"
                                onClick={() => setPreviewImage({ url: m.url, caption: m.caption || undefined })}
                                className="group relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-muted focus:outline-none cursor-pointer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.url}
                                  alt={m.caption || `Screenshot ${idx + 1}`}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Maximize2 className="h-4 w-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom action row */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      <span>Submitted: {new Date(t.createdAt).toLocaleDateString()}</span>

                      {(isRejected || isPendingReview) && (
                        <button
                          type="button"
                          onClick={() => handleEditClick(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>{isRejected ? "Edit & Resubmit" : "Edit Submission"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.caption || "Screenshot Preview"}
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
            />
            {previewImage.caption && (
              <p className="text-center text-xs font-bold text-foreground py-2">
                {previewImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
