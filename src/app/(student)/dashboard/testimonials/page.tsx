import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { getStudentTestimonialsAction } from "@/server/actions/testimonial.actions";
import { StudentTestimonialsClient } from "@/components/student/student-testimonials-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonials & Reviews | Rahul Trade Warrior Academy",
};

export default async function StudentTestimonialsPage() {
  const user = await requireAuth();
  const testimonials = await getStudentTestimonialsAction();

  return (
    <StudentTestimonialsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isTestData: user.isTestData,
      }}
      initialTestimonials={testimonials}
    />
  );
}