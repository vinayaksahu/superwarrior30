"use server";

import { requireAuth } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  generateTotpSecret,
  generateTotpUri,
  generateRecoveryCodes,
  verifyTotpToken,
  verifyAndConsumeRecoveryCode,
  saveUserMfaConfig,
  getUserMfaConfig,
  disableUserMfaConfig,
} from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/types";

/**
 * Initializes MFA setup for the authenticated user.
 * Returns the generated secret, otpauth URI, and emergency recovery codes.
 */
export async function initializeMfaSetupAction(): Promise<
  ActionState<{ secret: string; uri: string; recoveryCodes: string[] }>
> {
  const user = await requireAuth();

  const existingConfig = await getUserMfaConfig(user.id);
  if (existingConfig && existingConfig.enabled) {
    return {
      success: false,
      message: "Two-Factor Authentication is already enabled for this account.",
    };
  }

  const secret = generateTotpSecret();
  const uri = generateTotpUri({
    secret,
    accountEmail: user.email,
  });
  const { rawCodes } = generateRecoveryCodes();

  return {
    success: true,
    message: "Scan the QR code with Google Authenticator or your authenticator app.",
    data: {
      secret,
      uri,
      recoveryCodes: rawCodes,
    },
  };
}

/**
 * Verifies the first TOTP token to activate MFA and securely persist credentials.
 */
export async function confirmMfaEnrollmentAction(
  secret: string,
  token: string,
  rawRecoveryCodes: string[]
): Promise<ActionState> {
  const user = await requireAuth();

  const rateLimit = await checkRateLimit({
    key: `mfa_confirm:${user.id}`,
    limit: 5,
    windowSeconds: 300,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many verification attempts. Please wait 5 minutes.",
    };
  }

  const isValid = verifyTotpToken(secret, token);
  if (!isValid) {
    return {
      success: false,
      message: "Invalid authenticator code. Please ensure your clock is synced and try again.",
    };
  }

  const crypto = await import("crypto");
  const hashedRecoveryCodes = rawRecoveryCodes.map((code) =>
    crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex")
  );

  await saveUserMfaConfig(user.id, secret, hashedRecoveryCodes);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "MFA_ENABLED",
      entityType: "User",
      entityId: user.id,
    },
  }).catch(() => {});

  return {
    success: true,
    message: "Two-Factor Authentication has been successfully enabled for your account.",
  };
}

/**
 * Verifies a TOTP token or recovery code during authentication or sensitive actions.
 */
export async function verifyUserMfaChallengeAction(
  userId: string,
  code: string
): Promise<ActionState> {
  const rateLimit = await checkRateLimit({
    key: `mfa_verify:${userId}`,
    limit: 5,
    windowSeconds: 300,
  });

  if (!rateLimit.success) {
    return {
      success: false,
      message: "Too many verification attempts. Please wait 5 minutes.",
    };
  }

  const config = await getUserMfaConfig(userId);
  if (!config || !config.enabled || !config.secret) {
    return {
      success: true,
      message: "MFA is not enabled for this user.",
    };
  }

  // 1. Try TOTP code
  if (/^\d{6}$/.test(code.trim())) {
    const isValidTotp = verifyTotpToken(config.secret, code);
    if (isValidTotp) {
      return { success: true, message: "MFA code verified successfully." };
    }
  }

  // 2. Try single-use recovery code
  const { valid, remainingHashedCodes } = verifyAndConsumeRecoveryCode(code, config.recoveryCodes);
  if (valid) {
    await saveUserMfaConfig(userId, config.secret, remainingHashedCodes);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "MFA_RECOVERY_CODE_USED",
          entityType: "User",
          entityId: user.id,
          newValues: { remainingCodes: remainingHashedCodes.length },
        },
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Recovery code accepted. ${remainingHashedCodes.length} recovery codes remaining.`,
    };
  }

  return {
    success: false,
    message: "Invalid verification code or recovery code.",
  };
}

/**
 * Disables MFA for the authenticated user, requiring current password confirmation.
 */
export async function disableMfaAction(password: string): Promise<ActionState> {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return { success: false, message: "User not found." };
  }

  const isPasswordValid = await verifyPassword(password, dbUser.passwordHash);
  if (!isPasswordValid) {
    return { success: false, message: "Incorrect password. Cannot disable Two-Factor Authentication." };
  }

  await disableUserMfaConfig(user.id);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "MFA_DISABLED",
      entityType: "User",
      entityId: user.id,
    },
  }).catch(() => {});

  return {
    success: true,
    message: "Two-Factor Authentication has been disabled.",
  };
}

/**
 * Gets MFA status for current authenticated user.
 */
export async function getMfaStatusAction(): Promise<{ enabled: boolean; remainingRecoveryCodes: number }> {
  const user = await requireAuth();
  const config = await getUserMfaConfig(user.id);
  if (!config || !config.enabled) {
    return { enabled: false, remainingRecoveryCodes: 0 };
  }
  return {
    enabled: true,
    remainingRecoveryCodes: config.recoveryCodes.length,
  };
}
