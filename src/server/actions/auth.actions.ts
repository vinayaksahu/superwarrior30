"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth.schema";
import { generateReferralCode } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { APP_URL } from "@/lib/constants";
import { z } from "zod";
import type { ActionState } from "@/types";

export async function loginAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validated = loginSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Invalid form input.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validated.data;
  const cleanEmail = email.toLowerCase().trim();

  // Rate limit: 5 login attempts per minute per email
  const rateLimit = await checkRateLimit({
    key: `login:${cleanEmail}`,
    limit: 5,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many login attempts. Please wait 1 minute before trying again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user) {
    return { success: false, message: "Invalid email or password." };
  }

  if (user.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account has been suspended. Please contact support.",
    };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, message: "Invalid email or password." };
  }

  await createSession(user.id, user.email, user.role, user.tokenVersion);

  const destination = user.role === "ADMIN" ? "/admin" : "/dashboard";
  redirect(destination);
}

export async function registerAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validated = registerSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, referralCode } = validated.data;
  const cleanEmail = email.toLowerCase().trim();

  // Rate limit: 5 registration attempts per 10 minutes per email/IP
  const rateLimit = await checkRateLimit({
    key: `register:${cleanEmail}`,
    limit: 5,
    windowSeconds: 600,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many registration attempts. Please try again later.",
    };
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists.",
    };
  }

  // Validate referral code if provided
  let referrer = null;
  if (referralCode && referralCode.trim()) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
    });
    if (!referrer) {
      return {
        success: false,
        message: "Invalid referral code.",
        errors: { referralCode: ["Referral code not found."] },
      };
    }
  }

  const passwordHash = await hashPassword(password);

  // Generate unique referral code for new user
  let newReferralCode: string;
  let codeExists = true;
  do {
    newReferralCode = generateReferralCode();
    const check = await prisma.user.findUnique({
      where: { referralCode: newReferralCode },
    });
    codeExists = !!check;
  } while (codeExists);

  // Create user, wallet, and referral relationships in a transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: cleanEmail,
        name,
        passwordHash,
        referralCode: newReferralCode,
        tokenVersion: 1,
      },
    });

    // Create wallet for the user
    await tx.wallet.create({
      data: { userId: user.id },
    });

    // Handle referral relationship
    if (referrer) {
      // Prevent self-referral
      if (referrer.id === user.id) {
        throw new Error("Self-referral is not allowed.");
      }

      // Create direct referral relationship
      await tx.referralRelationship.create({
        data: {
          referrerId: referrer.id,
          referredId: user.id,
        },
      });

      // Create closure table entry for direct parent (depth = 1)
      await tx.referralClosure.create({
        data: {
          ancestorId: referrer.id,
          descendantId: user.id,
          depth: 1,
        },
      });

      // Copy referrer's ancestors to create multi-level closure entries
      const uplineAncestors = await tx.referralClosure.findMany({
        where: { descendantId: referrer.id },
      });

      if (uplineAncestors.length > 0) {
        await tx.referralClosure.createMany({
          data: uplineAncestors.map((anc) => ({
            ancestorId: anc.ancestorId,
            descendantId: user.id,
            depth: anc.depth + 1,
          })),
        });
      }
    }

    // Create session for the new user
    await createSession(user.id, user.email, user.role, user.tokenVersion);
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

// ==========================================
// PASSWORD RESET ACTIONS
// ==========================================

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function forgotPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const emailRaw = String(formData.get("email") || "");
  const validated = forgotPasswordSchema.safeParse({ email: emailRaw });

  if (!validated.success) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const cleanEmail = validated.data.email.toLowerCase().trim();

  // Rate limit: 3 requests per 15 minutes per email
  const rateLimit = await checkRateLimit({
    key: `forgot-pw:${cleanEmail}`,
    limit: 3,
    windowSeconds: 900,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many password reset requests. Please wait a few minutes before trying again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (user && user.status === "ACTIVE") {
    // Generate secure 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token hash to database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      userName: user.name,
    });
  }

  // Generic anti-enumeration response
  return {
    success: true,
    message: "If an account exists with that email, we have dispatched password reset instructions.",
  };
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validated = resetPasswordSchema.safeParse(raw);

  if (!validated.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { token, password } = validated.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetTokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !resetTokenRecord ||
    resetTokenRecord.usedAt !== null ||
    resetTokenRecord.expiresAt < new Date()
  ) {
    return {
      success: false,
      message: "This password reset link is invalid or has expired. Please request a new one.",
    };
  }

  const newHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    // 1. Update user password and increment tokenVersion to revoke all prior sessions
    await tx.user.update({
      where: { id: resetTokenRecord.userId },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    // 2. Mark reset token as used
    await tx.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: new Date() },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        actorId: resetTokenRecord.userId,
        actorEmail: resetTokenRecord.user.email,
        action: "PASSWORD_RESET_SUCCESS",
        entityType: "User",
        entityId: resetTokenRecord.userId,
      },
    });
  });

  return {
    success: true,
    message: "Password reset successful! You can now log in with your new password.",
  };
}
