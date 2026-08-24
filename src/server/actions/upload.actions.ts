"use server";

import { requireAdmin } from "@/server/dal/auth";
import { createPresignedUploadUrl } from "@/lib/storage";
import { uploadSchema } from "@/lib/validations/course.schema";
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, SIGNED_URL_EXPIRY } from "@/lib/constants";
import crypto from "crypto";

export async function getPresignedUploadUrlAction(input: {
  filename: string;
  mimeType: string;
  size: number;
  category: "video" | "pdf" | "thumbnail" | "image";
  courseId: string;
  moduleId?: string;
  lessonId?: string;
}) {
  await requireAdmin();

  const validated = uploadSchema.parse({
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.size,
    category: input.category,
  });

  // Validate MIME type based on category
  const allowedTypes = (() => {
    switch (validated.category) {
      case "video":
        return ALLOWED_MIME_TYPES.VIDEO as readonly string[];
      case "pdf":
        return ALLOWED_MIME_TYPES.PDF as readonly string[];
      case "thumbnail":
      case "image":
        return ALLOWED_MIME_TYPES.IMAGE as readonly string[];
    }
  })();

  if (!allowedTypes.includes(validated.mimeType)) {
    throw new Error(
      `Invalid file type: ${validated.mimeType}. Allowed: ${allowedTypes.join(", ")}`
    );
  }

  // Validate file size based on category
  const maxSize = (() => {
    switch (validated.category) {
      case "video":
        return MAX_FILE_SIZES.VIDEO;
      case "pdf":
        return MAX_FILE_SIZES.PDF;
      case "thumbnail":
        return MAX_FILE_SIZES.THUMBNAIL;
      case "image":
        return MAX_FILE_SIZES.IMAGE;
    }
  })();

  if (validated.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`File too large. Maximum size: ${maxMB}MB`);
  }

  // Build secure R2 key path
  const ext = validated.filename.split(".").pop()?.toLowerCase() || "bin";
  const uniqueId = crypto.randomUUID();

  let key: string;
  if (validated.category === "thumbnail") {
    key = `courses/${input.courseId}/thumbnail-${uniqueId}.${ext}`;
  } else if (validated.category === "video" && input.lessonId) {
    key = `courses/${input.courseId}/lessons/${input.lessonId}/video-${uniqueId}.${ext}`;
  } else if (validated.category === "pdf" && input.lessonId) {
    key = `courses/${input.courseId}/lessons/${input.lessonId}/doc-${uniqueId}.${ext}`;
  } else {
    key = `courses/${input.courseId}/files/${uniqueId}.${ext}`;
  }

  const { uploadUrl } = await createPresignedUploadUrl({
    key,
    contentType: validated.mimeType,
    contentLength: validated.size,
    expiresIn: SIGNED_URL_EXPIRY.UPLOAD,
  });

  return { uploadUrl, key };
}
