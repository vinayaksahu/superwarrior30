"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/server/dal/auth";
import {
  liveSessionSchema,
  type LiveSessionInput,
} from "@/lib/validations/live-session.schema";
import { generateSlug } from "@/lib/utils";
import type { ActionState } from "@/types";
import { Prisma, LiveSessionStatus, LiveSessionProvider } from "@/generated/prisma";
import crypto from "crypto";

// ==========================================
// 1. ADMIN: FETCH ALL LIVE SESSIONS
// ==========================================

export async function getLiveSessionsAdminAction(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireAdmin();

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.LiveSessionWhereInput = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status as LiveSessionStatus;
  }

  if (params?.search && params.search.trim().length > 0) {
    where.OR = [
      { title: { contains: params.search.trim(), mode: "insensitive" } },
      { description: { contains: params.search.trim(), mode: "insensitive" } },
      { meetingId: { contains: params.search.trim(), mode: "insensitive" } },
    ];
  }

  const [sessions, total] = await Promise.all([
    prisma.liveSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { status: "asc" }, // LIVE and UPCOMING first
        { scheduledAt: "desc" },
      ],
      include: {
        course: { select: { id: true, title: true, slug: true } },
        host: { select: { id: true, name: true, email: true } },
        _count: { select: { attendees: true } },
      },
    }),
    prisma.liveSession.count({ where }),
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLiveSessionByIdAdminAction(id: string) {
  await requireAdmin();

  const session = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      host: { select: { id: true, name: true, email: true } },
      attendees: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  return session;
}

// ==========================================
// 2. ADMIN: CREATE / UPDATE / DELETE LIVE SESSION
// ==========================================

export async function createLiveSessionAction(
  input: LiveSessionInput
): Promise<ActionState<{ id: string; slug: string }>> {
  const admin = await requireAdmin();

  const parsed = liveSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const data = parsed.data;

  // Generate unique slug
  let slug = data.slug ? generateSlug(data.slug) : generateSlug(data.title);
  const existing = await prisma.liveSession.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
  }

  // Generate unique roomName for embedded rooms
  const roomName =
    data.roomName?.trim() ||
    `sw30-${slug.substring(0, 30)}-${crypto.randomBytes(3).toString("hex")}`;

  try {
    const session = await prisma.liveSession.create({
      data: {
        title: data.title.trim(),
        slug,
        description: data.description?.trim() || null,
        courseId: data.courseId && data.courseId !== "ALL" ? data.courseId : null,
        provider: data.provider,
        meetingUrl: data.meetingUrl?.trim() || null,
        meetingId: data.meetingId?.trim() || null,
        passcode: data.passcode?.trim() || null,
        roomName,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        status: data.status,
        recordingUrl: data.recordingUrl?.trim() || null,
        bunnyVideoId: data.bunnyVideoId?.trim() || null,
        isPublished: data.isPublished,
        createdById: admin.id,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "LIVE_SESSION_CREATED",
        entityType: "LiveSession",
        entityId: session.id,
        newValues: {
          title: session.title,
          provider: session.provider,
          scheduledAt: session.scheduledAt.toISOString(),
          status: session.status,
        },
      },
    });

    revalidatePath("/admin/live-sessions");
    revalidatePath("/dashboard/live");

    return {
      success: true,
      message: "Live session scheduled successfully.",
      data: { id: session.id, slug: session.slug },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create live session",
    };
  }
}

export async function updateLiveSessionAction(
  id: string,
  input: LiveSessionInput
): Promise<ActionState<{ id: string }>> {
  const admin = await requireAdmin();

  const parsed = liveSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const data = parsed.data;

  try {
    const existing = await prisma.liveSession.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Live session not found" };
    }

    const session = await prisma.liveSession.update({
      where: { id },
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        courseId: data.courseId && data.courseId !== "ALL" ? data.courseId : null,
        provider: data.provider,
        meetingUrl: data.meetingUrl?.trim() || null,
        meetingId: data.meetingId?.trim() || null,
        passcode: data.passcode?.trim() || null,
        roomName: data.roomName?.trim() || existing.roomName,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        status: data.status,
        recordingUrl: data.recordingUrl?.trim() || null,
        bunnyVideoId: data.bunnyVideoId?.trim() || null,
        isPublished: data.isPublished,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "LIVE_SESSION_UPDATED",
        entityType: "LiveSession",
        entityId: session.id,
        oldValues: {
          title: existing.title,
          status: existing.status,
          scheduledAt: existing.scheduledAt.toISOString(),
        },
        newValues: {
          title: session.title,
          status: session.status,
          scheduledAt: session.scheduledAt.toISOString(),
        },
      },
    });

    revalidatePath("/admin/live-sessions");
    revalidatePath(`/admin/live-sessions/${id}`);
    revalidatePath("/dashboard/live");
    revalidatePath(`/dashboard/live/${id}`);

    return {
      success: true,
      message: "Live session updated successfully.",
      data: { id: session.id },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update live session",
    };
  }
}

export async function toggleLiveSessionStatusAction(
  id: string,
  status: LiveSessionStatus
): Promise<ActionState> {
  const admin = await requireAdmin();

  try {
    const session = await prisma.liveSession.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `LIVE_SESSION_STATUS_${status}`,
        entityType: "LiveSession",
        entityId: session.id,
        newValues: { status },
      },
    });

    revalidatePath("/admin/live-sessions");
    revalidatePath("/dashboard/live");
    revalidatePath(`/dashboard/live/${id}`);

    return {
      success: true,
      message: `Session is now marked as ${status}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update session status",
    };
  }
}

export async function deleteLiveSessionAction(id: string): Promise<ActionState> {
  const admin = await requireAdmin();

  try {
    const session = await prisma.liveSession.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "LIVE_SESSION_DELETED",
        entityType: "LiveSession",
        entityId: id,
        oldValues: { title: session.title, scheduledAt: session.scheduledAt },
      },
    });

    revalidatePath("/admin/live-sessions");
    revalidatePath("/dashboard/live");

    return {
      success: true,
      message: "Live session deleted permanently.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete session",
    };
  }
}

// ==========================================
// 3. STUDENT: LIVE HUB & CLASSROOM ACCESS
// ==========================================

export async function getStudentLiveSessionsAction() {
  const user = await requireAuth();

  // Find courses student is actively enrolled in
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    select: { courseId: true },
  });

  const enrolledCourseIds = enrollments.map((e) => e.courseId);

  // Eligible sessions: either not tied to any course (open for all enrolled students) OR tied to user's enrolled course
  const accessibleSessions = await prisma.liveSession.findMany({
    where: {
      isPublished: true,
      OR: [
        { courseId: null },
        { courseId: { in: enrolledCourseIds } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      host: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
  });

  const liveNow = accessibleSessions.filter((s) => s.status === "LIVE");
  const upcoming = accessibleSessions.filter((s) => s.status === "UPCOMING");
  const replays = accessibleSessions.filter(
    (s) => s.status === "COMPLETED" && (s.recordingUrl || s.bunnyVideoId)
  );

  return {
    liveNow,
    upcoming,
    replays,
    totalCount: accessibleSessions.length,
    enrolledCourseCount: enrolledCourseIds.length,
  };
}

export async function getLiveSessionForStudentAction(sessionIdOrSlug: string) {
  const user = await requireAuth();

  const session = await prisma.liveSession.findFirst({
    where: {
      OR: [{ id: sessionIdOrSlug }, { slug: sessionIdOrSlug }],
      isPublished: true,
    },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      host: { select: { id: true, name: true } },
    },
  });

  if (!session) {
    return { success: false, message: "Live session not found." };
  }

  // Access check
  if (session.courseId) {
    const isEnrolled = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: session.courseId,
        },
      },
    });

    const isStaff = user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "SUPPORT";

    if (!isEnrolled && !isStaff) {
      return {
        success: false,
        message: "You are not enrolled in the course required for this live class.",
        requiresEnrollment: true,
        courseSlug: session.course?.slug,
      };
    }
  }

  // Record Attendance asynchronously
  try {
    await prisma.liveSessionAttendee.upsert({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId: user.id,
        },
      },
      update: {
        joinedAt: new Date(),
      },
      create: {
        sessionId: session.id,
        userId: user.id,
      },
    });
  } catch {
    // Non-blocking
  }

  return {
    success: true,
    session,
    currentUser: {
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
    },
  };
}
