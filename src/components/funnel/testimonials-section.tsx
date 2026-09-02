"use client";

import { useState } from "react";
import { Star, Sparkles, CheckCircle2, Maximize2, X, TrendingUp, ShieldCheck } from "lucide-react";

export interface PublicTestimonialItem {
  id: string;
  studentName: string;
  content: string;
  photoUrl: string | null;
  rating: number;
  isFeatured?: boolean;
  tradingPlatform?: string | null;
  accountType?: string | null;
  tradingResult?: string | null;
  experienceDuration?: string | null;
  isTestData?: boolean;
  createdAt?: string;
  screenshots?: Array<{
    id: string;
    url: string;
    caption?: string | null;
  }>;
}

interface TestimonialsSectionProps {
  testimonials: PublicTestimonialItem[];
  title?: string;
  subtitle?: string;
}

export function TestimonialsSection({
  testimonials,
  title = "Student Success Stories & Reviews",
  subtitle = "Real results and verified reviews from traders in Rahul Trade Warrior Academy",
}: TestimonialsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  // Display top 6 by default, or all if showAll
  const displayedTestimonials = showAll ? testimonials : testimonials.slice(0, 6);
  const isAnyTest = testimonials.some((t) => t.isTestData);

  return (
    <section id="testimonials" className="py-20 md:py-28 border-b border-border/40 bg-muted/20 relative overflow-hidden scroll-mt-16">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Test Mode Preview Alert */}
        {isAnyTest && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
            <span className="text-xs font-bold text-amber-400">
              ⚠️ TEST MODE PREVIEW: Showing testing environment reviews. In production, only verified live student testimonials are displayed.
            </span>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Verified Student Feedback</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedTestimonials.map((t) => (
            <div
              key={t.id}
              className={`relative rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                t.isFeatured
                  ? "border-primary/50 ring-1 ring-primary/30 bg-gradient-to-b from-card via-card to-primary/5"
                  : "border-border/80 hover:border-primary/30"
              }`}
            >
              {t.isFeatured && (
                <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Featured Story</span>
                </span>
              )}

              <div className="space-y-4">
                {/* Header: Photo + Name + Rating */}
                <div className="flex items-center gap-3">
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photoUrl}
                      alt={t.studentName}
                      className="h-11 w-11 rounded-full object-cover border border-border shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-sm border border-primary/20">
                      {t.studentName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate">{t.studentName}</p>
                      <span title="Verified Student">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Trading Metadata Badges */}
                {(t.tradingPlatform || t.tradingResult || t.accountType) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.tradingPlatform && (
                      <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                        💻 {t.tradingPlatform}
                      </span>
                    )}
                    {t.tradingResult && (
                      <span className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                        📈 {t.tradingResult}
                      </span>
                    )}
                    {t.accountType && (
                      <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                        🏦 {t.accountType}
                      </span>
                    )}
                  </div>
                )}

                {/* Screenshots Thumbnails */}
                {t.screenshots && t.screenshots.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Trading Proof & Setups ({t.screenshots.length}):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {t.screenshots.map((s, idx) => (
                        <button
                          key={s.id || idx}
                          type="button"
                          onClick={() => setPreviewImage({ url: s.url, caption: s.caption || undefined })}
                          className="group relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-muted focus:outline-none cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.url}
                            alt={s.caption || "Setup"}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Maximize2 className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        {testimonials.length > 6 && (
          <div className="text-center pt-4">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-2.5 text-xs font-bold shadow-sm hover:bg-accent transition-all cursor-pointer"
            >
              <span>{showAll ? "Show Less" : `View All Testimonials (${testimonials.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black cursor-pointer"
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
    </section>
  );
}
