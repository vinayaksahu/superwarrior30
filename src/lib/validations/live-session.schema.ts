import { z } from "zod";

export const liveSessionProviderEnum = z.enum([
  "ZOOM",
  "GOOGLE_MEET",
  "EMBEDDED_ROOM",
  "BUNNY_LIVE",
  "CUSTOM",
]);

export const liveSessionStatusEnum = z.enum([
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const liveSessionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  provider: liveSessionProviderEnum.default("ZOOM"),
  meetingUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  meetingId: z.string().optional().nullable(),
  passcode: z.string().optional().nullable(),
  roomName: z.string().optional().nullable(),
  scheduledAt: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date and time",
  }),
  durationMinutes: z.coerce.number().min(5, "Minimum duration is 5 minutes").max(480, "Maximum duration is 8 hours").default(60),
  status: liveSessionStatusEnum.default("UPCOMING"),
  recordingUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  bunnyVideoId: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
});

export type LiveSessionInput = z.infer<typeof liveSessionSchema>;
