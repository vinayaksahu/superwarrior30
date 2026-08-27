import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session-status
 *
 * Lightweight heartbeat endpoint for client-side session guard.
 * Accurately distinguishes between:
 * 1. DISPLACED: Another device logged in (single device rule)
 * 2. ADMIN_LOGOUT: Admin explicitly performed Session Out or Revoke
 * 3. BLOCKED: User account locked due to security limit
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const session = await decrypt(token);
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false, reason: "INVALID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, reason: "USER_NOT_FOUND" });
    }

    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      return NextResponse.json({ authenticated: false, reason: "BLOCKED" });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ authenticated: false, reason: "DEACTIVATED" });
    }

    // Check device state first to see if it was explicitly revoked by admin
    let deviceRevoked = false;
    let deviceInactive = false;

    if (session.deviceId) {
      const device = await prisma.userDevice.findUnique({
        where: { id: session.deviceId },
        select: {
          id: true,
          isActive: true,
          revokedAt: true,
        },
      });

      if (!device || device.revokedAt !== null) {
        deviceRevoked = true;
      } else if (!device.isActive) {
        deviceInactive = true;
      }
    }

    // If device was revoked (Session Out / Revoke button), return ADMIN_LOGOUT
    if (deviceRevoked) {
      return NextResponse.json({ authenticated: false, reason: "ADMIN_LOGOUT" });
    }

    // If tokenVersion changed or device marked inactive without revoke, it was displaced by another device login
    if (user.tokenVersion !== session.tokenVersion || deviceInactive) {
      return NextResponse.json({ authenticated: false, reason: "DISPLACED" });
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false, error: "Internal error" }, { status: 500 });
  }
}
