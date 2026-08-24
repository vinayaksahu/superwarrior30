import { z } from "zod";

export const courseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
  shortDescription: z
    .string()
    .max(500, "Short description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  fullDescription: z
    .string()
    .max(10000, "Description must be less than 10000 characters")
    .optional()
    .or(z.literal("")),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Price must be a positive number"),
  compareAtPrice: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Compare price must be a positive number"
    ),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  isFeatured: z.coerce.boolean().default(false),
  isReferralEligible: z.coerce.boolean().default(true),
});

export const moduleSchema = z.object({
  title: z
    .string()
    .min(1, "Module title is required")
    .max(200, "Title must be less than 200 characters"),
  isPublished: z.coerce.boolean().default(true),
});

export const lessonSchema = z.object({
  title: z
    .string()
    .min(1, "Lesson title is required")
    .max(200, "Title must be less than 200 characters"),
  contentType: z.enum(["VIDEO", "PDF", "TEXT"]),
  textContent: z
    .string()
    .max(50000)
    .optional()
    .or(z.literal("")),
  durationSec: z.coerce.number().int().min(0).default(0),
  isFreePreview: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(true),
});

export const uploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().positive("File size must be positive"),
  category: z.enum(["video", "pdf", "thumbnail", "image"]),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
