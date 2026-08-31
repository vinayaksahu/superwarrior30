import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { MaintenanceScreen } from "@/components/shared/maintenance-screen";
import { headers } from "next/headers";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export async function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  let isMaintenance = false;
  let supportEmail = "support@superwarrior30.com";
  let siteName = "Super Warrior 30";

  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: ["maintenance_mode", "support_email", "site_name"] },
      },
    });

    for (const s of settings) {
      if (s.key === "maintenance_mode") isMaintenance = s.value === "true";
      if (s.key === "support_email" && s.value) supportEmail = s.value;
      if (s.key === "site_name" && s.value) siteName = s.value;
    }
  } catch (err) {
    // If database connection delay, gracefully render children
    return <>{children}</>;
  }

  // If maintenance mode is OFF, render children normally
  if (!isMaintenance) {
    return <>{children}</>;
  }

  // Check if current user is an Administrator
  let isAdmin = false;
  try {
    const user = await getCurrentUser();
    isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  } catch {
    isAdmin = false;
  }

  // Administrators bypass maintenance mode with a floating indicator
  if (isAdmin) {
    return (
      <>
        <div className="bg-amber-500 text-black px-4 py-1.5 text-center text-xs font-bold shadow-md sticky top-0 z-[9999] flex items-center justify-center gap-3">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            MAINTENANCE MODE IS ACTIVE (Public visitors see the maintenance screen)
          </span>
          <Link
            href="/admin/settings"
            className="underline font-black text-[11px] hover:opacity-80 inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded"
          >
            Turn Off in Settings <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {children}
      </>
    );
  }

  // Check requested URL path from request headers
  let pathname = "";
  try {
    const headersList = await headers();
    pathname = headersList.get("x-pathname") || "";
  } catch {
    pathname = "";
  }

  // Allow admin portal, login, and essential auth/database initialization APIs
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/init-db")
  ) {
    return <>{children}</>;
  }

  // All other pages show the Maintenance Screen
  return <MaintenanceScreen siteName={siteName} supportEmail={supportEmail} />;
}
