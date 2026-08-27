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
 * Checks whether the current browser's JWT session is still active and valid in the DB.
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

    // Token version mismatch means another device logged in or admin forced logout
    if (user.tokenVersion !== session.tokenVersion) {
      return NextResponse.json({ authenticated: false, reason: "DISPLACED" });
    }

    // Device-level check
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
        return NextResponse.json({ authenticated: false, reason: "REVOKED" });
      }

      if (!device.isActive) {
        return NextResponse.json({ authenticated: false, reason: "DISPLACED" });
      }
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: "Internal error" }, { status: 500 });
  }
}
