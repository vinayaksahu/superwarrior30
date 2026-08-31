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
    .optional()
    .nullable()
    .or(z.literal("")),
  description: z.string().optional().nullable().or(z.literal("")),
  courseId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "ALL" || !val ? null : val)),
  provider: liveSessionProviderEnum.default("ZOOM"),
  meetingUrl: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      const trimmed = val.trim();
      if (!/^https?:\/\//i.test(trimmed) && trimmed.includes(".")) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }),
  meetingId: z.string().optional().nullable().or(z.literal("")),
  passcode: z.string().optional().nullable().or(z.literal("")),
  roomName: z.string().optional().nullable().or(z.literal("")),
  scheduledAt: z.union([z.string(), z.date()]).refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Please select a valid date and time",
  }),
  durationMinutes: z.coerce.number().min(5, "Minimum duration is 5 minutes").max(480, "Maximum duration is 8 hours").default(60),
  status: liveSessionStatusEnum.default("UPCOMING"),
  recordingUrl: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      const trimmed = val.trim();
      if (!/^https?:\/\//i.test(trimmed) && trimmed.includes(".")) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }),
  bunnyVideoId: z.string().optional().nullable().or(z.literal("")),
  isPublished: z.boolean().default(true),
});

export type LiveSessionInput = z.infer<typeof liveSessionSchema>;
