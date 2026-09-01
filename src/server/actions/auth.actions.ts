"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { verifySession, isSuperAdminUser } from "@/server/dal/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth.schema";
import { generateReferralCode } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { APP_URL } from "@/lib/constants";
import { getClientDeviceMetadata, setDeviceCookie } from "@/lib/auth/device";
import {
  createAndSendLoginOtp,
  verifyLoginOtp,
  isEmailOtpEnabled,
  isStaffLoginOtpEnabled,
  isStudentLoginOtpEnabled,
  verifyPendingOtpToken,
} from "@/lib/otp/service";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { z } from "zod";
import type { ActionState } from "@/types";

export async function loginAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  await ensureDatabaseSchemaSync();

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

  // 1. Check if user is already blocked or suspended
  if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
    return {
      success: false,
      message:
        "Your account has been blocked for security because it was accessed from more than the allowed number of devices. Please contact the administrator.",
    };
  }

  if (user.status === "DEACTIVATED") {
    return {
      success: false,
      message: "Your account is deactivated. Please contact support.",
    };
  }

  // 2. Verify password hash
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    // Record failed login audit log
    await prisma.auditLog
      .create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "LOGIN_FAILED",
          entityType: "User",
          entityId: user.id,
          newValues: { reason: "INVALID_PASSWORD" },
        },
      })
      .catch(() => {});

    return { success: false, message: "Invalid email or password." };
  }

  // 2.5 Portal-Specific Server-Side Role Enforcement
  const portal = (formData.get("loginPortal")?.toString() || "STUDENT").toUpperCase();

  const normEmail = user.email.toLowerCase().trim();
  const isSuper =
    normEmail === "vinayaksahu3@gmail.com" ||
    normEmail === "admin@superwarrior30.com" ||
    user.adminRole === "SUPER_ADMIN" ||
    (user.role === "SUPER_ADMIN" && (!user.adminRole || user.adminRole === "SUPER_ADMIN"));

  const isSubAdminStaff =
    !isSuper &&
    (user.role === "ADMIN" ||
      user.role === "SUPPORT" ||
      (user.adminRole && user.adminRole !== "SUPER_ADMIN"));

  if (portal === "SUPER_ADMIN") {
    if (!isSuper) {
      await prisma.auditLog
        .create({
          data: {
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "UNAUTHORIZED_PORTAL_LOGIN_ATTEMPT",
            entityType: "User",
            entityId: user.id,
            newValues: { attemptedPortal: "SUPER_ADMIN", userRole: user.role },
          },
        })
        .catch(() => {});

      return {
        success: false,
        message: "Access denied. Only Super Admin accounts are authorized to sign in through this portal.",
      };
    }
  } else if (portal === "ADMIN") {
    // STRICT RULE: Super Admin is NOT allowed to login via /adminlogin
    if (isSuper) {
      return {
        success: false,
        message:
          "Super Admin accounts must sign in exclusively through the Super Admin portal: https://www.superwarrior30.com/superadminlogin",
      };
    }

    if (!isSubAdminStaff) {
      await prisma.auditLog
        .create({
          data: {
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "UNAUTHORIZED_PORTAL_LOGIN_ATTEMPT",
            entityType: "User",
            entityId: user.id,
            newValues: { attemptedPortal: "ADMIN", userRole: user.role },
          },
        })
        .catch(() => {});

      return {
        success: false,
        message: "Access denied. Only authorized staff and sub-administrators can sign in through this portal.",
      };
    }
  } else {
    // Normal User / Student Portal (/login)
    if (isSuper) {
      return {
        success: false,
        message:
          "Super Admin accounts must sign in using the dedicated Super Admin portal: https://www.superwarrior30.com/superadminlogin",
      };
    }
    if (isSubAdminStaff) {
      return {
        success: false,
        message:
          "Admin and staff accounts must sign in using the dedicated Admin portal: https://www.superwarrior30.com/adminlogin",
      };
    }
  }

  // 3. Device detection and verification
  const deviceMeta = await getClientDeviceMetadata();
  await setDeviceCookie(deviceMeta.deviceToken);

  const isStaffOrAdmin =
    isSuper ||
    isSubAdminStaff ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "SUPPORT";

  let activeDeviceId: string | undefined = undefined;

  // Execute device verification in an atomic database transaction
  const deviceCheckResult = await prisma.$transaction(async (tx) => {
    // Query all existing devices registered for this user
    const existingDevices = await tx.userDevice.findMany({
      where: { userId: user.id },
      orderBy: { firstSeenAt: "asc" },
    });

    // Smart Device Recognition:
    // 1. Direct cookie token match
    // 2. Hardware signature match (same browser + same OS + matching device or user-agent)
    const recognizedDevice = existingDevices.find(
      (d) =>
        d.deviceTokenHash === deviceMeta.deviceTokenHash ||
        (d.browser === deviceMeta.browser &&
          d.operatingSystem === deviceMeta.operatingSystem &&
          (d.deviceName === deviceMeta.deviceName || d.userAgent === deviceMeta.userAgent))
    );

    if (recognizedDevice) {
      // ----------------------------------------------------
      // CASE A: EXISTING RECOGNIZED DEVICE (Within limit)
      // ----------------------------------------------------
      // Enforce One Active Session: deactivate all other devices
      await tx.userDevice.updateMany({
        where: {
          userId: user.id,
          id: { not: recognizedDevice.id },
        },
        data: { isActive: false },
      });

      // Update current recognized device with latest token and session metadata
      const updated = await tx.userDevice.update({
        where: { id: recognizedDevice.id },
        data: {
          deviceTokenHash: deviceMeta.deviceTokenHash,
          isActive: true,
          revokedAt: null,
          revokedBy: null,
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
          lastIpAddress: deviceMeta.ipAddress,
          userAgent: deviceMeta.userAgent,
          deviceName: deviceMeta.deviceName,
          browser: deviceMeta.browser,
          operatingSystem: deviceMeta.operatingSystem,
        },
      });

      // Log successful login
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "LOGIN_SUCCESS",
          entityType: "UserDevice",
          entityId: updated.id,
          ipAddress: deviceMeta.ipAddress,
          userAgent: deviceMeta.userAgent,
          newValues: {
            deviceId: updated.id,
            deviceName: updated.deviceName,
            browser: updated.browser,
          },
        },
      });

      return { allowed: true, deviceId: updated.id };
    } else if (isStaffOrAdmin || existingDevices.length < 2) {
      // ----------------------------------------------------
      // CASE B: NEW DEVICE (Within limit OR Administrator / Staff)
      // ----------------------------------------------------
      // Enforce One Active Session: deactivate all previous devices
      await tx.userDevice.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      });

      // If staff has old devices, keep device table clean by removing oldest if > 3
      if (isStaffOrAdmin && existingDevices.length >= 3) {
        const oldestId = existingDevices[0].id;
        await tx.userDevice.delete({ where: { id: oldestId } }).catch(() => {});
      }

      // Create new device record
      const newDevice = await tx.userDevice.create({
        data: {
          userId: user.id,
          deviceTokenHash: deviceMeta.deviceTokenHash,
          deviceName: deviceMeta.deviceName,
          browser: deviceMeta.browser,
          operatingSystem: deviceMeta.operatingSystem,
          userAgent: deviceMeta.userAgent,
          lastIpAddress: deviceMeta.ipAddress,
          isActive: true,
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      // Log new device detection
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "NEW_DEVICE_DETECTED",
          entityType: "UserDevice",
          entityId: newDevice.id,
          ipAddress: deviceMeta.ipAddress,
          userAgent: deviceMeta.userAgent,
          newValues: {
            deviceNumber: existingDevices.length + 1,
            deviceName: newDevice.deviceName,
            browser: newDevice.browser,
            isStaffOrAdmin,
          },
        },
      });

      // Log successful login
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "LOGIN_SUCCESS",
          entityType: "UserDevice",
          entityId: newDevice.id,
          ipAddress: deviceMeta.ipAddress,
          userAgent: deviceMeta.userAgent,
          newValues: {
            deviceId: newDevice.id,
            deviceName: newDevice.deviceName,
            browser: newDevice.browser,
          },
        },
      });

      return { allowed: true, deviceId: newDevice.id };
    } else {
      // ----------------------------------------------------
      // CASE C: 3RD DISTINCT DEVICE DETECTED FOR STUDENT -> AUTO-BLOCK ACCOUNT!
      // ----------------------------------------------------
      // 1. Block account status & increment tokenVersion to revoke all active sessions immediately
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: "BLOCKED",
          tokenVersion: { increment: 1 },
        },
      });

      // 2. Revoke and deactivate all user devices
      await tx.userDevice.updateMany({
        where: { userId: user.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy: "SYSTEM_AUTO_BLOCK_3RD_DEVICE",
        },
      });

      // 3. Record high-priority security audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "ACCOUNT_AUTO_BLOCKED",
          entityType: "User",
          entityId: user.id,
          ipAddress: deviceMeta.ipAddress,
          userAgent: deviceMeta.userAgent,
          newValues: {
            reason: "EXCEEDED_2_DEVICE_LIMIT",
            attempted3rdDevice: {
              deviceName: deviceMeta.deviceName,
              browser: deviceMeta.browser,
              os: deviceMeta.operatingSystem,
            },
            registeredDevicesCount: existingDevices.length,
          },
        },
      });

      return {
        allowed: false,
        blocked: true,
        message:
          "Your account has been blocked for security because it was accessed from more than the allowed number of devices. Please contact the administrator.",
      };
    }
  });

  if (!deviceCheckResult.allowed) {
    return {
      success: false,
      message: deviceCheckResult.message || "Login rejected for security reasons.",
    };
  }

  activeDeviceId = deviceCheckResult.deviceId;

  // ----------------------------------------------------
  // STEP 4: EMAIL OTP AUTHENTICATION CHECK
  // ----------------------------------------------------
  // NOTE: Root Super Admin NEVER requires OTP (Instant Direct Access for Root Authority)
  const isSuper = isSuperAdminUser(user);
  let requiresOtp = false;

  if (!isSuper) {
    const isStaff = user.role === "ADMIN" || user.role === "SUPPORT" || Boolean(user.adminRole);
    if (isStaff) {
      requiresOtp = await isStaffLoginOtpEnabled();
    } else {
      requiresOtp = await isStudentLoginOtpEnabled();
    }
  }

  if (requiresOtp) {
    const otpDispatch = await createAndSendLoginOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      deviceId: activeDeviceId,
      ipAddress: deviceMeta.ipAddress,
      userAgent: deviceMeta.userAgent,
    });

    if (!otpDispatch.success) {
      return {
        success: false,
        message:
          otpDispatch.message ||
          "We could not send the verification code. Please try again later.",
      };
    }

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${otpDispatch.emailMasked}.`,
      data: {
        requiresOtp: true,
        pendingToken: otpDispatch.pendingToken,
        emailMasked: otpDispatch.emailMasked,
        cooldownSeconds: otpDispatch.cooldownSeconds,
      },
    };
  }

  // Increment tokenVersion on every login to immediately invalidate ALL previous JWT sessions.
  // This enforces the "1 active device at a time" rule at the JWT level — any other device's
  // old JWT will have a stale tokenVersion and will be rejected by getCurrentUser().
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });

  // Create active JWT session with the NEW tokenVersion
  await createSession(
    user.id,
    user.email,
    user.role,
    updatedUser.tokenVersion,
    activeDeviceId
  );

  const destination = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
  redirect(destination);
}

export async function verifyLoginOtpAction(
  pendingToken: string,
  otp: string
): Promise<ActionState<{ destination?: string; remainingAttempts?: number }>> {
  await ensureDatabaseSchemaSync();

  const deviceMeta = await getClientDeviceMetadata();
  const verifyResult = await verifyLoginOtp({
    pendingToken,
    otp,
    ipAddress: deviceMeta.ipAddress,
  });

  if (!verifyResult.success || !verifyResult.email) {
    // Record audit log for failed OTP attempt if email is present
    if (verifyResult.email) {
      await prisma.auditLog
        .create({
          data: {
            actorEmail: verifyResult.email,
            actorId: verifyResult.userId,
            action: "LOGIN_OTP_FAILED",
            entityType: "User",
            entityId: verifyResult.userId || verifyResult.email,
            ipAddress: deviceMeta.ipAddress,
            userAgent: deviceMeta.userAgent,
            newValues: {
              reason: verifyResult.message,
              remainingAttempts: verifyResult.remainingAttempts,
            },
          },
        })
        .catch(() => {});
    }

    return {
      success: false,
      message: verifyResult.message || "Invalid verification code.",
      data: {
        remainingAttempts: verifyResult.remainingAttempts,
      },
    };
  }

  // Fetch verified user
  const user = await prisma.user.findUnique({
    where: { email: verifyResult.email },
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active. Please contact support.",
    };
  }

  // Increment tokenVersion on successful OTP login
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });

  // Create active JWT session
  await createSession(
    user.id,
    user.email,
    user.role,
    updatedUser.tokenVersion,
    verifyResult.deviceId
  );

  // Record successful login audit log
  await prisma.auditLog
    .create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "LOGIN_OTP_SUCCESS",
        entityType: "User",
        entityId: user.id,
        ipAddress: deviceMeta.ipAddress,
        userAgent: deviceMeta.userAgent,
        newValues: {
          deviceId: verifyResult.deviceId,
        },
      },
    })
    .catch(() => {});

  const destination =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";

  return {
    success: true,
    message: "Login successful!",
    data: { destination },
  };
}

export async function resendLoginOtpAction(
  pendingToken: string
): Promise<ActionState<{ cooldownSeconds?: number }>> {
  await ensureDatabaseSchemaSync();

  const payload = await verifyPendingOtpToken(pendingToken);
  if (!payload || !payload.email) {
    return {
      success: false,
      message: "Your verification session has expired. Please sign in again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true, name: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      success: false,
      message: "User account is not active.",
    };
  }

  const deviceMeta = await getClientDeviceMetadata();
  const dispatch = await createAndSendLoginOtp({
    userId: user.id,
    email: user.email,
    name: user.name,
    deviceId: payload.deviceId,
    ipAddress: deviceMeta.ipAddress,
    userAgent: deviceMeta.userAgent,
  });

  if (!dispatch.success) {
    return {
      success: false,
      message: dispatch.message || "Failed to resend verification code.",
      data: { cooldownSeconds: dispatch.cooldownSeconds },
    };
  }

  return {
    success: true,
    message: `A new 6-digit verification code has been sent to ${dispatch.emailMasked}.`,
    data: { cooldownSeconds: dispatch.cooldownSeconds },
  };
}

export async function registerAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  await ensureDatabaseSchemaSync();

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

  const deviceMeta = await getClientDeviceMetadata();
  await setDeviceCookie(deviceMeta.deviceToken);

  let initialDeviceId: string | undefined = undefined;

  // Create user, wallet, referral relationships, and initial Device #1 in a transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: cleanEmail,
        name,
        passwordHash,
        referralCode: newReferralCode,
        tokenVersion: 1,
        status: "ACTIVE",
      },
    });

    // Register Device #1 for new user
    const device1 = await tx.userDevice.create({
      data: {
        userId: user.id,
        deviceTokenHash: deviceMeta.deviceTokenHash,
        deviceName: deviceMeta.deviceName,
        browser: deviceMeta.browser,
        operatingSystem: deviceMeta.operatingSystem,
        userAgent: deviceMeta.userAgent,
        lastIpAddress: deviceMeta.ipAddress,
        isActive: true,
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    initialDeviceId = device1.id;

    // Create wallet for the user
    await tx.wallet.create({
      data: { userId: user.id },
    });

    // Handle referral relationship
    if (referrer) {
      if (referrer.id === user.id) {
        throw new Error("Self-referral is not allowed.");
      }

      await tx.referralRelationship.create({
        data: {
          referrerId: referrer.id,
          referredId: user.id,
        },
      });

      await tx.referralClosure.create({
        data: {
          ancestorId: referrer.id,
          descendantId: user.id,
          depth: 1,
        },
      });

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
    await createSession(user.id, user.email, user.role, user.tokenVersion, initialDeviceId);
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const session = await verifySession();
  const role = session?.role;
  const isSuper =
    role === "SUPER_ADMIN" ||
    session?.email === "vinayaksahu3@gmail.com" ||
    session?.email === "admin@superwarrior30.com";
  const isAdmin = role === "ADMIN" || role === "SUPPORT";

  if (session?.deviceId) {
    // Mark device as inactive on logout
    await prisma.userDevice
      .update({
        where: { id: session.deviceId },
        data: { isActive: false },
      })
      .catch(() => {});
  }

  await deleteSession();

  if (isSuper) {
    redirect("/superadminlogin");
  } else if (isAdmin) {
    redirect("/adminlogin");
  } else {
    redirect("/login");
  }
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
