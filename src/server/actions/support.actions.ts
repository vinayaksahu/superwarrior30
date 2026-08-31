"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SupportInquiryStatus } from "@/generated/prisma";

const contactInquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().nullable(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.string().default("GENERAL"),
  orderNumber: z.string().optional().nullable(),
});

export type SubmitContactInquiryInput = z.infer<typeof contactInquirySchema>;

export async function submitSupportInquiryAction(input: SubmitContactInquiryInput) {
  await ensureDatabaseSchemaSync();
  try {
    const validated = contactInquirySchema.parse(input);

    const inquiry = await prisma.supportInquiry.create({
      data: {
        name: validated.name.trim(),
        email: validated.email.trim().toLowerCase(),
        phone: validated.phone?.trim() || null,
        subject: validated.subject.trim(),
        message: validated.message.trim(),
        category: validated.category || "GENERAL",
        orderNumber: validated.orderNumber?.trim() || null,
        status: "NEW",
      },
    });

    return {
      success: true,
      inquiryId: inquiry.id,
      message: "Your inquiry has been logged successfully. Our support desk will reach out within 24 hours.",
    };
  } catch (error) {
    console.error("Error submitting support inquiry:", error);
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

export async function getAdminSupportInquiriesAction(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
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

  if (params.category && params.category !== "ALL") {
    where.category = params.category;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { orderNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [inquiries, totalCount, statsNew, statsInProgress, statsResolved, statsClosed] = await Promise.all([
      prisma.supportInquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.supportInquiry.count({ where }),
      prisma.supportInquiry.count({ where: { status: "NEW" } }),
      prisma.supportInquiry.count({ where: { status: "IN_PROGRESS" } }),
      prisma.supportInquiry.count({ where: { status: "RESOLVED" } }),
      prisma.supportInquiry.count({ where: { status: "CLOSED" } }),
    ]);

    return {
      inquiries: inquiries.map((item) => ({
        ...item,
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
        total: statsNew + statsInProgress + statsResolved + statsClosed,
        new: statsNew,
        inProgress: statsInProgress,
        resolved: statsResolved,
        closed: statsClosed,
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
        new: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
      },
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
