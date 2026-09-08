import crypto from "crypto";
import { encryptSecret, decryptSecret } from "@/lib/crypto/encryption";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generates a cryptographically secure 20-byte (160-bit) Base32 secret for RFC 6238 TOTP.
 */
export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20); // 160 bits
  let bits = 0;
  let value = 0;
  let secret = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      secret += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    secret += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return secret;
}

/**
 * Decodes a Base32 string into a Buffer.
 */
function decodeBase32(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Computes an RFC 6238 TOTP token for a given counter and secret.
 */
function computeTotpForCounter(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const token = (code % 1000000).toString().padStart(6, "0");
  return token;
}

/**
 * Verifies a 6-digit TOTP code with a ±1 step (±30s) tolerance window for clock skew.
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  if (!token || !/^\d{6}$/.test(token.trim())) return false;
  const cleanToken = token.trim();
  const step = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / step);

  // Check window: -1 step, current step, +1 step
  for (let offset = -1; offset <= 1; offset++) {
    const generated = computeTotpForCounter(secret, currentCounter + offset);
    if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(cleanToken))) {
      return true;
    }
  }
  return false;
}

/**
 * Generates standard otpauth URI for Google Authenticator / Microsoft Authenticator / 1Password.
 */
export function generateTotpUri({
  secret,
  accountEmail,
  issuer = "SuperWarrior30",
}: {
  secret: string;
  accountEmail: string;
  issuer?: string;
}): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Generates 8 cryptographically secure single-use alphanumeric recovery codes.
 * Returns { rawCodes: string[], hashedCodes: string[] }
 */
export function generateRecoveryCodes(): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars (e.g. "A9F23B812C")
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`; // "A9F23-B812C"
    const hash = crypto.createHash("sha256").update(formatted).digest("hex");
    rawCodes.push(formatted);
    hashedCodes.push(hash);
  }

  return { rawCodes, hashedCodes };
}

/**
 * Verifies a single-use recovery code against a list of hashed recovery codes.
 * If match found, returns the remaining valid hashed codes list.
 */
export function verifyAndConsumeRecoveryCode(
  providedCode: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  const clean = providedCode.trim().toUpperCase();
  const hash = crypto.createHash("sha256").update(clean).digest("hex");

  const index = hashedCodes.findIndex((h) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
    } catch {
      return false;
    }
  });

  if (index === -1) {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(index, 1);
  return { valid: true, remainingHashedCodes: remaining };
}

/**
 * Persists an encrypted TOTP enrollment record for a user in site_settings.
 */
export async function saveUserMfaConfig(
  userId: string,
  secret: string,
  hashedRecoveryCodes: string[]
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const encryptedSecret = encryptSecret(secret);
  const payload = JSON.stringify({
    enabled: true,
    secret: encryptedSecret,
    recoveryCodes: hashedRecoveryCodes,
    enrolledAt: new Date().toISOString(),
  });

  await prisma.siteSetting.upsert({
    where: { key: `mfa_user_${userId}` },
    update: { value: payload, type: "json" },
    create: { key: `mfa_user_${userId}`, value: payload, type: "json" },
  });
}

/**
 * Retrieves the MFA configuration for a user.
 */
export async function getUserMfaConfig(userId: string): Promise<{
  enabled: boolean;
  secret: string | null;
  recoveryCodes: string[];
} | null> {
  const { prisma } = await import("@/lib/prisma");
  const record = await prisma.siteSetting.findUnique({
    where: { key: `mfa_user_${userId}` },
  });

  if (!record || !record.value) return null;

  try {
    const data = JSON.parse(record.value);
    if (!data.enabled) return null;
    const decryptedSecret = decryptSecret(data.secret);
    return {
      enabled: Boolean(data.enabled),
      secret: decryptedSecret,
      recoveryCodes: Array.isArray(data.recoveryCodes) ? data.recoveryCodes : [],
    };
  } catch {
    return null;
  }
}

/**
 * Disables MFA for a user by removing the configuration.
 */
export async function disableUserMfaConfig(userId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.siteSetting.delete({
    where: { key: `mfa_user_${userId}` },
  }).catch(() => {});
}

function getMfaSigningKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL SECURITY CONFIGURATION] JWT_SECRET_KEY is missing in production. MFA subsystem failed closed."
      );
    }
    return new TextEncoder().encode("trade_warrior_otp_salt_default_key_64_characters_min_length");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "[FATAL SECURITY CONFIGURATION] JWT_SECRET_KEY must be at least 32 characters long."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a cryptographically signed, short-lived, single-use MFA challenge for login.
 * Enforces 5-minute expiry and tracking in database to prevent replays.
 */
export async function createMfaLoginChallenge(
  userId: string,
  email: string,
  deviceId?: string
): Promise<string> {
  const { SignJWT } = await import("jose");
  const { prisma } = await import("@/lib/prisma");
  const challengeId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  const challengeRecord = {
    challengeId,
    userId,
    email: email.toLowerCase().trim(),
    deviceId: deviceId || null,
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    used: false,
    createdAt: now,
  };

  await prisma.siteSetting.upsert({
    where: { key: `mfa_chal_${challengeId}` },
    update: { value: JSON.stringify(challengeRecord), type: "json" },
    create: { key: `mfa_chal_${challengeId}`, value: JSON.stringify(challengeRecord), type: "json" },
  });

  return new SignJWT({
    challengeId,
    userId,
    email: email.toLowerCase().trim(),
    deviceId,
    purpose: "MFA_LOGIN_CHALLENGE",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getMfaSigningKey());
}

export interface VerifyMfaChallengeResult {
  success: boolean;
  message: string;
  userId?: string;
  email?: string;
  deviceId?: string;
  remainingAttempts?: number;
}

/**
 * Validates an MFA login challenge token against the user's TOTP secret or emergency recovery codes.
 * Strictly single-use, rate-limited, and brute-force resistant.
 */
export async function verifyMfaLoginChallenge(
  challengeToken: string,
  rawCode: string
): Promise<VerifyMfaChallengeResult> {
  const { jwtVerify } = await import("jose");
  const { prisma } = await import("@/lib/prisma");

  let payload: any;
  try {
    const verified = await jwtVerify(challengeToken, getMfaSigningKey(), {
      algorithms: ["HS256"],
    });
    payload = verified.payload;
  } catch {
    return {
      success: false,
      message: "Two-factor challenge session has expired or is invalid. Please sign in again.",
    };
  }

  if (
    !payload ||
    payload.purpose !== "MFA_LOGIN_CHALLENGE" ||
    !payload.challengeId ||
    !payload.userId
  ) {
    return {
      success: false,
      message: "Malformed MFA challenge token.",
    };
  }

  const { challengeId, userId, email, deviceId } = payload;
  const challengeKey = `mfa_chal_${challengeId}`;

  const record = await prisma.siteSetting.findUnique({
    where: { key: challengeKey },
  });

  if (!record || !record.value) {
    return {
      success: false,
      message: "This MFA verification session has expired or was already consumed. Please sign in again.",
    };
  }

  let challengeData: {
    challengeId: string;
    userId: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: number;
    used: boolean;
  };

  try {
    challengeData = JSON.parse(record.value);
  } catch {
    return {
      success: false,
      message: "Internal error parsing challenge record.",
    };
  }

  // 1. Single-use check
  if (challengeData.used) {
    return {
      success: false,
      message: "This MFA verification code challenge has already been used. Replay rejected.",
    };
  }

  // 2. Expiration check
  if (Date.now() > challengeData.expiresAt) {
    await prisma.siteSetting.delete({ where: { key: challengeKey } }).catch(() => {});
    return {
      success: false,
      message: "Two-factor verification challenge has expired. Please sign in again.",
    };
  }

  // 3. Brute-force attempt limit check
  if (challengeData.attempts >= challengeData.maxAttempts) {
    await prisma.siteSetting.delete({ where: { key: challengeKey } }).catch(() => {});
    return {
      success: false,
      message: "Too many failed attempts. This challenge has been locked for security. Please sign in again.",
      remainingAttempts: 0,
    };
  }

  // 4. Retrieve user's configured MFA credentials
  const mfaConfig = await getUserMfaConfig(userId);
  if (!mfaConfig || !mfaConfig.enabled || !mfaConfig.secret) {
    return {
      success: false,
      message: "MFA is not enabled for this account.",
    };
  }

  const cleanCode = (rawCode || "").trim();

  // Try 6-digit TOTP
  if (/^\d{6}$/.test(cleanCode)) {
    const isTotpValid = verifyTotpToken(mfaConfig.secret, cleanCode);
    if (isTotpValid) {
      // Mark challenge as consumed (single-use)
      await prisma.siteSetting.update({
        where: { key: challengeKey },
        data: {
          value: JSON.stringify({ ...challengeData, used: true, consumedAt: Date.now() }),
        },
      });

      return {
        success: true,
        message: "Two-factor authentication successful.",
        userId,
        email,
        deviceId,
      };
    }
  }

  // Try Emergency Recovery Code
  if (cleanCode.length >= 8) {
    const { valid, remainingHashedCodes } = verifyAndConsumeRecoveryCode(
      cleanCode,
      mfaConfig.recoveryCodes
    );

    if (valid) {
      // Consume the recovery code in user config
      await saveUserMfaConfig(userId, mfaConfig.secret, remainingHashedCodes);

      // Mark challenge as consumed
      await prisma.siteSetting.update({
        where: { key: challengeKey },
        data: {
          value: JSON.stringify({ ...challengeData, used: true, consumedAt: Date.now() }),
        },
      });

      return {
        success: true,
        message: `Recovery code accepted. ${remainingHashedCodes.length} recovery codes remaining.`,
        userId,
        email,
        deviceId,
      };
    }
  }

  // Verification failed: increment attempts and track
  const nextAttempts = challengeData.attempts + 1;
  const remaining = Math.max(0, challengeData.maxAttempts - nextAttempts);

  await prisma.siteSetting.update({
    where: { key: challengeKey },
    data: {
      value: JSON.stringify({
        ...challengeData,
        attempts: nextAttempts,
        used: nextAttempts >= challengeData.maxAttempts, // Lock if max reached
      }),
    },
  });

  return {
    success: false,
    message:
      remaining > 0
        ? `Invalid code. ${remaining} attempts remaining before session locks.`
        : "Too many failed attempts. Verification session locked for security.",
    remainingAttempts: remaining,
  };
}

