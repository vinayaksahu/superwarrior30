import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/constants";
import { UserRole } from "@/generated/prisma";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "fallback_dev_secret_key_64_characters_long_min_for_hs256_algo";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  deviceId?: string;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
    deviceId: payload.deviceId,
    expiresAt: payload.expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      tokenVersion: (payload.tokenVersion as number) || 1,
      deviceId: payload.deviceId as string | undefined,
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
  deviceId?: string
) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const token = await encrypt({ userId, email, role, tokenVersion, deviceId, expiresAt });

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
