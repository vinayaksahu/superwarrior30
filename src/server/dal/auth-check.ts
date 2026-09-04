export function isSuperAdminUser(user?: { role?: string | null; adminRole?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const role = String(user.role || "").toUpperCase().trim();
  const adminRole = String(user.adminRole || "").toUpperCase().trim();
  const email = String(user.email || "").toLowerCase().trim();
  // Primary: Database-backed role check
  if (adminRole === "SUPER_ADMIN" || (role === "SUPER_ADMIN" && (adminRole === "SUPER_ADMIN" || !user.adminRole))) {
    return true;
  }

  // Secondary bootstrap safeguard: requires explicit administrative role in database
  if ((email === "vinayaksahu3@gmail.com" || email === "admin@superwarrior30.com") && (role === "ADMIN" || role === "SUPER_ADMIN")) {
    return true;
  }

  return false;
}

export function isStaffAdminUser(user?: { role?: string | null; adminRole?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  if (isSuperAdminUser(user)) return false;
  const role = String(user.role || "").toUpperCase().trim();
  const adminRole = String(user.adminRole || "").toUpperCase().trim();
  return role === "ADMIN" || role === "STAFF" || Boolean(adminRole && adminRole !== "STUDENT");
}
