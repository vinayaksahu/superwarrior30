import type { Metadata } from "next";
import { requirePermission } from "@/server/dal/auth";
import { getAdminTestimonialsAction } from "@/server/actions/testimonial.actions";
import { AdminTestimonialsClient } from "@/components/admin/admin-testimonials-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonials Moderation & Reviews | Admin Panel",
};

export default async function AdminTestimonialsPage() {
  await requirePermission("testimonials.view");
  const testimonials = await getAdminTestimonialsAction();

  return <AdminTestimonialsClient initialTestimonials={testimonials as any} />;
}

