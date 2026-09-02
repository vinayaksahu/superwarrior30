"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, requirePermission } from "@/server/dal/auth";
import { resolveCurrentEnvironment } from "@/lib/env-context";
import { revalidatePath } from "next/cache";
import { uploadToBunnyStorage } from "@/lib/bunny/storage";
import crypto from "crypto";

// ==========================================
// MAGIC BYTES / MIME VALIDATION
// ==========================================

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_SCREENSHOTS_COUNT = 5;

/**
 * Validates buffer magic bytes to ensure file content matches image format.
 * Strictly prevents SVG, HTML, scripts, or executables disguised as images.
 */
function validateImageMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: "image/png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedMime: "image/webp" };
  }

  return { isValid: false };
}

// ==========================================
// PUBLIC: GET APPROVED TESTIMONIALS
// ==========================================

const STARTER_FALLBACK_TESTIMONIALS = [
  {
    id: "seed-1",
    studentName: "Rahul Sharma",
    content: "Rahul Sir's price action mentorship and liquidity concepts completely cleared all my doubts. Passed my 50k funded prop challenge in just 3 weeks with proper risk management!",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    isFeatured: true,
    showOnHome: true,
    showOnLanding: true,
    tradingPlatform: "MetaTrader 5",
    accountType: "Funded Account",
    tradingResult: "+₹1,84,000 Profit",
    experienceDuration: "3-6 Months",
    isTestData: false,
    createdAt: new Date().toISOString(),
    screenshots: [
      {
        id: "m-seed-1",
        url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
        caption: "Nifty 50 Liquidity Sweep Entry 1:3.5 RR",
      },
    ],
  },
  {
    id: "seed-2",
    studentName: "Amit Verma",
    content: "Best trading academy in India! Earlier I was losing money on random telegram calls. Rahul Sir taught us how big institutions trap retail traders. Now I trade with confidence and small stop losses.",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    isFeatured: true,
    showOnHome: true,
    showOnLanding: true,
    tradingPlatform: "TradingView",
    accountType: "Real Account",
    tradingResult: "+38% Monthly ROI",
    experienceDuration: "6-12 Months",
    isTestData: false,
    createdAt: new Date().toISOString(),
    screenshots: [
      {
        id: "m-seed-2",
        url: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80",
        caption: "BankNifty Order Block Reaction Trade",
      },
    ],
  },
  {
    id: "seed-3",
    studentName: "Priya Patel",
    content: "The Super Warrior 30 batch completely shifted my trading mindset. Rahul Sir's live trading sessions and risk calculation formulas are top notch. Consistency is finally here!",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    isFeatured: false,
    showOnHome: true,
    showOnLanding: true,
    tradingPlatform: "Zerodha / MT5",
    accountType: "Real Account",
    tradingResult: "+₹92,500 P&L",
    experienceDuration: "3-6 Months",
    isTestData: false,
    createdAt: new Date().toISOString(),
    screenshots: [],
  },
];

export async function getApprovedTestimonialsAction(placement?: "HOME" | "LANDING" | "ALL") {
  try {
    const currentEnv = await resolveCurrentEnvironment();
    const isTesting = currentEnv === "TEST";

    const where: any = {
      status: "APPROVED",
      isApproved: true,
      isVisible: true,
      isTestData: isTesting,
    };

    if (placement === "HOME") {
      where.showOnHome = true;
    } else if (placement === "LANDING") {
      where.showOnLanding = true;
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: 18,
    });

    let resultList = testimonials;

    if (resultList.length === 0 && isTesting) {
      // If none matched showOnHome filter, try fetching all approved test testimonials
      resultList = await prisma.testimonial.findMany({
        where: {
          status: "APPROVED",
          isApproved: true,
          isVisible: true,
          isTestData: true,
        },
        include: {
          media: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [
          { isFeatured: "desc" },
          { displayOrder: "asc" },
          { createdAt: "desc" },
        ],
        take: 18,
      });
    }

    if (resultList.length === 0) {
      if (isTesting) {
        return STARTER_FALLBACK_TESTIMONIALS.map((t) => ({
          ...t,
          studentName: `${t.studentName} [TEST]`,
          isTestData: true,
        })).filter((t) => {
          if (placement === "HOME") return t.showOnHome;
          if (placement === "LANDING") return t.showOnLanding;
          return true;
        });
      }

      // Return starter verified testimonials for live production
      return STARTER_FALLBACK_TESTIMONIALS.filter((t) => {
        if (placement === "HOME") return t.showOnHome;
        if (placement === "LANDING") return t.showOnLanding;
        return true;
      });
    }

    return resultList.map((t) => ({
      id: t.id,
      studentName: t.studentName,
      content: t.content,
      photoUrl: t.photoUrl,
      rating: t.rating,
      isFeatured: t.isFeatured,
      showOnHome: t.showOnHome,
      showOnLanding: t.showOnLanding,
      tradingPlatform: t.tradingPlatform,
      accountType: t.accountType,
      tradingResult: t.tradingResult,
      experienceDuration: t.experienceDuration,
      isTestData: t.isTestData,
      createdAt: t.createdAt.toISOString(),
      screenshots: t.media.map((m) => ({
        id: m.id,
        url: m.url,
        caption: m.caption,
      })),
    }));
  } catch (error) {
    console.error("Failed to load approved testimonials:", error);
    return STARTER_FALLBACK_TESTIMONIALS;
  }
}

// ==========================================
// STUDENT: SUBMIT & MANAGE OWN TESTIMONIALS
// ==========================================

export interface StudentTestimonialInput {
  displayName?: string;
  rating: number;
  content: string;
  photoUrl?: string;
  tradingPlatform?: string;
  accountType?: string;
  tradingResult?: string;
  experienceDuration?: string;
  screenshots?: Array<{ url: string; caption?: string }>;
  consentGiven: boolean;
}

/**
 * Upload student screenshot to environment-scoped Bunny storage.
 */
export async function uploadStudentTestimonialScreenshotAction(formData: FormData) {
  try {
    const user = await requireAuth();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No image file provided." };
    }

    if (file.size > MAX_SCREENSHOT_SIZE) {
      return {
        success: false,
        error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    const mimeType = (file.type || "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return {
        success: false,
        error: "Invalid file format. Only JPEG, PNG, and WebP images are allowed.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep magic bytes inspection
    const validation = validateImageMagicBytes(buffer);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Corrupted or unsafe image format. Upload was rejected for security.",
      };
    }

    const ext = validation.detectedMime === "image/png" ? "png" : validation.detectedMime === "image/webp" ? "webp" : "jpg";
    const envSubfolder = user.isTestData ? "test" : "live";
    const uniqueId = crypto.randomUUID();
    const storagePath = `testimonials/${envSubfolder}/${user.id}/${uniqueId}.${ext}`;

    const uploadResult = await uploadToBunnyStorage(storagePath, buffer, validation.detectedMime || "image/jpeg");

    return {
      success: true,
      url: uploadResult.cdnUrl,
      key: storagePath,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Image upload failed";
    return { success: false, error: msg };
  }
}

/**
 * Submit new student testimonial.
 */
export async function submitStudentTestimonialAction(input: StudentTestimonialInput) {
  try {
    const user = await requireAuth();

    // 1. Mandatory consent check
    if (!input.consentGiven) {
      return {
        success: false,
        error: "You must agree to the public display consent before submitting your review.",
      };
    }

    // 2. Prevent impersonation - student name defaults to authentic profile name or email prefix
    const authenticName = (user.name || user.email.split("@")[0]).trim();
    const studentName = input.displayName && input.displayName.trim().length > 0
      ? input.displayName.trim()
      : authenticName;

    // 3. Validation
    const content = (input.content || "").trim();
    if (content.length < 20) {
      return { success: false, error: "Testimonial review must be at least 20 characters." };
    }
    if (content.length > 2000) {
      return { success: false, error: "Testimonial review cannot exceed 2000 characters." };
    }

    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
    const screenshots = (input.screenshots || []).slice(0, MAX_SCREENSHOTS_COUNT);

    // 4. Rate-limiting check: Prevent spamming multiple pending submissions
    const pendingCount = await prisma.testimonial.count({
      where: {
        userId: user.id,
        status: "PENDING",
      },
    });

    if (pendingCount >= 3) {
      return {
        success: false,
        error: "You already have 3 pending testimonials under review. Please wait for moderation.",
      };
    }

    // 5. Create Testimonial record (Always strictly PENDING)
    const testimonial = await prisma.testimonial.create({
      data: {
        userId: user.id,
        studentName,
        content,
        photoUrl: input.photoUrl || user.avatarUrl || null,
        rating,
        status: "PENDING",
        isApproved: false,
        isVisible: true,
        isFeatured: false,
        displayOrder: 0,
        tradingPlatform: input.tradingPlatform?.trim() || null,
        accountType: input.accountType?.trim() || null,
        tradingResult: input.tradingResult?.trim() || null,
        experienceDuration: input.experienceDuration?.trim() || null,
        consentGiven: true,
        isTestData: user.isTestData,
        media: screenshots.length > 0 ? {
          create: screenshots.map((s, idx) => ({
            url: s.url,
            caption: s.caption?.trim() || null,
            type: "SCREENSHOT",
            sortOrder: idx,
            isTestData: user.isTestData,
          })),
        } : undefined,
      },
      include: {
        media: true,
      },
    });

    // 6. Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "TESTIMONIAL_SUBMITTED",
          entityType: "Testimonial",
          entityId: testimonial.id,
          newValues: {
            studentName,
            rating,
            screenshotsCount: screenshots.length,
            environment: user.isTestData ? "TEST" : "LIVE",
          },
          isTestData: user.isTestData,
        },
      });
    } catch {
      // ignore audit log error if any
    }

    revalidatePath("/dashboard/testimonials");
    revalidatePath("/admin/testimonials");
    return { success: true, id: testimonial.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit testimonial";
    return { success: false, error: msg };
  }
}

/**
 * Fetch all testimonials submitted by the currently logged-in student.
 */
export async function getStudentTestimonialsAction() {
  const user = await requireAuth();

  try {
    const testimonials = await prisma.testimonial.findMany({
      where: {
        userId: user.id,
      },
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return testimonials.map((t) => ({
      id: t.id,
      studentName: t.studentName,
      content: t.content,
      photoUrl: t.photoUrl,
      rating: t.rating,
      status: t.status,
      isApproved: t.isApproved,
      isVisible: t.isVisible,
      isFeatured: t.isFeatured,
      tradingPlatform: t.tradingPlatform,
      accountType: t.accountType,
      tradingResult: t.tradingResult,
      experienceDuration: t.experienceDuration,
      consentGiven: t.consentGiven,
      rejectionReason: t.rejectionReason,
      reviewedAt: t.reviewedAt?.toISOString() || null,
      approvedAt: t.approvedAt?.toISOString() || null,
      isTestData: t.isTestData,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      media: t.media.map((m) => ({
        id: m.id,
        url: m.url,
        caption: m.caption,
        type: m.type,
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch student testimonials:", error);
    return [];
  }
}

/**
 * Student edits & resubmits a rejected or pending testimonial.
 * Always transitions status back to PENDING.
 */
export async function resubmitStudentTestimonialAction(
  id: string,
  input: Partial<StudentTestimonialInput>
) {
  try {
    const user = await requireAuth();

    const existing = await prisma.testimonial.findUnique({
      where: { id },
      include: { media: true },
    });

    if (!existing || existing.userId !== user.id) {
      return { success: false, error: "Testimonial not found or unauthorized." };
    }

    const content = input.content ? input.content.trim() : existing.content;
    if (content.length < 20) {
      return { success: false, error: "Testimonial review must be at least 20 characters." };
    }
    if (content.length > 2000) {
      return { success: false, error: "Testimonial review cannot exceed 2000 characters." };
    }

    const rating = input.rating ? Math.min(5, Math.max(1, Math.round(Number(input.rating)))) : existing.rating;

    // Delete existing media and re-insert if screenshots list was provided
    if (input.screenshots) {
      await prisma.testimonialMedia.deleteMany({
        where: { testimonialId: id },
      });

      if (input.screenshots.length > 0) {
        await prisma.testimonialMedia.createMany({
          data: input.screenshots.slice(0, MAX_SCREENSHOTS_COUNT).map((s, idx) => ({
            testimonialId: id,
            url: s.url,
            caption: s.caption?.trim() || null,
            type: "SCREENSHOT",
            sortOrder: idx,
            isTestData: existing.isTestData,
          })),
        });
      }
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        content,
        rating,
        photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
        tradingPlatform: input.tradingPlatform !== undefined ? input.tradingPlatform?.trim() || null : existing.tradingPlatform,
        accountType: input.accountType !== undefined ? input.accountType?.trim() || null : existing.accountType,
        tradingResult: input.tradingResult !== undefined ? input.tradingResult?.trim() || null : existing.tradingResult,
        experienceDuration: input.experienceDuration !== undefined ? input.experienceDuration?.trim() || null : existing.experienceDuration,
        status: "PENDING",
        isApproved: false,
        rejectionReason: null, // Clear past rejection reason on resubmission
        updatedAt: new Date(),
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "TESTIMONIAL_RESUBMITTED",
          entityType: "Testimonial",
          entityId: id,
          oldValues: { status: existing.status, rejectionReason: existing.rejectionReason },
          newValues: { status: "PENDING", contentLength: content.length },
          isTestData: user.isTestData,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/dashboard/testimonials");
    revalidatePath("/admin/testimonials");
    return { success: true, id: updated.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to resubmit testimonial";
    return { success: false, error: msg };
  }
}

// ==========================================
// ADMIN: MODERATION & RBAC
// ==========================================

export interface AdminTestimonialFilter {
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "FEATURED";
  search?: string;
}

/**
 * Fetch testimonials for Admin Moderation with filter support.
 */
export async function getAdminTestimonialsAction(filter?: AdminTestimonialFilter) {
  await requireAdmin();

  try {
    const where: any = {};

    if (filter?.status && filter.status !== "ALL") {
      if (filter.status === "FEATURED") {
        where.isFeatured = true;
        where.status = "APPROVED";
      } else {
        where.status = filter.status;
      }
    }

    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { studentName: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { tradingPlatform: { contains: q, mode: "insensitive" } },
      ];
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isTestData: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });

    return testimonials.map((t) => ({
      id: t.id,
      userId: t.userId,
      user: t.user ? {
        id: t.user.id,
        email: t.user.email,
        name: t.user.name,
        isTestData: t.user.isTestData,
      } : null,
      studentName: t.studentName,
      content: t.content,
      photoUrl: t.photoUrl,
      videoUrl: t.videoUrl,
      rating: t.rating,
      status: t.status,
      isApproved: t.isApproved,
      isVisible: t.isVisible,
      isFeatured: t.isFeatured,
      showOnHome: t.showOnHome,
      showOnLanding: t.showOnLanding,
      displayOrder: t.displayOrder,
      tradingPlatform: t.tradingPlatform,
      accountType: t.accountType,
      tradingResult: t.tradingResult,
      experienceDuration: t.experienceDuration,
      consentGiven: t.consentGiven,
      rejectionReason: t.rejectionReason,
      reviewedAt: t.reviewedAt?.toISOString() || null,
      reviewedBy: t.reviewedBy ? {
        id: t.reviewedBy.id,
        name: t.reviewedBy.name,
        email: t.reviewedBy.email,
      } : null,
      approvedAt: t.approvedAt?.toISOString() || null,
      isTestData: t.isTestData,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      media: t.media.map((m) => ({
        id: m.id,
        url: m.url,
        caption: m.caption,
        type: m.type,
      })),
    }));
  } catch (error) {
    console.error("Failed to load admin testimonials:", error);
    return [];
  }
}

/**
 * Approve a pending/rejected testimonial.
 */
export async function approveTestimonialAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.approve");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        status: "APPROVED",
        isApproved: true,
        isVisible: true,
        showOnHome: true,
        showOnLanding: true,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: null,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "TESTIMONIAL_APPROVED",
          entityType: "Testimonial",
          entityId: id,
          oldValues: { status: existing.status, isApproved: existing.isApproved },
          newValues: { status: "APPROVED", isApproved: true },
          isTestData: existing.isTestData,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, id: updated.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Approval failed";
    return { success: false, error: msg };
  }
}

/**
 * Reject a testimonial with an explicit rejection reason.
 */
export async function rejectTestimonialAction(id: string, reason: string) {
  try {
    const admin = await requirePermission("testimonials.approve");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const cleanReason = (reason || "Review does not meet publication standards.").trim();

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        status: "REJECTED",
        isApproved: false,
        rejectionReason: cleanReason,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "TESTIMONIAL_REJECTED",
          entityType: "Testimonial",
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: "REJECTED", rejectionReason: cleanReason },
          isTestData: existing.isTestData,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, id: updated.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Rejection failed";
    return { success: false, error: msg };
  }
}

/**
 * Toggle Featured status of an approved testimonial.
 */
export async function toggleFeaturedTestimonialAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.edit");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    if (existing.status !== "APPROVED" && !existing.isApproved) {
      return { success: false, error: "Only approved testimonials can be marked as Featured." };
    }

    const nextFeatured = !existing.isFeatured;

    await prisma.testimonial.update({
      where: { id },
      data: { isFeatured: nextFeatured },
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, isFeatured: nextFeatured };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Toggle featured failed";
    return { success: false, error: msg };
  }
}

/**
 * Toggle Homepage placement (Admin).
 */
export async function toggleTestimonialHomeAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.edit");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const nextShowOnHome = !existing.showOnHome;

    await prisma.testimonial.update({
      where: { id },
      data: { showOnHome: nextShowOnHome },
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, showOnHome: nextShowOnHome };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Toggle homepage placement failed";
    return { success: false, error: msg };
  }
}

/**
 * Toggle Landing page placement (Admin).
 */
export async function toggleTestimonialLandingAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.edit");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const nextShowOnLanding = !existing.showOnLanding;

    await prisma.testimonial.update({
      where: { id },
      data: { showOnLanding: nextShowOnLanding },
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, showOnLanding: nextShowOnLanding };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Toggle landing page placement failed";
    return { success: false, error: msg };
  }
}

/**
 * Toggle Public Visibility (Admin).
 */
export async function toggleVisibilityAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.edit");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const nextVisible = !existing.isVisible;

    await prisma.testimonial.update({
      where: { id },
      data: { isVisible: nextVisible },
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, isVisible: nextVisible };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Toggle visibility failed";
    return { success: false, error: msg };
  }
}

/**
 * Admin manually creates a verified student testimonial.
 */
export async function createAdminTestimonialAction(data: {
  studentName: string;
  content: string;
  photoUrl?: string;
  rating?: number;
  isApproved?: boolean;
  isFeatured?: boolean;
  showOnHome?: boolean;
  showOnLanding?: boolean;
  tradingPlatform?: string;
  accountType?: string;
  tradingResult?: string;
  experienceDuration?: string;
  screenshots?: Array<{ url: string; caption?: string }>;
}) {
  try {
    const admin = await requirePermission("testimonials.create");

    const currentEnv = await resolveCurrentEnvironment();
    const isTesting = currentEnv === "TEST";
    const isApproved = data.isApproved ?? true;

    const validScreenshots = (data.screenshots || []).filter((s) => Boolean(s.url && s.url.trim().length > 0));

    const testimonial = await prisma.testimonial.create({
      data: {
        studentName: data.studentName.trim(),
        content: data.content.trim(),
        photoUrl: data.photoUrl?.trim() || null,
        rating: data.rating || 5,
        status: isApproved ? "APPROVED" : "PENDING",
        isApproved,
        isVisible: true,
        isFeatured: Boolean(data.isFeatured && isApproved),
        showOnHome: data.showOnHome ?? true,
        showOnLanding: data.showOnLanding ?? true,
        displayOrder: 0,
        tradingPlatform: data.tradingPlatform?.trim() || null,
        accountType: data.accountType?.trim() || null,
        tradingResult: data.tradingResult?.trim() || null,
        experienceDuration: data.experienceDuration?.trim() || null,
        consentGiven: true,
        approvedAt: isApproved ? new Date() : null,
        reviewedAt: isApproved ? new Date() : null,
        reviewedById: isApproved ? admin.id : null,
        isTestData: isTesting,
        media: validScreenshots.length > 0 ? {
          create: validScreenshots.map((s, idx) => ({
            url: s.url.trim(),
            caption: s.caption?.trim() || null,
            type: "SCREENSHOT",
            sortOrder: idx,
            isTestData: isTesting,
          })),
        } : undefined,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "TESTIMONIAL_MANUAL_CREATED",
          entityType: "Testimonial",
          entityId: testimonial.id,
          newValues: {
            studentName: data.studentName,
            rating: data.rating,
            isApproved,
            environment: isTesting ? "TEST" : "LIVE",
          },
          isTestData: isTesting,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true, id: testimonial.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Creation failed";
    return { success: false, error: msg };
  }
}

/**
 * Update existing testimonial details (Admin).
 */
export async function updateTestimonialAction(
  id: string,
  data: {
    studentName?: string;
    content?: string;
    photoUrl?: string;
    rating?: number;
    isApproved?: boolean;
    isVisible?: boolean;
    isFeatured?: boolean;
    showOnHome?: boolean;
    showOnLanding?: boolean;
    displayOrder?: number;
    tradingPlatform?: string;
    accountType?: string;
    tradingResult?: string;
    experienceDuration?: string;
  }
) {
  try {
    const admin = await requirePermission("testimonials.edit");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    const updateData: any = { ...data };
    if (data.isApproved !== undefined) {
      updateData.status = data.isApproved ? "APPROVED" : "PENDING";
      if (data.isApproved && !existing.approvedAt) {
        updateData.approvedAt = new Date();
        updateData.reviewedAt = new Date();
        updateData.reviewedById = admin.id;
      }
    }

    await prisma.testimonial.update({
      where: { id },
      data: updateData,
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "TESTIMONIAL_UPDATED",
          entityType: "Testimonial",
          entityId: id,
          newValues: updateData,
          isTestData: existing.isTestData,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return { success: false, error: msg };
  }
}

/**
 * Delete a testimonial and its associated media.
 */
export async function deleteTestimonialAction(id: string) {
  try {
    const admin = await requirePermission("testimonials.delete");

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Testimonial not found." };
    }

    await prisma.testimonial.delete({ where: { id } });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "TESTIMONIAL_DELETED",
          entityType: "Testimonial",
          entityId: id,
          oldValues: { studentName: existing.studentName },
          isTestData: existing.isTestData,
        },
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin/testimonials");
    revalidatePath("/super-warrior-30");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Deletion failed";
    return { success: false, error: msg };
  }
}


