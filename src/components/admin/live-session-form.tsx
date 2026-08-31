"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLiveSessionAction,
  updateLiveSessionAction,
} from "@/server/actions/live-session.actions";
import {
  liveSessionSchema,
  type LiveSessionInput,
} from "@/lib/validations/live-session.schema";
import { DarkDateTimePicker } from "@/components/ui/dark-date-time-picker";
import {
  Video,
  Calendar,
  Clock,
  Link as LinkIcon,
  Save,
  Radio,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface LiveSessionFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    courseId: string | null;
    provider: string;
    meetingUrl: string | null;
    meetingId: string | null;
    passcode: string | null;
    roomName: string | null;
    scheduledAt: Date | string;
    durationMinutes: number;
    status: string;
    recordingUrl: string | null;
    bunnyVideoId: string | null;
    isPublished: boolean;
  };
  courses: Array<{
    id: string;
    title: string;
  }>;
}

export function LiveSessionForm({ initialData, courses }: LiveSessionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(initialData);

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDatetimeLocal = (d?: Date | string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState<LiveSessionInput>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    courseId: initialData?.courseId || "ALL",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: (initialData?.provider as any) || "ZOOM",
    meetingUrl: initialData?.meetingUrl || "",
    meetingId: initialData?.meetingId || "",
    passcode: initialData?.passcode || "",
    roomName: initialData?.roomName || "",
    scheduledAt: initialData?.scheduledAt
      ? formatDatetimeLocal(initialData.scheduledAt)
      : formatDatetimeLocal(new Date(Date.now() + 3600 * 1000 * 24)),
    durationMinutes: initialData?.durationMinutes || 60,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (initialData?.status as any) || "UPCOMING",
    recordingUrl: initialData?.recordingUrl || "",
    bunnyVideoId: initialData?.bunnyVideoId || "",
    isPublished: initialData ? initialData.isPublished : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = liveSessionSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      let firstMsg = "Please fix form errors before submitting";
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      if (parsed.error.issues[0]?.message) {
        firstMsg = parsed.error.issues[0].message;
      }
      setErrors(fieldErrors);
      toast.error(firstMsg);
      return;
    }

    startTransition(async () => {
      if (isEditing && initialData) {
        const res = await updateLiveSessionAction(initialData.id, parsed.data);
        if (res.success) {
          toast.success(res.message);
          router.push("/admin/live-sessions");
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createLiveSessionAction(parsed.data);
        if (res.success) {
          toast.success(res.message);
          router.push("/admin/live-sessions");
          router.refresh();
        } else {
          toast.error(res.message);
        }
      }
    });
  };

  const inputClasses =
    "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* 1. Basic Info */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Radio className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-foreground">Session Overview</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Session Title <span className="text-destructive">*</span>
            </label>
            <input
              className={inputClasses}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Live BankNifty Expiry Strategy & Q&A Mentorship"
              required
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Target Audience / Course Scope
              </label>
              <select
                value={formData.courseId || "ALL"}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className={inputClasses}
              >
                <option value="ALL">🌐 All Enrolled Students (Platform Wide)</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    📚 {course.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Select whether all students or only students of a specific course can join.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Live Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className={inputClasses}
              >
                <option value="UPCOMING">📅 UPCOMING (Scheduled)</option>
                <option value="LIVE">🔴 LIVE NOW (Active Class)</option>
                <option value="COMPLETED">✅ COMPLETED (Finished)</option>
                <option value="CANCELLED">❌ CANCELLED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Description & Topics Covered
            </label>
            <textarea
              className={inputClasses}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Explain what strategy or chart setup will be analyzed in this live session..."
            />
          </div>
        </div>
      </div>

      {/* 2. Provider & Meeting Connection */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Video className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Video Provider & Meeting Details</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Live Meeting Provider <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "ZOOM", label: "Zoom Meeting", desc: "External Zoom Link" },
                { id: "GOOGLE_MEET", label: "Google Meet", desc: "Google Meet Link" },
                { id: "EMBEDDED_ROOM", label: "In-App Live Room", desc: "2-Way WebRTC in Browser" },
                { id: "BUNNY_LIVE", label: "Bunny Broadcast", desc: "OBS / RTMP Stream" },
              ].map((prov) => (
                <button
                  type="button"
                  key={prov.id}
                  onClick={() =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setFormData({ ...formData, provider: prov.id as any })
                  }
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    formData.provider === prov.id
                      ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{prov.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{prov.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields based on Provider */}
          {formData.provider === "ZOOM" && (
            <div className="space-y-4 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Zoom Join URL <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClasses}
                  value={formData.meetingUrl || ""}
                  onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                  placeholder="https://us02web.zoom.us/j/1234567890?pwd=..."
                  required
                />
                {errors.meetingUrl && <p className="text-xs text-destructive mt-1">{errors.meetingUrl}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Meeting ID (Optional)
                  </label>
                  <input
                    className={inputClasses}
                    value={formData.meetingId || ""}
                    onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                    placeholder="e.g. 845 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Passcode (Optional)
                  </label>
                  <input
                    className={inputClasses}
                    value={formData.passcode || ""}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    placeholder="e.g. 123456"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.provider === "GOOGLE_MEET" && (
            <div className="space-y-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Google Meet URL <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClasses}
                  value={formData.meetingUrl || ""}
                  onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  required
                />
                {errors.meetingUrl && <p className="text-xs text-destructive mt-1">{errors.meetingUrl}</p>}
              </div>
            </div>
          )}

          {formData.provider === "EMBEDDED_ROOM" && (
            <div className="space-y-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>Zero-Install Browser Video Room</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Students will join an interactive, 2-way WebRTC classroom with mic, camera, screen-sharing and live chat directly inside their dashboard. No external app installation needed.
              </p>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Room Identifier (Auto-generated)
                </label>
                <input
                  className={inputClasses}
                  value={formData.roomName || ""}
                  onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                  placeholder="Auto-generated secure room slug"
                />
              </div>
            </div>
          )}

          {formData.provider === "BUNNY_LIVE" && (
            <div className="space-y-3 rounded-xl bg-orange-500/5 border border-orange-500/20 p-4">
              <p className="text-xs text-muted-foreground">
                Stream from OBS Studio or hardware encoder to Bunny Live Stream. Students will watch HLS high-definition playback.
              </p>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Playback HLS / Bunny URL
                </label>
                <input
                  className={inputClasses}
                  value={formData.meetingUrl || ""}
                  onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                  placeholder="https://video.bunnycdn.com/play/..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Timing & Schedule */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Calendar className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-foreground">Date, Time & Duration</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <DarkDateTimePicker
              value={formData.scheduledAt as string}
              onChange={(newVal) => {
                setFormData({ ...formData, scheduledAt: newVal });
                if (errors.scheduledAt) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.scheduledAt;
                    return next;
                  });
                }
              }}
              error={errors.scheduledAt}
              label="Scheduled Date & Time"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Expected Duration (Minutes) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={5}
              max={480}
              className={inputClasses}
              value={formData.durationMinutes}
              onChange={(e) =>
                setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 60 })
              }
              required
            />
          </div>
        </div>
      </div>

      {/* 4. Post-Session Recording & Replay */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <LinkIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Post-Session Recording Replay</h2>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            After the live session is completed, add the recording URL or Bunny Stream Video ID so students can watch the replay anytime from their dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                External Recording URL (YouTube / Drive / Zoom Cloud)
              </label>
              <input
                className={inputClasses}
                value={formData.recordingUrl || ""}
                onChange={(e) => setFormData({ ...formData, recordingUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Bunny Stream Video GUID
              </label>
              <input
                className={inputClasses}
                value={formData.bunnyVideoId || ""}
                onChange={(e) => setFormData({ ...formData, bunnyVideoId: e.target.value })}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.push("/admin/live-sessions")}
          disabled={isPending}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{isPending ? "Saving..." : isEditing ? "Update Session" : "Schedule Live Class"}</span>
        </button>
      </div>
    </form>
  );
}
