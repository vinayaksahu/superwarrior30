import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const PUBLIC_ROUTES = [
  "/",
  "/courses",
  "/about",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/sitemap.xml",
  "/robots.txt",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  // Allow /courses/[slug] as public
  if (pathname.startsWith("/courses/")) return true;
  // Allow API routes (webhooks, etc.) to manage their own auth/signatures
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  const isPublic = isPublicRoute(pathname);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // 1. Unauthenticated user trying to access protected route
  if (!session && !isPublic && !isAuthRoute) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user trying to access auth pages (login/register)
  if (session && isAuthRoute) {
    const destination =
      session.role === "ADMIN" || session.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.nextUrl));
  }

  // 3. Role-based route enforcement
  if (session) {
    // Non-admin trying to access admin routes
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL("/dashboard", request.nextUrl)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public assets
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
