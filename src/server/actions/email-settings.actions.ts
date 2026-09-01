"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/server/dal/auth";
import { verifySmtpConnection, sendTestEmail, SMTP_CONFIG } from "@/lib/email";
import { getOtpSecurityConfig } from "@/lib/otp/service";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { z } from "zod";
import type { ActionState } from "@/types";

const emailSettingsSchema = z.object({
  isEmailOtpEnabled: z.coerce.boolean().default(false),
  isStaffOtpEnabled: z.coerce.boolean().default(false),
  isStudentOtpEnabled: z.coerce.boolean().default(false),
  isRegistrationOtpEnabled: z.coerce.boolean().default(false),
  isPasswordResetOtpEnabled: z.coerce.boolean().default(true),
  expirationMinutes: z.coerce.number().int().min(1).max(60).default(5),
  resendCooldownSeconds: z.coerce.number().int().min(15).max(300).default(60),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(5),
  maxResendsPerWindow: z.coerce.number().int().min(1).max(20).default(5),
});

export interface EmailSettingsData {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
    fromEmail: string;
    hasPassword: boolean;
    connection: {
      connected: boolean;
      error?: string;
    };
  };
  otp: {
    isEnabled: boolean;
    isStaffOtpEnabled: boolean;
    isStudentOtpEnabled: boolean;
    isRegistrationOtpEnabled: boolean;
    isPasswordResetOtpEnabled: boolean;
    expirationMinutes: number;
    resendCooldownSeconds: number;
    maxAttempts: number;
    maxResendsPerWindow: number;
  };
}

/**
 * Fetch current SMTP configuration & OTP security parameters (Super Admin only)
 */
export async function getEmailSettingsAction(): Promise<EmailSettingsData> {
  await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const [connection, otpConfig] = await Promise.all([
    verifySmtpConnection(),
    getOtpSecurityConfig(),
  ]);

  return {
    smtp: {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      user: SMTP_CONFIG.user,
      fromName: SMTP_CONFIG.fromName,
      fromEmail: SMTP_CONFIG.fromEmail,
      hasPassword: connection.hasPassword,
      connection: {
        connected: connection.connected,
        error: connection.error,
      },
    },
    otp: {
      isEnabled: otpConfig.isEnabled,
      isStaffOtpEnabled: otpConfig.isStaffOtpEnabled,
      isStudentOtpEnabled: otpConfig.isStudentOtpEnabled,
      isRegistrationOtpEnabled: otpConfig.isRegistrationOtpEnabled,
      isPasswordResetOtpEnabled: otpConfig.isPasswordResetOtpEnabled,
      expirationMinutes: otpConfig.expirationMinutes,
      resendCooldownSeconds: otpConfig.resendCooldownSeconds,
      maxAttempts: otpConfig.maxAttempts,
      maxResendsPerWindow: otpConfig.maxResendsPerWindow,
    },
  };
}

/**
 * Save OTP & Email Security Settings (Super Admin only)
 */
export async function saveEmailSettingsAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const raw = {
    isEmailOtpEnabled: formData.get("isEmailOtpEnabled") === "on" || formData.get("isEmailOtpEnabled") === "true",
    isStaffOtpEnabled: formData.get("isStaffOtpEnabled") === "on" || formData.get("isStaffOtpEnabled") === "true",
    isStudentOtpEnabled: formData.get("isStudentOtpEnabled") === "on" || formData.get("isStudentOtpEnabled") === "true",
    isRegistrationOtpEnabled: formData.get("isRegistrationOtpEnabled") === "on" || formData.get("isRegistrationOtpEnabled") === "true",
    isPasswordResetOtpEnabled: formData.get("isPasswordResetOtpEnabled") === "on" || formData.get("isPasswordResetOtpEnabled") === "true",
    expirationMinutes: formData.get("expirationMinutes"),
    resendCooldownSeconds: formData.get("resendCooldownSeconds"),
    maxAttempts: formData.get("maxAttempts"),
    maxResendsPerWindow: formData.get("maxResendsPerWindow"),
  };

  const validated = emailSettingsSchema.safeParse(raw);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid configuration settings.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const {
    isEmailOtpEnabled,
    isStaffOtpEnabled,
    isStudentOtpEnabled,
    isRegistrationOtpEnabled,
    isPasswordResetOtpEnabled,
    expirationMinutes,
    resendCooldownSeconds,
    maxAttempts,
    maxResendsPerWindow,
  } = validated.data;

  const settingsToUpsert = [
    { key: "auth_email_otp_enabled", value: String(isEmailOtpEnabled), type: "boolean" },
    { key: "auth_otp_staff_login_enabled", value: String(isStaffOtpEnabled), type: "boolean" },
    { key: "auth_otp_student_login_enabled", value: String(isStudentOtpEnabled), type: "boolean" },
    { key: "auth_otp_registration_enabled", value: String(isRegistrationOtpEnabled), type: "boolean" },
    { key: "auth_otp_password_reset_enabled", value: String(isPasswordResetOtpEnabled), type: "boolean" },
    { key: "auth_otp_expiration_minutes", value: String(expirationMinutes), type: "number" },
    { key: "auth_otp_resend_cooldown_seconds", value: String(resendCooldownSeconds), type: "number" },
    { key: "auth_otp_max_attempts", value: String(maxAttempts), type: "number" },
    { key: "auth_otp_max_resends_per_window", value: String(maxResendsPerWindow), type: "number" },
  ];

  await prisma.$transaction(async (tx) => {
    for (const item of settingsToUpsert) {
      await tx.siteSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          type: item.type,
        },
        update: {
          value: item.value,
          type: item.type,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "EMAIL_SECURITY_SETTINGS_UPDATED",
        entityType: "SiteSetting",
        entityId: "auth_email_otp_config",
        newValues: validated.data,
      },
    });
  });

  return {
    success: true,
    message: "Email & OTP security settings saved successfully.",
  };
}

/**
 * Send a test email to verify live Namecheap SMTP delivery (Super Admin only)
 */
export async function sendTestEmailAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const toEmail = formData.get("toEmail")?.toString().trim();
  if (!toEmail || !toEmail.includes("@")) {
    return {
      success: false,
      message: "Please enter a valid recipient email address.",
    };
  }

  const result = await sendTestEmail({ to: toEmail });

  if (!result.success) {
    return {
      success: false,
      message: result.error || "Failed to send test email. Please check your SMTP settings and password.",
    };
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "SMTP_TEST_EMAIL_SENT",
      entityType: "EmailService",
      entityId: toEmail,
      newValues: {
        recipient: toEmail,
        smtpHost: SMTP_CONFIG.host,
      },
    },
  });

  return {
    success: true,
    message: `Test email sent successfully to ${toEmail}! Check your inbox.`,
  };
}
