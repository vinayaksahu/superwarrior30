import "server-only";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { sendLoginOtpEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const OTP_SECRET = process.env.JWT_SECRET_KEY || "trade_warrior_otp_salt_default_key_64_characters_min_length";
const encodedOtpSecret = new TextEncoder().encode(OTP_SECRET);

export interface PendingOtpPayload {
  userId?: string;
  email: string;
  purpose: "LOGIN_VERIFICATION" | "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  deviceId?: string;
  requiresOtp: true;
}

export function generateSecureOtp(): string {
  // Cryptographically secure 6-digit numeric OTP (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string, email: string): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${otp.trim()}:${email.toLowerCase().trim()}`)
    .digest("hex");
}

export async function createPendingOtpToken(payload: PendingOtpPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email.toLowerCase().trim(),
    purpose: payload.purpose,
    deviceId: payload.deviceId,
    requiresOtp: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(encodedOtpSecret);
}

export async function verifyPendingOtpToken(token: string): Promise<PendingOtpPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedOtpSecret, {
      algorithms: ["HS256"],
    });
    if (!payload.email || !payload.purpose || !payload.requiresOtp) {
      return null;
    }
    return {
      userId: payload.userId as string | undefined,
      email: payload.email as string,
      purpose: payload.purpose as "LOGIN_VERIFICATION" | "EMAIL_VERIFICATION" | "PASSWORD_RESET",
      deviceId: payload.deviceId as string | undefined,
      requiresOtp: true,
    };
  } catch {
    return null;
  }
}

/**
 * Mask email for user-facing security display (e.g. j***e@example.com)
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name.charAt(0)}***@${domain}`;
  }
  return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
}

/**
 * Check if global email OTP authentication is enabled via SiteSetting
 */
export async function isEmailOtpEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "auth_email_otp_enabled" },
    });
    if (!setting) return true; // Enabled by default in production
    return setting.value === "true" || setting.value === "1";
  } catch {
    return true;
  }
}

/**
 * Get OTP security configurations
 */
export async function getOtpSecurityConfig(): Promise<{
  isEnabled: boolean;
  expirationMinutes: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  maxResendsPerWindow: number;
}> {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "auth_email_otp_enabled",
            "auth_otp_expiration_minutes",
            "auth_otp_resend_cooldown_seconds",
            "auth_otp_max_attempts",
            "auth_otp_max_resends_per_window",
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      isEnabled: map.get("auth_email_otp_enabled") !== "false",
      expirationMinutes: Math.max(1, parseInt(map.get("auth_otp_expiration_minutes") || "5", 10)),
      resendCooldownSeconds: Math.max(15, parseInt(map.get("auth_otp_resend_cooldown_seconds") || "60", 10)),
      maxAttempts: Math.max(1, parseInt(map.get("auth_otp_max_attempts") || "5", 10)),
      maxResendsPerWindow: Math.max(1, parseInt(map.get("auth_otp_max_resends_per_window") || "5", 10)),
    };
  } catch {
    return {
      isEnabled: true,
      expirationMinutes: 5,
      resendCooldownSeconds: 60,
      maxAttempts: 5,
      maxResendsPerWindow: 5,
    };
  }
}

/**
 * Generate, persist, and dispatch a login verification OTP
 */
export async function createAndSendLoginOtp({
  userId,
  email,
  name,
  deviceId,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  email: string;
  name?: string | null;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  message?: string;
  pendingToken?: string;
  emailMasked?: string;
  cooldownSeconds?: number;
  expiresAt?: Date;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const config = await getOtpSecurityConfig();

  // 1. Check 60-second resend cooldown
  const latestOtp = await prisma.emailOtp.findFirst({
    where: {
      email: cleanEmail,
      purpose: "LOGIN_VERIFICATION",
    },
    orderBy: { createdAt: "desc" },
  });

  if (latestOtp) {
    const elapsedSeconds = Math.floor((Date.now() - latestOtp.createdAt.getTime()) / 1000);
    if (elapsedSeconds < config.resendCooldownSeconds) {
      const remainingCooldown = config.resendCooldownSeconds - elapsedSeconds;
      console.warn(`[OTP RATE LIMITED] Resend cooldown active for ${maskEmail(cleanEmail)}: ${remainingCooldown}s remaining`);
      return {
        success: false,
        message: `Please wait ${remainingCooldown} seconds before requesting a new code.`,
        cooldownSeconds: remainingCooldown,
      };
    }
  }

  // 2. Check maximum 5 OTPs per 15-minute window per email
  const windowLimit = await checkRateLimit({
    key: `otp_resends:${cleanEmail}`,
    limit: config.maxResendsPerWindow,
    windowSeconds: 15 * 60,
  });

  if (!windowLimit.success) {
    console.warn(`[OTP RATE LIMITED] Max OTP requests reached for ${maskEmail(cleanEmail)} in 15m window`);
    return {
      success: false,
      message: "Too many verification code requests. Please wait 15 minutes before requesting again.",
    };
  }

  // 3. Invalidate previous active OTPs for this email & purpose
  await prisma.emailOtp.updateMany({
    where: {
      email: cleanEmail,
      purpose: "LOGIN_VERIFICATION",
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  // 4. Generate new secure OTP and expiration
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(rawOtp, cleanEmail);
  const expiresAt = new Date(Date.now() + config.expirationMinutes * 60 * 1000);

  // 5. Store OTP hash in database
  await prisma.emailOtp.create({
    data: {
      userId,
      email: cleanEmail,
      purpose: "LOGIN_VERIFICATION",
      otpHash,
      expiresAt,
      maxAttempts: config.maxAttempts,
      ipAddress,
      userAgent,
    },
  });

  console.info(`[OTP GENERATED] Dispatched verification code to ${maskEmail(cleanEmail)} (expires in ${config.expirationMinutes}m)`);

  // 6. Send OTP email via Namecheap SMTP
  const emailResult = await sendLoginOtpEmail({
    to: cleanEmail,
    name,
    otp: rawOtp,
    expirationMinutes: config.expirationMinutes,
  });

  if (!emailResult.success) {
    console.error(`[SMTP ERROR] Could not dispatch OTP email to ${maskEmail(cleanEmail)}: ${emailResult.error}`);
    return {
      success: false,
      message: "We could not send the verification code. Please try again later.",
    };
  }

  // 7. Create signed pending token for secure 2-step verification
  const pendingToken = await createPendingOtpToken({
    userId,
    email: cleanEmail,
    purpose: "LOGIN_VERIFICATION",
    deviceId,
    requiresOtp: true,
  });

  return {
    success: true,
    pendingToken,
    emailMasked: maskEmail(cleanEmail),
    cooldownSeconds: config.resendCooldownSeconds,
    expiresAt,
  };
}

/**
 * Verify submitted OTP against database hash
 */
export async function verifyLoginOtp({
  pendingToken,
  otp,
  ipAddress,
}: {
  pendingToken: string;
  otp: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  message?: string;
  userId?: string;
  email?: string;
  deviceId?: string;
  remainingAttempts?: number;
}> {
  const payload = await verifyPendingOtpToken(pendingToken);
  if (!payload || !payload.email) {
    return {
      success: false,
      message: "Your verification session has expired. Please sign in again.",
    };
  }

  const cleanEmail = payload.email.toLowerCase().trim();
  const cleanOtp = otp.trim().replace(/\D/g, "");

  if (cleanOtp.length !== 6) {
    return {
      success: false,
      message: "Please enter a valid 6-digit verification code.",
    };
  }

  // IP rate limit on verification attempts: 10 attempts per minute
  if (ipAddress) {
    const ipLimit = await checkRateLimit({
      key: `otp_verify_ip:${ipAddress}`,
      limit: 10,
      windowSeconds: 60,
    });
    if (!ipLimit.success) {
      return {
        success: false,
        message: "Too many attempts from this network. Please wait a minute before trying again.",
      };
    }
  }

  // Find the active OTP record
  const activeOtp = await prisma.emailOtp.findFirst({
    where: {
      email: cleanEmail,
      purpose: "LOGIN_VERIFICATION",
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeOtp) {
    console.warn(`[OTP VERIFICATION FAILED] No active OTP found for ${maskEmail(cleanEmail)}`);
    return {
      success: false,
      message: "No active verification code found or it has already been used. Please request a new code.",
    };
  }

  // Check expiration
  if (activeOtp.expiresAt.getTime() < Date.now()) {
    console.warn(`[OTP EXPIRED] Verification code expired for ${maskEmail(cleanEmail)}`);
    return {
      success: false,
      message: "Verification code has expired. Please request a new code.",
    };
  }

  // Check maximum attempts
  if (activeOtp.attempts >= activeOtp.maxAttempts) {
    console.warn(`[OTP EXCEEDED ATTEMPTS] Max attempts exceeded for ${maskEmail(cleanEmail)}`);
    return {
      success: false,
      message: "Too many failed attempts. This code has been locked. Please request a new code.",
    };
  }

  // Calculate expected hash
  const submittedHash = hashOtp(cleanOtp, cleanEmail);

  // Timing-safe comparison of SHA-256 hashes
  const isMatch =
    submittedHash.length === activeOtp.otpHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(submittedHash, "utf-8"),
      Buffer.from(activeOtp.otpHash, "utf-8")
    );

  if (!isMatch) {
    // Increment failed attempt counter
    const updated = await prisma.emailOtp.update({
      where: { id: activeOtp.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = Math.max(0, updated.maxAttempts - updated.attempts);
    console.warn(`[OTP VERIFICATION FAILED] Incorrect code for ${maskEmail(cleanEmail)}. ${remaining} attempts remaining.`);

    if (remaining === 0) {
      return {
        success: false,
        message: "Incorrect code. Maximum attempts reached. Please request a new code.",
        remainingAttempts: 0,
      };
    }

    return {
      success: false,
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      remainingAttempts: remaining,
    };
  }

  // OTP is valid! Invalidate immediately (single-use)
  await prisma.emailOtp.update({
    where: { id: activeOtp.id },
    data: { usedAt: new Date() },
  });

  console.info(`[OTP VERIFICATION SUCCESS] Verified login for ${maskEmail(cleanEmail)}`);

  return {
    success: true,
    userId: payload.userId || activeOtp.userId || undefined,
    email: cleanEmail,
    deviceId: payload.deviceId,
  };
}
