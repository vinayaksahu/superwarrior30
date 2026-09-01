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
 * 1. DISPLACED: Another device logged in (active on a different device)
 * 2. ADMIN_LOGOUT: Admin explicitly revoked the session
 * 3. BLOCKED: User account locked
 * 4. Normal Logout / Inactive: Clean termination without false warnings
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
      return NextResponse.json({ authenticated: false });
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
      return NextResponse.json({ authenticated: false });
    }

    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      return NextResponse.json({ authenticated: false, reason: "BLOCKED" });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ authenticated: false, reason: "DEACTIVATED" });
    }

    // Check device state
    if (session.deviceId) {
      const device = await prisma.userDevice.findUnique({
        where: { id: session.deviceId },
        select: {
          id: true,
          isActive: true,
          revokedAt: true,
        },
      });

      // If device was explicitly revoked by an admin action
      if (device && device.revokedAt !== null) {
        return NextResponse.json({ authenticated: false, reason: "ADMIN_LOGOUT" });
      }

      // If current device was explicitly marked inactive
      if (device && !device.isActive) {
        const anotherActiveDevice = await prisma.userDevice.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            id: { not: session.deviceId },
          },
        });

        if (anotherActiveDevice) {
          return NextResponse.json({ authenticated: false, reason: "DISPLACED" });
        }

        return NextResponse.json({ authenticated: false });
      }
    }

    if (user.tokenVersion !== session.tokenVersion) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false, error: "Internal error" }, { status: 500 });
  }
}
