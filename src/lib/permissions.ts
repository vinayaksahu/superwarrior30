export type AdminRoleType =
  | "SUPER_ADMIN"
  | "FULL_ACCESS_ADMIN"
  | "SUPPORT"
  | "VIEWER"
  | "FINANCE"
  | "MARKETING"
  | "CUSTOM_ROLE";

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  action: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "APPROVE" | "MANAGE" | "EXPORT" | "PAYOUT";
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  permissions: PermissionDefinition[];
}

export const ALL_MODULES: ModuleDefinition[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Main administrator overview and statistics",
    iconName: "LayoutDashboard",
    permissions: [
      { key: "dashboard.view", name: "View Dashboard", description: "Access admin summary metrics and KPI widgets", action: "VIEW" },
    ],
  },
  {
    id: "courses",
    name: "Courses & Curriculum",
    description: "Course management, lessons, videos and materials",
    iconName: "BookOpen",
    permissions: [
      { key: "courses.view", name: "View Courses", description: "Browse course list and curriculum", action: "VIEW" },
      { key: "courses.create", name: "Create Course", description: "Draft new courses and modules", action: "CREATE" },
      { key: "courses.edit", name: "Edit Course & Lessons", description: "Update course details, videos and pricing", action: "EDIT" },
      { key: "courses.delete", name: "Delete Course", description: "Move courses to recycle bin", action: "DELETE" },
      { key: "courses.publish", name: "Publish Course", description: "Publish or unpublish courses for sale", action: "MANAGE" },
    ],
  },
  {
    id: "live_sessions",
    name: "Live Sessions",
    description: "Webinars, Zoom meetings and live trading classes",
    iconName: "Radio",
    permissions: [
      { key: "live_sessions.view", name: "View Live Sessions", description: "Browse scheduled webinars and attendance", action: "VIEW" },
      { key: "live_sessions.create", name: "Schedule Session", description: "Create and schedule live webinars", action: "CREATE" },
      { key: "live_sessions.edit", name: "Edit Session", description: "Update session time, links and recordings", action: "EDIT" },
      { key: "live_sessions.delete", name: "Cancel Session", description: "Cancel or remove live sessions", action: "DELETE" },
    ],
  },
  {
    id: "students",
    name: "Students & Users",
    description: "Student directory, profile inspection and access control",
    iconName: "Users",
    permissions: [
      { key: "students.view", name: "View Students", description: "View student directory and enrollment history", action: "VIEW" },
      { key: "students.edit", name: "Edit Student", description: "Update student details and manual enrollments", action: "EDIT" },
      { key: "students.block", name: "Block / Suspend", description: "Deactivate or block student accounts", action: "MANAGE" },
    ],
  },
  {
    id: "orders",
    name: "Orders & Sales",
    description: "Course purchases, payment verification and manual orders",
    iconName: "ShoppingCart",
    permissions: [
      { key: "orders.view", name: "View Orders", description: "View customer orders and receipts", action: "VIEW" },
      { key: "orders.export", name: "Export Orders", description: "Export orders data as CSV/Excel", action: "EXPORT" },
      { key: "orders.manage", name: "Approve / Manage", description: "Approve manual payment slips or cancel orders", action: "MANAGE" },
    ],
  },
  {
    id: "withdrawals",
    name: "Withdrawals & Payouts",
    description: "Affiliate wallet withdrawal requests and payment dispatch",
    iconName: "ArrowDownToLine",
    permissions: [
      { key: "withdrawals.view", name: "View Withdrawals", description: "View pending and processed withdrawal queue", action: "VIEW" },
      { key: "withdrawals.approve", name: "Approve Requests", description: "Review and approve withdrawal requests", action: "APPROVE" },
      { key: "withdrawals.reject", name: "Reject Requests", description: "Reject invalid withdrawal requests", action: "MANAGE" },
      { key: "withdrawals.payout", name: "Release Payouts", description: "Mark payouts as completed and record transaction UTR", action: "PAYOUT" },
    ],
  },
  {
    id: "wallet",
    name: "Wallet & Ledger",
    description: "System financial ledger, user wallets and adjustments",
    iconName: "Wallet",
    permissions: [
      { key: "wallet.view", name: "View Wallets", description: "View user balances and transaction ledger", action: "VIEW" },
      { key: "wallet.manage", name: "Manual Adjustments", description: "Execute balance adjustments or credit corrections", action: "MANAGE" },
    ],
  },
  {
    id: "affiliate",
    name: "Affiliate & MLM Referrals",
    description: "Multi-level commission plans, genealogy trees and holding periods",
    iconName: "GitBranch",
    permissions: [
      { key: "affiliate.view", name: "View Referrals", description: "Inspect referral network trees and earnings", action: "VIEW" },
      { key: "affiliate.manage", name: "Configure Tiers", description: "Update tier percentages and direct referral requirements", action: "MANAGE" },
      { key: "affiliate.clearance", name: "Clearance Release", description: "Execute manual commission clearance before holding period", action: "APPROVE" },
    ],
  },
  {
    id: "support",
    name: "Support Desk",
    description: "Customer service tickets, WhatsApp inquiries and live replies",
    iconName: "LifeBuoy",
    permissions: [
      { key: "support.view", name: "View Inquiries", description: "Browse support inquiries and ticket queues", action: "VIEW" },
      { key: "support.respond", name: "Reply to Tickets", description: "Send responses and message students", action: "EDIT" },
      { key: "support.manage", name: "Manage Status", description: "Resolve, close, or reassign tickets", action: "MANAGE" },
    ],
  },
  {
    id: "offers",
    name: "Offers, Coupons & Broker Cashbacks",
    description: "Discount coupons, promotion banners and broker claim verification",
    iconName: "Sparkles",
    permissions: [
      { key: "offers.view", name: "View Offers & Coupons", description: "Browse active promotional coupons and cashback claims", action: "VIEW" },
      { key: "offers.create", name: "Create Coupons", description: "Generate new discount codes and promotion campaigns", action: "CREATE" },
      { key: "offers.edit", name: "Edit Offers", description: "Update coupon limits, validity and percentages", action: "EDIT" },
      { key: "offers.delete", name: "Delete Coupons", description: "Deactivate or delete discount coupons", action: "DELETE" },
      { key: "offers.approve", name: "Verify Broker Claims", description: "Verify partner broker member IDs and trading proofs", action: "APPROVE" },
      { key: "offers.payout", name: "Pay Cashback Claims", description: "Release cashback payments to eligible students", action: "PAYOUT" },
    ],
  },
  {
    id: "payment_methods",
    name: "Payment Methods",
    description: "Manual UPI QR codes, bank accounts and crypto addresses",
    iconName: "CreditCard",
    permissions: [
      { key: "payment_methods.view", name: "View Methods", description: "View deposit payment methods configured", action: "VIEW" },
      { key: "payment_methods.manage", name: "Configure Accounts", description: "Add or update UPI IDs, QR codes and bank details", action: "MANAGE" },
    ],
  },
  {
    id: "leads",
    name: "Leads & CRM",
    description: "Captured marketing leads, quiz respondents and phone numbers",
    iconName: "ContactRound",
    permissions: [
      { key: "leads.view", name: "View Leads", description: "Inspect lead contact cards and quiz answers", action: "VIEW" },
      { key: "leads.manage", name: "Update Stage", description: "Move leads across pipeline stages", action: "MANAGE" },
      { key: "leads.export", name: "Export Leads", description: "Export lead lists to CSV for marketing campaigns", action: "EXPORT" },
    ],
  },
  {
    id: "funnel",
    name: "Funnel Analytics",
    description: "Conversion funnels, UTM attribution and page performance",
    iconName: "BarChart3",
    permissions: [
      { key: "funnel.view", name: "View Analytics", description: "Inspect funnel drop-off rates and UTM campaign reports", action: "VIEW" },
      { key: "funnel.export", name: "Export Reports", description: "Download analytics and conversion summaries", action: "EXPORT" },
    ],
  },
  {
    id: "testimonials",
    name: "Testimonials & Reviews",
    description: "Student reviews, video testimonials and ratings",
    iconName: "Star",
    permissions: [
      { key: "testimonials.view", name: "View Testimonials", description: "Browse submitted student reviews", action: "VIEW" },
      { key: "testimonials.create", name: "Add Testimonial", description: "Manually add verified student testimonial", action: "CREATE" },
      { key: "testimonials.edit", name: "Edit Testimonial", description: "Edit review text and photos", action: "EDIT" },
      { key: "testimonials.delete", name: "Delete Testimonial", description: "Remove testimonial from website", action: "DELETE" },
      { key: "testimonials.approve", name: "Approve & Publish", description: "Approve user reviews for public display", action: "APPROVE" },
    ],
  },
  {
    id: "staff",
    name: "Admin Roles & Staff",
    description: "System administrators, staff accounts and role assignment",
    iconName: "ShieldCheck",
    permissions: [
      { key: "staff.view", name: "View Staff List", description: "View administrative user accounts", action: "VIEW" },
      { key: "staff.manage", name: "Create & Deactivate Staff", description: "Create staff accounts and toggle activation", action: "MANAGE" },
      { key: "staff.roles_assign", name: "Assign Roles & Permissions", description: "Modify staff roles and granular permission matrices", action: "MANAGE" },
    ],
  },
  {
    id: "settings_general",
    name: "Settings — General & Branding",
    description: "Site name, logo, contact information and terms",
    iconName: "Globe",
    permissions: [
      { key: "settings.general.manage", name: "Manage General Settings", description: "Update academy branding, contact details and policies", action: "MANAGE" },
    ],
  },
  {
    id: "settings_profile",
    name: "Settings — Profile & Security",
    description: "Personal account password and profile settings",
    iconName: "UserCheck",
    permissions: [
      { key: "settings.profile.manage", name: "Update Profile", description: "Update personal name, phone and account password", action: "MANAGE" },
    ],
  },
  {
    id: "settings_email_otp",
    name: "Settings — Email & OTP Security",
    description: "PrivateEmail SMTP configuration and 2FA authentication rules",
    iconName: "Mail",
    permissions: [
      { key: "settings.email_otp.manage", name: "Manage Email & OTP", description: "Configure Namecheap SMTP and toggle mandatory OTP", action: "MANAGE" },
    ],
  },
  {
    id: "settings_media_storage",
    name: "Settings — Media Storage (Bunny)",
    description: "Bunny CDN, Stream API keys, Pull Zones and R2 credentials",
    iconName: "Cloud",
    permissions: [
      { key: "settings.media_storage.manage", name: "Manage Media & Bunny", description: "Update storage API keys, video libraries and CDN zones", action: "MANAGE" },
    ],
  },
  {
    id: "settings_backups",
    name: "Settings — Backups & Database",
    description: "Database synchronization, exports and backup policies",
    iconName: "Database",
    permissions: [
      { key: "settings.backups.manage", name: "Manage Backups", description: "Trigger database synchronization and export system data", action: "MANAGE" },
    ],
  },
  {
    id: "recycle_bin",
    name: "Recycle Bin",
    description: "Restoration of deleted courses, lessons and records",
    iconName: "Trash2",
    permissions: [
      { key: "recycle_bin.view", name: "View Recycle Bin", description: "Browse deleted items", action: "VIEW" },
      { key: "recycle_bin.manage", name: "Restore / Purge", description: "Restore deleted items or permanently purge them", action: "MANAGE" },
    ],
  },
  {
    id: "audit_logs",
    name: "Audit Logs",
    description: "Immutable platform security events, logins and staff activities",
    iconName: "ScrollText",
    permissions: [
      { key: "audit_logs.view", name: "View Audit Logs", description: "Inspect system security events and actor logs", action: "VIEW" },
    ],
  },
];

// Helper mapping: all known permissions as a flat list
export const ALL_PERMISSION_KEYS: string[] = ALL_MODULES.flatMap((m) =>
  m.permissions.map((p) => p.key)
);

export interface RolePreset {
  key: AdminRoleType;
  displayName: string;
  shortDescription: string;
  badgeLabel: string;
  badgeColorClass: string;
  defaultPermissions: string[];
}

export const ROLE_PRESETS: Record<AdminRoleType, RolePreset> = {
  SUPER_ADMIN: {
    key: "SUPER_ADMIN",
    displayName: "Super Admin",
    shortDescription: "Root platform authority with unrestricted access to all functions and settings.",
    badgeLabel: "SUPER_ADMIN",
    badgeColorClass: "bg-destructive/15 text-destructive border-destructive/30",
    defaultPermissions: ALL_PERMISSION_KEYS,
  },
  FULL_ACCESS_ADMIN: {
    key: "FULL_ACCESS_ADMIN",
    displayName: "Full Access Admin",
    shortDescription: "Full administrative operations across courses, orders, students, marketing and general settings.",
    badgeLabel: "FULL_ACCESS_ADMIN",
    badgeColorClass: "bg-primary/15 text-primary border-primary/30",
    defaultPermissions: [
      "dashboard.view",
      "courses.view", "courses.create", "courses.edit", "courses.delete", "courses.publish",
      "live_sessions.view", "live_sessions.create", "live_sessions.edit", "live_sessions.delete",
      "students.view", "students.edit", "students.block",
      "orders.view", "orders.export", "orders.manage",
      "withdrawals.view", "withdrawals.approve", "withdrawals.reject", "withdrawals.payout",
      "wallet.view", "wallet.manage",
      "affiliate.view", "affiliate.manage", "affiliate.clearance",
      "support.view", "support.respond", "support.manage",
      "offers.view", "offers.create", "offers.edit", "offers.delete", "offers.approve", "offers.payout",
      "payment_methods.view", "payment_methods.manage",
      "leads.view", "leads.manage", "leads.export",
      "funnel.view", "funnel.export",
      "testimonials.view", "testimonials.create", "testimonials.edit", "testimonials.delete", "testimonials.approve",
      "staff.view",
      "settings.general.manage",
      "settings.profile.manage",
      "recycle_bin.view", "recycle_bin.manage",
      "audit_logs.view",
    ],
  },
  SUPPORT: {
    key: "SUPPORT",
    displayName: "Only Support",
    shortDescription: "Customer service and support desk inquiries, viewing student and order details.",
    badgeLabel: "ONLY_SUPPORT",
    badgeColorClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    defaultPermissions: [
      "dashboard.view",
      "support.view", "support.respond", "support.manage",
      "students.view",
      "orders.view",
      "courses.view",
      "live_sessions.view",
      "settings.profile.manage",
    ],
  },
  VIEWER: {
    key: "VIEWER",
    displayName: "Only Viewer",
    shortDescription: "Read-only access across platform modules without ability to create, edit or delete.",
    badgeLabel: "ONLY_VIEWER",
    badgeColorClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    defaultPermissions: [
      "dashboard.view",
      "courses.view",
      "live_sessions.view",
      "students.view",
      "orders.view",
      "withdrawals.view",
      "wallet.view",
      "affiliate.view",
      "support.view",
      "offers.view",
      "payment_methods.view",
      "leads.view",
      "funnel.view",
      "testimonials.view",
      "recycle_bin.view",
      "audit_logs.view",
      "settings.profile.manage",
    ],
  },
  FINANCE: {
    key: "FINANCE",
    displayName: "Finance",
    shortDescription: "Orders, financial ledger, withdrawals processing, payment methods and cashback payouts.",
    badgeLabel: "FINANCE",
    badgeColorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    defaultPermissions: [
      "dashboard.view",
      "orders.view", "orders.export", "orders.manage",
      "withdrawals.view", "withdrawals.approve", "withdrawals.reject", "withdrawals.payout",
      "wallet.view", "wallet.manage",
      "affiliate.view", "affiliate.clearance",
      "payment_methods.view", "payment_methods.manage",
      "offers.view", "offers.approve", "offers.payout",
      "settings.profile.manage",
    ],
  },
  MARKETING: {
    key: "MARKETING",
    displayName: "Marketer",
    shortDescription: "Promotional campaigns, coupons, leads CRM, affiliate setup, testimonials and funnel reports.",
    badgeLabel: "MARKETER",
    badgeColorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    defaultPermissions: [
      "dashboard.view",
      "offers.view", "offers.create", "offers.edit", "offers.delete",
      "affiliate.view", "affiliate.manage",
      "leads.view", "leads.manage", "leads.export",
      "funnel.view", "funnel.export",
      "testimonials.view", "testimonials.create", "testimonials.edit", "testimonials.delete", "testimonials.approve",
      "courses.view",
      "settings.profile.manage",
    ],
  },
  CUSTOM_ROLE: {
    key: "CUSTOM_ROLE",
    displayName: "Custom Role",
    shortDescription: "Custom administrator with manually selected granular permissions.",
    badgeLabel: "CUSTOM_ROLE",
    badgeColorClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    defaultPermissions: ["dashboard.view", "settings.profile.manage"],
  },
};

/**
 * Resolves the effective permission set for a given user.
 */
export function getEffectivePermissions(user: {
  role?: string | null;
  adminRole?: string | null;
  customPermissions?: unknown;
  email?: string | null;
} | null | undefined): Set<string> {
  if (!user) return new Set();

  const email = String(user.email || "").toLowerCase();
  const role = String(user.role || "").toUpperCase();
  const adminRole = String(user.adminRole || "").toUpperCase();

  // Root Super Admin check
  if (
    role === "SUPER_ADMIN" ||
    adminRole === "SUPER_ADMIN" ||
    email === "vinayaksahu3@gmail.com" ||
    email === "admin@superwarrior30.com"
  ) {
    return new Set(ALL_PERMISSION_KEYS);
  }

  // If custom role, parse customPermissions array
  if (adminRole === "CUSTOM_ROLE") {
    let perms: string[] = [];
    if (Array.isArray(user.customPermissions)) {
      perms = user.customPermissions.map(String);
    } else if (typeof user.customPermissions === "string") {
      try {
        const parsed = JSON.parse(user.customPermissions);
        if (Array.isArray(parsed)) perms = parsed.map(String);
      } catch {
        // ignore
      }
    }
    // Always grant personal profile access
    perms.push("settings.profile.manage");
    return new Set(perms);
  }

  // Predefined role preset
  if (adminRole in ROLE_PRESETS) {
    return new Set(ROLE_PRESETS[adminRole as AdminRoleType].defaultPermissions);
  }

  // Legacy fallback based on UserRole enum
  if (role === "ADMIN") {
    return new Set(ROLE_PRESETS.FULL_ACCESS_ADMIN.defaultPermissions);
  }
  if (role === "SUPPORT") {
    return new Set(ROLE_PRESETS.SUPPORT.defaultPermissions);
  }

  return new Set();
}

/**
 * Checks whether a user holds a specific permission key.
 */
export function hasPermission(
  user: {
    role?: string | null;
    adminRole?: string | null;
    customPermissions?: unknown;
    email?: string | null;
  } | null | undefined,
  permission: string
): boolean {
  const permissions = getEffectivePermissions(user);
  return permissions.has(permission);
}

/**
 * Checks whether a user holds ANY of the specified permission keys.
 */
export function hasAnyPermission(
  user: {
    role?: string | null;
    adminRole?: string | null;
    customPermissions?: unknown;
    email?: string | null;
  } | null | undefined,
  permissions: string[]
): boolean {
  const userPerms = getEffectivePermissions(user);
  return permissions.some((p) => userPerms.has(p));
}

/**
 * Gets friendly presentation info for a staff member's role.
 */
export function getRolePresentation(
  role: string | null | undefined,
  adminRole: string | null | undefined,
  email: string | null | undefined
): {
  displayName: string;
  badgeLabel: string;
  badgeColorClass: string;
  effectiveRoleKey: AdminRoleType;
} {
  const normEmail = String(email || "").toLowerCase();
  const normRole = String(role || "").toUpperCase();
  const normAdminRole = String(adminRole || "").toUpperCase();

  if (
    normRole === "SUPER_ADMIN" ||
    normAdminRole === "SUPER_ADMIN" ||
    normEmail === "vinayaksahu3@gmail.com" ||
    normEmail === "admin@superwarrior30.com"
  ) {
    return {
      displayName: "Super Admin",
      badgeLabel: "SUPER_ADMIN",
      badgeColorClass: "bg-destructive/15 text-destructive border border-destructive/30",
      effectiveRoleKey: "SUPER_ADMIN",
    };
  }

  if (normAdminRole in ROLE_PRESETS) {
    const preset = ROLE_PRESETS[normAdminRole as AdminRoleType];
    return {
      displayName: preset.displayName,
      badgeLabel: preset.badgeLabel,
      badgeColorClass: `border ${preset.badgeColorClass}`,
      effectiveRoleKey: preset.key,
    };
  }

  if (normRole === "SUPPORT") {
    return {
      displayName: "Only Support",
      badgeLabel: "ONLY_SUPPORT",
      badgeColorClass: "border bg-sky-500/15 text-sky-400 border-sky-500/30",
      effectiveRoleKey: "SUPPORT",
    };
  }

  // Default to Full Access Admin
  return {
    displayName: "Full Access Admin",
    badgeLabel: "FULL_ACCESS_ADMIN",
    badgeColorClass: "border bg-primary/15 text-primary border-primary/30",
    effectiveRoleKey: "FULL_ACCESS_ADMIN",
  };
}
