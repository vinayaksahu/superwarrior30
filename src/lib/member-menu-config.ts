export interface MemberMenuItemConfig {
  key: string;
  label: string;
  href: string;
  isEnabled: boolean;
  description: string;
}

export const DEFAULT_MEMBER_MENU_ITEMS: MemberMenuItemConfig[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    isEnabled: true,
    description: "Main student dashboard overview and quick stats",
  },
  {
    key: "courses",
    label: "My Courses",
    href: "/dashboard/courses",
    isEnabled: true,
    description: "Enrolled courses, video modules, and curriculum",
  },
  {
    key: "homework",
    label: "Homework",
    href: "/dashboard/homework",
    isEnabled: true,
    description: "Assignments, homework analysis, and grading submissions",
  },
  {
    key: "journal",
    label: "Trading Journal",
    href: "/dashboard/journal",
    isEnabled: true,
    description: "Personal trade logging, analytics, and screenshots",
  },
  {
    key: "live_proofs",
    label: "YouTube Live Trades",
    href: "/dashboard/live-proofs",
    isEnabled: true,
    description: "YouTube live proof videos and trading recordings",
  },
  {
    key: "live",
    label: "Live Classes",
    href: "/dashboard/live",
    isEnabled: true,
    description: "Live streaming sessions, webinars, and live trading calls",
  },
  {
    key: "cashbacks",
    label: "Rewards & Offers",
    href: "/dashboard/cashbacks",
    isEnabled: true,
    description: "Broker partner cashbacks, welcome offers, and bonuses",
  },
  {
    key: "community",
    label: "Join Community",
    href: "/dashboard/join-community",
    isEnabled: true,
    description: "VIP community channels on Telegram and WhatsApp",
  },
  {
    key: "testimonials",
    label: "Review",
    href: "/dashboard/testimonials",
    isEnabled: true,
    description: "Student reviews, testimonials, and feedback submission",
  },
  {
    key: "referrals",
    label: "Affiliate",
    href: "/referrals",
    isEnabled: true,
    description: "Affiliate program, referral links, banners, and payouts",
  },
  {
    key: "wallet",
    label: "Wallet",
    href: "/wallet",
    isEnabled: true,
    description: "Student wallet balance, deposits, and withdrawal requests",
  },
  {
    key: "orders",
    label: "Orders",
    href: "/orders",
    isEnabled: true,
    description: "Purchase receipts, invoices, and order history",
  },
  {
    key: "support",
    label: "Support Desk",
    href: "/dashboard/support",
    isEnabled: true,
    description: "Support ticket management and help center contact",
  },
  {
    key: "profile",
    label: "Profile",
    href: "/profile",
    isEnabled: true,
    description: "Personal profile details, password, and account settings",
  },
];
