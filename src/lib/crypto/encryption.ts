import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

/**
 * Derives a 32-byte key from environment secrets or system seed
 */
function getDerivedKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "superwarrior30-default-secure-salt-2026";

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encryptSecret(plainText: string | null | undefined): string | null {
  if (!plainText || typeof plainText !== "string" || !plainText.trim()) {
    return null;
  }

  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plainText.trim(), "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Pack: IV (12B) + Tag (16B) + Encrypted Data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption failure:", error);
    throw new Error("Failed to securely encrypt sensitive credentials.");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted base64 payload.
 */
export function decryptSecret(cipherText: string | null | undefined): string | null {
  if (!cipherText || typeof cipherText !== "string" || !cipherText.trim()) {
    return null;
  }

  // Handle plain text fallback if previously unencrypted in legacy data
  if (!/^[A-Za-z0-9+/=]+$/.test(cipherText.trim()) || cipherText.length < 32) {
    return cipherText.trim();
  }

  try {
    const key = getDerivedKey();
    const combined = Buffer.from(cipherText.trim(), "base64");

    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      return cipherText.trim();
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encryptedText = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    // If decryption fails (e.g. key changed or plain text), return safe fallback or null
    console.warn("Decryption failed for secret, checking fallback format");
    return null;
  }
}

/**
 * Masks a sensitive string for safe UI presentation (e.g., "••••••••••••3a8f")
 * Never exposes the original key.
 */
export function maskSecret(secret: string | null | undefined, visibleChars: number = 4): string {
  if (!secret || typeof secret !== "string") {
    return "Not configured";
  }

  const clean = secret.trim();
  if (clean.length <= visibleChars) {
    return "••••••••••••";
  }

  const lastChars = clean.slice(-visibleChars);
  return `••••••••••••${lastChars}`;
}
