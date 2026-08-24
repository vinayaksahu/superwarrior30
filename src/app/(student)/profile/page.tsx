import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForms } from "@/components/student/profile-forms";
import { User, Shield, KeyRound, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile & Settings",
};

export default async function StudentProfilePage() {
  const sessionUser = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      referralCode: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profile & Security
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your student profile details, authentication credentials, and account status
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{user.name || "Student"}</h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              {user.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground block text-[11px]">Referral Code</span>
            <span className="font-mono font-bold text-foreground">{user.referralCode}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Account Created</span>
            <span className="font-medium text-foreground">
              {new Date(user.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Security Status</span>
            <span className="font-semibold text-emerald-500 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Protected
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form & Change Password Form */}
      <ProfileForms
        initialName={user.name || ""}
        initialPhone={user.phone || ""}
        email={user.email}
      />
    </div>
  );
}
