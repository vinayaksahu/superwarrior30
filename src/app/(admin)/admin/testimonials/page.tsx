import type { Metadata } from "next";
import { getAdminTestimonialsAction, createTestimonialAction, updateTestimonialAction, deleteTestimonialAction } from "@/server/actions/testimonial.actions";
import { Star, Plus, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonials Management",
};

export default async function AdminTestimonialsPage() {
  const testimonials = await getAdminTestimonialsAction();

  async function handleCreate(formData: FormData) {
    "use server";
    await createTestimonialAction({
      studentName: formData.get("studentName") as string,
      content: formData.get("content") as string,
      photoUrl: (formData.get("photoUrl") as string) || undefined,
      rating: parseInt(formData.get("rating") as string) || 5,
      isApproved: formData.get("isApproved") === "on",
    });
    revalidatePath("/admin/testimonials");
  }

  async function handleToggleApproval(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentApproval = formData.get("currentApproval") === "true";
    await updateTestimonialAction(id, { isApproved: !currentApproval });
    revalidatePath("/admin/testimonials");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteTestimonialAction(id);
    revalidatePath("/admin/testimonials");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="h-6 w-6 text-primary" />
          Testimonials
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage student testimonials shown on the sales funnel page
        </p>
      </div>

      {/* Add New Testimonial */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Add New Testimonial
        </h2>

        <form action={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Student Name *</label>
            <input
              type="text"
              name="studentName"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              placeholder="e.g., Rahul Kumar"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Photo URL (optional)</label>
            <input
              type="url"
              name="photoUrl"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Testimonial Content *</label>
            <textarea
              name="content"
              required
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none resize-none"
              placeholder="Student review text..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Rating (1-5)</label>
            <select
              name="rating"
              defaultValue="5"
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
            >
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input type="checkbox" name="isApproved" className="rounded" />
              Approve immediately
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-6 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Add Testimonial
            </button>
          </div>
        </form>
      </div>

      {/* Existing Testimonials */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          All Testimonials ({testimonials.length})
        </h2>

        {testimonials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
            No testimonials yet. Add your first one above.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border bg-card p-5 shadow-sm space-y-3 ${
                  t.isApproved ? "border-emerald-500/30" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{t.studentName}</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < t.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  &ldquo;{t.content}&rdquo;
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className={`text-[10px] font-bold ${t.isApproved ? "text-emerald-500" : "text-amber-500"}`}>
                    {t.isApproved ? "✅ Approved" : "⏳ Pending"}
                  </span>

                  <div className="flex items-center gap-2">
                    <form action={handleToggleApproval}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="currentApproval" value={String(t.isApproved)} />
                      <button
                        type="submit"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                        title={t.isApproved ? "Unapprove" : "Approve"}
                      >
                        {t.isApproved ? (
                          <XCircle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </button>
                    </form>

                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
