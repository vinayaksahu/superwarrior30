import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * GET /api/auth/signout
 *
 * This route handler is used to clear the session cookie and redirect to /login.
 * Unlike Server Components, Route Handlers CAN mutate cookies.
 * This is used by requireAuth() when it detects a revoked/invalid session
 * to break the middleware redirect loop.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  // Build absolute URL for redirect using the incoming request
  const loginUrl = new URL("/login", request.nextUrl.origin);
  return NextResponse.redirect(loginUrl);
}
