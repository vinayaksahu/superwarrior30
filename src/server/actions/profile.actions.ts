"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/dal/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import type { ActionState } from "@/types";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function updateProfileAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth();

  const validated = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: validated.data.name.trim(),
      phone: validated.data.phone?.trim() || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Profile updated successfully." };
}

export async function changePasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth();

  const validated = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!currentUser) {
    return { success: false, message: "User not found." };
  }

  const isCurrentValid = await verifyPassword(
    validated.data.currentPassword,
    currentUser.passwordHash
  );

  if (!isCurrentValid) {
    return {
      success: false,
      message: "Incorrect current password.",
      errors: { currentPassword: ["Current password does not match."] },
    };
  }

  const newHash = await hashPassword(validated.data.newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });

  // Refresh current session with new tokenVersion
  const { createSession } = await import("@/lib/auth/session");
  await createSession(updatedUser.id, updatedUser.email, updatedUser.role, updatedUser.tokenVersion);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
    },
  });

  return { success: true, message: "Password changed successfully. All other active sessions have been invalidated." };
}
