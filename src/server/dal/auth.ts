import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { UserRole } from "@/generated/prisma";

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await decrypt(token);
  if (!session?.userId) return null;

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      referralCode: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  // Session revocation check: if user's tokenVersion was incremented, invalidate session
  if (user.tokenVersion !== session.tokenVersion) return null;

  return user;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");
  return user;
}

export async function requireStudent() {
  const user = await requireAuth();
  if (user.role !== UserRole.STUDENT && user.role !== UserRole.ADMIN) {
    redirect("/login");
  }
  return user;
}
