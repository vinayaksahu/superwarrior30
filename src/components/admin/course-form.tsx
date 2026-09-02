"use client";

import { useState, useActionState } from "react";
import { createCourseAction, updateCourseAction, updateCourseThumbnailAction } from "@/server/actions/course.actions";
import { FileUploader } from "@/components/admin/file-uploader";
import { MediaPickerModal } from "@/components/admin/media/media-picker-modal";
import { slugify } from "@/lib/utils";
import { Loader2, ArrowLeft, ExternalLink, FolderOpen } from "lucide-react";
import Link from "next/link";
import type { ActionState } from "@/types";

interface CourseFormProps {
  course?: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    fullDescription: string | null;
    thumbnailKey: string | null;
    thumbnailCdnUrl?: string | null;
    price: string | number;
    compareAtPrice: string | number | null;
    status: string;
    difficulty: string;
    isFeatured: boolean;
    isReferralEligible?: boolean;
  };
  isEdit?: boolean;
}

export function CourseForm({ course, isEdit = false }: CourseFormProps) {
  const [title, setTitle] = useState(course?.title || "");
  const [slug, setSlug] = useState(course?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!course);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(
    course?.thumbnailCdnUrl || course?.thumbnailKey || null
  );
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const boundUpdateAction = isEdit && course ? updateCourseAction.bind(null, course.id) : null;
  const actionToUse = isEdit && boundUpdateAction ? boundUpdateAction : createCourseAction;

  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    actionToUse,
    null
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleThumbnailUpload = async (result: { key: string | null; bunnyVideoId: string | null; cdnUrl: string | null; provider: "R2" | "BUNNY" }) => {
    const newKey = result.cdnUrl || result.key || "";
    setThumbnailKey(newKey);
    if (isEdit && course?.id) {
      await updateCourseThumbnailAction(course.id, result.key || "", result.cdnUrl, result.provider);
    }
  };

  const handleSelectMediaFromLibrary = async (media: any) => {
    const url = media.storageUrl || media.thumbnailUrl || "";
    setThumbnailKey(url);
    if (isEdit && course?.id) {
      await updateCourseThumbnailAction(course.id, media.storageKey || "", url, "BUNNY");
    }
  };

  return (
    <form action={formAction} className="space-y-8">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="rounded-lg border border-input p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? `Edit: ${course?.title}` : "Create New Course"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Update course details, pricing, and status" : "Set up a new trading course"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && course && (
            <Link
              href={`/courses/${course.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Page
            </Link>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>

      {state?.message && !state.success && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {state.message}
        </div>
      )}

      {state?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 font-medium">
          {state.message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main 2 columns: Details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-3">
              Basic Information
            </h2>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium leading-none">
                Course Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Master Stock & Derivatives Trading"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state?.errors?.title && (
                <p className="text-xs text-destructive">{state.errors.title[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium leading-none">
                URL Slug <span className="text-destructive">*</span>
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs text-muted-foreground font-mono">
                  /courses/
                </span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="master-stock-derivatives-trading"
                  required
                  className="flex h-10 w-full rounded-r-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {state?.errors?.slug && (
                <p className="text-xs text-destructive">{state.errors.slug[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="shortDescription" className="text-sm font-medium leading-none">
                Short Description / Tagline
              </label>
              <input
                id="shortDescription"
                name="shortDescription"
                type="text"
                defaultValue={course?.shortDescription || ""}
                placeholder="A concise summary of who this course is for and what they will learn"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state?.errors?.shortDescription && (
                <p className="text-xs text-destructive">{state.errors.shortDescription[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="fullDescription" className="text-sm font-medium leading-none">
                Full Description (Supports Markdown / Text)
              </label>
              <textarea
                id="fullDescription"
                name="fullDescription"
                rows={7}
                defaultValue={course?.fullDescription || ""}
                placeholder="Detailed curriculum overview, key learning outcomes, prerequisites, and strategy details..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state?.errors?.fullDescription && (
                <p className="text-xs text-destructive">{state.errors.fullDescription[0]}</p>
              )}
            </div>
          </div>

          {/* Pricing & Value */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-3">
              Pricing & Value
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="price" className="text-sm font-medium leading-none">
                  Selling Price (₹ INR) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={course?.price?.toString() || "4999"}
                    placeholder="4999"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {state?.errors?.price && (
                  <p className="text-xs text-destructive">{state.errors.price[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="compareAtPrice" className="text-sm font-medium leading-none">
                  Compare at Price / Original Price (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <input
                    id="compareAtPrice"
                    name="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={course?.compareAtPrice?.toString() || ""}
                    placeholder="9999"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Shows a strikethrough original price for discount perception.
                </p>
                {state?.errors?.compareAtPrice && (
                  <p className="text-xs text-destructive">{state.errors.compareAtPrice[0]}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar column: Status, Level, Thumbnail */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-3">
              Publishing Settings
            </h2>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium leading-none">
                Course Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={course?.status || "DRAFT"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="DRAFT">Draft (Hidden from Public)</option>
                <option value="PUBLISHED">Published (Active & Purchasable)</option>
                <option value="ARCHIVED">Archived (Unlisted)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="difficulty" className="text-sm font-medium leading-none">
                Skill Level
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={course?.difficulty || "BEGINNER"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFeatured"
                  value="true"
                  defaultChecked={course?.isFeatured || false}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">Feature on Homepage</p>
                  <p className="text-xs text-muted-foreground">
                    Display prominently on the public landing page.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isReferralEligible"
                  value="true"
                  defaultChecked={course?.isReferralEligible !== false}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">Referral Commission Eligible</p>
                  <p className="text-xs text-muted-foreground">
                    When enabled, generates referral commission on purchases.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Thumbnail Uploader */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-semibold text-foreground">
                Course Thumbnail
              </h2>
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer transition-colors"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Select from Media Library
              </button>
            </div>

            {isEdit && course?.id ? (
              <FileUploader
                category="thumbnail"
                courseId={course.id}
                currentKey={thumbnailKey}
                onUploadComplete={handleThumbnailUpload}
                label="Upload New Thumbnail"
                description="Recommended 16:9 ratio (JPG, PNG, WebP up to 5MB)"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Please create and save the course first to upload thumbnail media.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          mediaType="IMAGE"
          title="Select Course Thumbnail from Media Library"
          onSelect={handleSelectMediaFromLibrary}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </form>
  );
}
