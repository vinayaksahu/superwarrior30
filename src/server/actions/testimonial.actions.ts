"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";

// ==========================================
// PUBLIC: GET APPROVED TESTIMONIALS
// ==========================================

export async function getApprovedTestimonialsAction() {
  await ensureDatabaseSchemaSync();
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isApproved: true, isVisible: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return testimonials;
  } catch {
    return [];
  }
}

// ==========================================
// ADMIN: CRUD
// ==========================================

export async function getAdminTestimonialsAction() {
  await requireAdmin();
  try {
    return await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    return [];
  }
}

export async function createTestimonialAction(data: {
  studentName: string;
  content: string;
  photoUrl?: string;
  videoUrl?: string;
  rating?: number;
  isApproved?: boolean;
  courseId?: string;
}) {
  await requireAdmin();

  const testimonial = await prisma.testimonial.create({
    data: {
      studentName: data.studentName,
      content: data.content,
      photoUrl: data.photoUrl,
      videoUrl: data.videoUrl,
      rating: data.rating || 5,
      isApproved: data.isApproved ?? false,
      isVisible: true,
      courseId: data.courseId,
    },
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/super-warrior-30");
  return { success: true, id: testimonial.id };
}

export async function updateTestimonialAction(
  id: string,
  data: {
    studentName?: string;
    content?: string;
    photoUrl?: string;
    videoUrl?: string;
    rating?: number;
    isApproved?: boolean;
    isVisible?: boolean;
  }
) {
  await requireAdmin();

  await prisma.testimonial.update({ where: { id }, data });

  revalidatePath("/admin/testimonials");
  revalidatePath("/super-warrior-30");
  return { success: true };
}

export async function deleteTestimonialAction(id: string) {
  await requireAdmin();

  await prisma.testimonial.delete({ where: { id } });

  revalidatePath("/admin/testimonials");
  revalidatePath("/super-warrior-30");
  return { success: true };
}
