"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserEmailBySuperAdminAction } from "@/server/actions/admin.actions";
import { Mail, Loader2, CheckCircle2, AlertTriangle, X, Edit3 } from "lucide-react";
import { toast } from "sonner";

interface EditUserEmailButtonProps {
  userId: string;
  userName?: string | null;
  currentEmail: string;
  isSuperAdmin?: boolean;
  size?: "xs" | "sm" | "default";
}

export function EditUserEmailButton({
  userId,
  userName,
  currentEmail,
  isSuperAdmin = true,
  size = "xs",
}: EditUserEmailButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isSuperAdmin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = newEmail.toLowerCase().trim();
    if (!clean || !clean.includes("@") || clean.length < 5) {
      setError("Please enter a valid email address.");
      return;
    }

    if (clean === currentEmail.toLowerCase().trim()) {
      setError("New email must be different from current email.");
      return;
    }

    startTransition(async () => {
      const res = await updateUserEmailBySuperAdminAction({
        userId,
        newEmail: clean,
      });

      if (res.success) {
        toast.success(res.message || "Email address updated successfully!");
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update email address.");
        toast.error(res.error || "Failed to update email.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNewEmail(currentEmail);
          setError(null);
          setIsOpen(true);
        }}
        className={
          size === "xs"
            ? "inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
            : "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
        }
        title={`Change Email Address for ${userName || currentEmail}`}
      >
        <Edit3 className="h-3 w-3" />
        <span>Change Email</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => !isPending && setIsOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="rounded-full p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Change Account Email
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Super Admin override: modify login & notification email
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Name:</span>
                  <span className="font-semibold text-foreground">{userName || "Student"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Email:</span>
                  <span className="font-mono text-muted-foreground">{currentEmail}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  New Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address..."
                    required
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Security Notice:</span>
                </div>
                <p className="leading-relaxed text-amber-300/90">
                  Changing the email will immediately update their login credentials and invalidate any existing active sessions, requiring them to sign in with the new email.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/20 font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-input px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm & Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
