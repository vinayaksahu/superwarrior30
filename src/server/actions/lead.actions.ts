"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { PAGINATION } from "@/lib/constants";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import type { LeadStage, Prisma } from "@/generated/prisma";

// ==========================================
// 1. QUIZ SUBMISSION & LEAD CREATION
// ==========================================

export async function submitQuizAction(data: {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  tradingExperience?: string;
  targetMarket?: string;
  mainChallenge?: string;
  lossRange?: string;
  learningGoals?: string;
  readyForTraining?: string;
  source?: string;
  courseId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}) {
  await ensureDatabaseSchemaSync();
  try {
    // Check if lead already exists by email
    let lead = null;
    if (data.email) {
      lead = await prisma.lead.findFirst({
        where: { email: data.email.toLowerCase().trim() },
      });
    }

    const quizAnswers = {
      tradingExperience: data.tradingExperience,
      targetMarket: data.targetMarket,
      mainChallenge: data.mainChallenge,
      lossRange: data.lossRange,
      learningGoals: data.learningGoals,
      readyForTraining: data.readyForTraining,
    };

    if (lead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: data.name || lead.name,
          phone: data.phone || lead.phone,
          whatsapp: data.whatsapp || lead.whatsapp,
          tradingExperience: data.tradingExperience,
          targetMarket: data.targetMarket,
          mainChallenge: data.mainChallenge,
          lossRange: data.lossRange,
          learningGoals: data.learningGoals,
          readyForTraining: data.readyForTraining,
          quizAnswers,
          stage: "QUIZ_COMPLETED",
          courseId: data.courseId || lead.courseId,
          source: data.source || lead.source,
          utmSource: data.utmSource || lead.utmSource,
          utmMedium: data.utmMedium || lead.utmMedium,
          utmCampaign: data.utmCampaign || lead.utmCampaign,
          utmContent: data.utmContent || lead.utmContent,
          quizCompletedAt: new Date(),
        },
      });
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          name: data.name,
          email: data.email?.toLowerCase().trim(),
          phone: data.phone,
          whatsapp: data.whatsapp,
          tradingExperience: data.tradingExperience,
          targetMarket: data.targetMarket,
          mainChallenge: data.mainChallenge,
          lossRange: data.lossRange,
          learningGoals: data.learningGoals,
          readyForTraining: data.readyForTraining,
          quizAnswers,
          stage: "QUIZ_COMPLETED",
          courseId: data.courseId,
          source: data.source,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          utmContent: data.utmContent,
          landingPageAt: new Date(),
          quizStartedAt: new Date(),
          quizCompletedAt: new Date(),
        },
      });
    }

    // Record funnel event
    await prisma.funnelEvent.create({
      data: {
        leadId: lead.id,
        eventType: "QUIZ_COMPLETED",
        metadata: quizAnswers,
      },
    });

    return { success: true, leadId: lead.id };
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return { success: false, leadId: null };
  }
}

// ==========================================
// 2. FUNNEL EVENT TRACKING
// ==========================================

export async function trackFunnelEventAction(data: {
  leadId?: string;
  sessionId?: string;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await ensureDatabaseSchemaSync();
  try {
    await prisma.funnelEvent.create({
      data: {
        leadId: data.leadId,
        sessionId: data.sessionId,
        eventType: data.eventType,
        metadata: data.metadata ?? {},
      },
    });

    // Update lead stage if leadId provided
    if (data.leadId) {
      const stageMap: Record<string, LeadStage> = {
        COURSE_VIEWED: "COURSE_VIEWED",
        CHECKOUT_STARTED: "CHECKOUT_STARTED",
        PURCHASE_COMPLETED: "PURCHASED",
      };

      const newStage = stageMap[data.eventType];
      if (newStage) {
        const timestampField = {
          COURSE_VIEWED: "courseViewedAt",
          CHECKOUT_STARTED: "checkoutStartedAt",
          PURCHASE_COMPLETED: "purchaseCompletedAt",
        }[data.eventType];

        await prisma.lead.update({
          where: { id: data.leadId },
          data: {
            stage: newStage,
            ...(timestampField ? { [timestampField]: new Date() } : {}),
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking funnel event:", error);
    return { success: false };
  }
}

// ==========================================
// 3. LINK LEAD TO USER
// ==========================================

export async function linkLeadToUserAction(leadId: string, userId: string) {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { userId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error linking lead to user:", error);
    return { success: false };
  }
}

// ==========================================
// 4. ADMIN: LEADS LIST
// ==========================================

export async function getAdminLeadsAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  stage,
  search,
}: {
  page?: number;
  pageSize?: number;
  stage?: string;
  search?: string;
} = {}) {
  await requireAdmin();

  try {
    const where: Record<string, unknown> = {};

    if (stage && stage !== "all") {
      where.stage = stage;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

// ==========================================
// 5. ADMIN: FUNNEL ANALYTICS
// ==========================================

export async function getAdminFunnelAnalyticsAction() {
  await requireAdmin();

  try {
    const [
      totalVisitors,
      quizStarted,
      quizCompleted,
      courseViewed,
      checkoutStarted,
      purchased,
    ] = await Promise.all([
      prisma.funnelEvent.count({ where: { eventType: "LANDING_PAGE_VISIT" } }),
      prisma.funnelEvent.count({ where: { eventType: "QUIZ_STARTED" } }),
      prisma.funnelEvent.count({ where: { eventType: "QUIZ_COMPLETED" } }),
      prisma.funnelEvent.count({ where: { eventType: "COURSE_VIEWED" } }),
      prisma.funnelEvent.count({ where: { eventType: "CHECKOUT_STARTED" } }),
      prisma.funnelEvent.count({ where: { eventType: "PURCHASE_COMPLETED" } }),
    ]);

    // UTM source breakdown
    const leadsBySource = await prisma.lead.groupBy({
      by: ["utmSource"],
      _count: { id: true },
      where: { utmSource: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Stage breakdown
    const leadsByStage = await prisma.lead.groupBy({
      by: ["stage"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return {
      funnel: {
        totalVisitors,
        quizStarted,
        quizCompleted,
        courseViewed,
        checkoutStarted,
        purchased,
      },
      leadsBySource: leadsBySource.map((s) => ({
        source: s.utmSource || "Direct",
        count: s._count.id,
      })),
      leadsByStage: leadsByStage.map((s) => ({
        stage: s.stage,
        count: s._count.id,
      })),
    };
  } catch (error) {
    console.error("Error fetching funnel analytics:", error);
    return {
      funnel: { totalVisitors: 0, quizStarted: 0, quizCompleted: 0, courseViewed: 0, checkoutStarted: 0, purchased: 0 },
      leadsBySource: [],
      leadsByStage: [],
    };
  }
}
