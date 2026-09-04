import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/constants";
import { UserRole } from "@/generated/prisma";

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL SECURITY CONFIGURATION] JWT_SECRET_KEY environment variable is missing in production. Application failed closed to prevent token forgery."
      );
    }
    return new TextEncoder().encode("dev_only_non_production_secret_key_64_characters_minimum_hs256_sw30");
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "[FATAL SECURITY CONFIGURATION] JWT_SECRET_KEY must be at least 32 characters long for HS256 algorithm security."
    );
  }

  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  deviceId?: string;
  isTestData?: boolean;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
    deviceId: payload.deviceId,
    isTestData: Boolean(payload.isTestData),
    expiresAt: payload.expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

export async function decrypt(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      tokenVersion: (payload.tokenVersion as number) || 1,
      deviceId: payload.deviceId as string | undefined,
      isTestData: Boolean(payload.isTestData),
      expiresAt: new Date(payload.expiresAt as string),
    };
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  email: string,
  role: UserRole,
  tokenVersion: number = 1,
  deviceId?: string,
  isTestData?: boolean
) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const token = await encrypt({ userId, email, role, tokenVersion, deviceId, isTestData, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
