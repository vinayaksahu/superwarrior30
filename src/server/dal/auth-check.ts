export function isSuperAdminUser(user?: { role?: string | null; adminRole?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const role = String(user.role || "").toUpperCase().trim();
  const adminRole = String(user.adminRole || "").toUpperCase().trim();
  const email = String(user.email || "").toLowerCase().trim();
  return (
    email === "vinayaksahu3@gmail.com" ||
    email === "admin@superwarrior30.com" ||
    adminRole === "SUPER_ADMIN" ||
    (role === "SUPER_ADMIN" && (adminRole === "SUPER_ADMIN" || !user.adminRole))
  );
}
