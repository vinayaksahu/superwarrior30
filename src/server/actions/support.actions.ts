"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SupportInquiryStatus } from "@/generated/prisma";

// ==========================================
// 1. PUBLIC CONTACT SUBMISSION (GUEST)
// ==========================================

const publicContactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().optional().nullable(),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});

export type SubmitPublicContactInput = z.infer<typeof publicContactSchema>;

export async function submitPublicContactAction(input: SubmitPublicContactInput) {
  await ensureDatabaseSchemaSync();

  try {
    const validated = publicContactSchema.parse(input);

    const inquiry = await prisma.supportInquiry.create({
      data: {
        name: validated.name,
        email: validated.email.toLowerCase(),
        phone: validated.phone || null,
        subject: validated.subject,
        message: validated.message,
        category: "GENERAL",
        source: "PUBLIC_CONTACT",
        status: "OPEN",
      },
    });

    return {
      success: true,
      inquiryId: inquiry.id,
      message: "Thank you! Your inquiry has been submitted successfully. Our team will contact you soon.",
    };
  } catch (error) {
    console.error("Error submitting public contact form:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input parameters",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit inquiry. Please try again.",
    };
  }
}

// ==========================================
// 2. AUTHENTICATED STUDENT TICKET ACTIONS
// ==========================================

const studentTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
  category: z.string().default("GENERAL"),
});

export async function createStudentTicketAction(input: {
  subject: string;
  message: string;
  category?: string;
}) {
  const user = await requireAuth();
  await ensureDatabaseSchemaSync();

  try {
    const validated = studentTicketSchema.parse(input);

    const ticket = await prisma.supportInquiry.create({
      data: {
        name: user.name || "Student",
        email: user.email,
        phone: user.phone || null,
        subject: validated.subject,
        message: validated.message,
        category: validated.category || "GENERAL",
        source: "STUDENT_TICKET",
        status: "OPEN",
        userId: user.id,
        messages: {
          create: {
            senderId: user.id,
            senderRole: "STUDENT",
            senderName: user.name || "Student",
            message: validated.message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    revalidatePath("/dashboard/support");
    revalidatePath("/admin/support");

    return {
      success: true,
      ticketId: ticket.id,
      message: "Support ticket created successfully",
    };
  } catch (error) {
    console.error("Error creating student ticket:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input parameters",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create support ticket",
    };
  }
}

export async function getStudentTicketsAction() {
  const user = await requireAuth();
  await ensureDatabaseSchemaSync();

  try {
    const tickets = await prisma.supportInquiry.findMany({
      where: {
        userId: user.id,
        source: "STUDENT_TICKET",
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return {
      success: true,
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastMessage: t.messages[0]?.message || t.message,
        lastSenderRole: t.messages[0]?.senderRole || "STUDENT",
      })),
    };
  } catch (error) {
    console.error("Error fetching student tickets:", error);
    return {
      success: false,
      tickets: [],
      error: error instanceof Error ? error.message : "Failed to load support tickets",
    };
  }
}

export async function getStudentTicketDetailAction(ticketId: string) {
  const user = await requireAuth();
  await ensureDatabaseSchemaSync();

  try {
    const ticket = await prisma.supportInquiry.findFirst({
      where: {
        id: ticketId,
        userId: user.id, // Strictly scoped to authenticated student
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        ticket: null,
        error: "Ticket not found or unauthorized",
      };
    }

    return {
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        message: ticket.message,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        messages: ticket.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          senderName: m.senderName,
          message: m.message,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching ticket detail:", error);
    return {
      success: false,
      ticket: null,
      error: error instanceof Error ? error.message : "Failed to load ticket details",
    };
  }
}

export async function replyStudentTicketAction(params: {
  ticketId: string;
  message: string;
}) {
  const user = await requireAuth();
  await ensureDatabaseSchemaSync();

  if (!params.message || params.message.trim().length < 2) {
    return { success: false, error: "Please enter a valid reply message" };
  }

  try {
    // Verify ownership
    const ticket = await prisma.supportInquiry.findFirst({
      where: {
        id: params.ticketId,
        userId: user.id,
      },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found or unauthorized" };
    }

    if (ticket.status === "CLOSED") {
      return { success: false, error: "This ticket has been closed. Please open a new ticket." };
    }

    await prisma.$transaction([
      prisma.supportInquiryMessage.create({
        data: {
          inquiryId: params.ticketId,
          senderId: user.id,
          senderRole: "STUDENT",
          senderName: user.name || "Student",
          message: params.message.trim(),
        },
      }),
      prisma.supportInquiry.update({
        where: { id: params.ticketId },
        data: {
          status: "OPEN", // Move back to OPEN so admin sees new response
          updatedAt: new Date(),
        },
      }),
    ]);

    revalidatePath(`/dashboard/support/${params.ticketId}`);
    revalidatePath("/dashboard/support");
    revalidatePath("/admin/support");

    return { success: true };
  } catch (error) {
    console.error("Error replying to ticket:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post reply",
    };
  }
}

// ==========================================
// 3. ADMIN SUPPORT DESK ACTIONS
// ==========================================

export async function getAdminSupportInquiriesAction(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  source?: string;
  search?: string;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status as SupportInquiryStatus;
  }

  if (params.source && params.source !== "ALL") {
    where.source = params.source;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [
      inquiries,
      totalCount,
      countPublic,
      countStudentTickets,
      countOpen,
      countInProgress,
      countWaiting,
      countResolved,
      countClosed,
    ] = await Promise.all([
      prisma.supportInquiry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.supportInquiry.count({ where }),
      prisma.supportInquiry.count({ where: { source: "PUBLIC_CONTACT" } }),
      prisma.supportInquiry.count({ where: { source: "STUDENT_TICKET" } }),
      prisma.supportInquiry.count({ where: { status: { in: ["OPEN", "NEW"] } } }),
      prisma.supportInquiry.count({ where: { status: "IN_PROGRESS" } }),
      prisma.supportInquiry.count({ where: { status: "WAITING_FOR_USER" } }),
      prisma.supportInquiry.count({ where: { status: "RESOLVED" } }),
      prisma.supportInquiry.count({ where: { status: "CLOSED" } }),
    ]);

    return {
      inquiries: inquiries.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        subject: item.subject,
        message: item.message,
        category: item.category,
        source: item.source || (item.userId ? "STUDENT_TICKET" : "PUBLIC_CONTACT"),
        status: item.status,
        orderNumber: item.orderNumber,
        adminNotes: item.adminNotes,
        userId: item.userId,
        messageCount: item._count.messages,
        lastMessage: item.messages[0]?.message || item.message,
        lastSenderRole: item.messages[0]?.senderRole || "GUEST",
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      metrics: {
        total: totalCount,
        publicCount: countPublic,
        studentTicketsCount: countStudentTickets,
        open: countOpen,
        inProgress: countInProgress,
        waitingForUser: countWaiting,
        resolved: countResolved,
        closed: countClosed,
      },
    };
  } catch (err) {
    console.error("Error in getAdminSupportInquiriesAction:", err);
    return {
      inquiries: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1,
      },
      metrics: {
        total: 0,
        publicCount: 0,
        studentTicketsCount: 0,
        open: 0,
        inProgress: 0,
        waitingForUser: 0,
        resolved: 0,
        closed: 0,
      },
    };
  }
}

export async function getAdminInquiryDetailAction(id: string) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  try {
    const inquiry = await prisma.supportInquiry.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inquiry) {
      return { success: false, inquiry: null, error: "Record not found" };
    }

    return {
      success: true,
      inquiry: {
        ...inquiry,
        source: inquiry.source || (inquiry.userId ? "STUDENT_TICKET" : "PUBLIC_CONTACT"),
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString(),
        messages: inquiry.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          senderName: m.senderName,
          message: m.message,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching admin inquiry detail:", error);
    return {
      success: false,
      inquiry: null,
      error: error instanceof Error ? error.message : "Failed to load details",
    };
  }
}

export async function replyAdminInquiryAction(params: {
  inquiryId: string;
  message: string;
  newStatus?: SupportInquiryStatus;
}) {
  const admin = await requireAdmin();
  await ensureDatabaseSchemaSync();

  if (!params.message || params.message.trim().length < 2) {
    return { success: false, error: "Please enter a valid reply message" };
  }

  try {
    const inquiry = await prisma.supportInquiry.findUnique({
      where: { id: params.inquiryId },
    });

    if (!inquiry) {
      return { success: false, error: "Record not found" };
    }

    const nextStatus = params.newStatus || "WAITING_FOR_USER";

    await prisma.$transaction([
      prisma.supportInquiryMessage.create({
        data: {
          inquiryId: params.inquiryId,
          senderId: admin.id,
          senderRole: "ADMIN",
          senderName: admin.name || "Support Staff",
          message: params.message.trim(),
        },
      }),
      prisma.supportInquiry.update({
        where: { id: params.inquiryId },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      }),
    ]);

    revalidatePath("/admin/support");
    if (inquiry.userId) {
      revalidatePath(`/dashboard/support/${inquiry.id}`);
      revalidatePath("/dashboard/support");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending admin reply:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send reply",
    };
  }
}

export async function updateSupportInquiryStatusAction(params: {
  id: string;
  status: SupportInquiryStatus;
  adminNotes?: string;
}) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  try {
    const updated = await prisma.supportInquiry.update({
      where: { id: params.id },
      data: {
        status: params.status,
        ...(params.adminNotes !== undefined ? { adminNotes: params.adminNotes } : {}),
      },
    });

    revalidatePath("/admin/support");
    if (updated.userId) {
      revalidatePath(`/dashboard/support/${updated.id}`);
      revalidatePath("/dashboard/support");
    }

    return { success: true, inquiry: updated };
  } catch (error) {
    console.error("Error updating support inquiry status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update inquiry status",
    };
  }
}

export async function deleteSupportInquiryAction(id: string) {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  try {
    await prisma.supportInquiry.delete({
      where: { id },
    });

    revalidatePath("/admin/support");
    return { success: true };
  } catch (error) {
    console.error("Error deleting support inquiry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete inquiry",
    };
  }
}
