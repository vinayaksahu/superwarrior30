"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResetStudentPasswordAction } from "@/server/actions/admin-student.actions";
import { KeyRound, X, Loader2, Copy, Check, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ResetStudentPasswordModalProps {
  studentId: string;
  studentName?: string | null;
  studentEmail: string;
  size?: "xs" | "sm" | "default";
}

export function ResetStudentPasswordModal({
  studentId,
  studentName,
  studentEmail,
  size = "xs",
}: ResetStudentPasswordModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setNewPassword("");
    setResultPassword(null);
    setIsCopied(false);
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      setResultPassword(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword && newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const res = await adminResetStudentPasswordAction(
        studentId,
        newPassword.trim() || undefined
      );

      if (res.success && res.plainPassword) {
        setResultPassword(res.plainPassword);
        toast.success(res.message);
      } else {
        setError(res.error || "Failed to reset password.");
        toast.error(res.error || "Failed to reset password.");
      }
    });
  };

  const copyPassword = () => {
    if (!resultPassword) return;
    navigator.clipboard.writeText(resultPassword);
    setIsCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          size === "xs"
            ? "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        }
        title={`Reset Password for ${studentName || studentEmail}`}
      >
        <KeyRound className="h-3 w-3" />
        <span>Password</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-bold text-foreground truncate">
                  Reset Student Password
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {studentName || "Student"} • {studentEmail}
                </p>
              </div>
            </div>

            {resultPassword ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-400">
                    New Password Generated Successfully
                  </p>
                  <div className="flex items-center justify-between bg-background p-2.5 rounded-lg border border-border">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {resultPassword}
                    </span>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/80 cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Copy and share this new password with the student. All other active sessions have been signed out.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">
                      New Password (Optional)
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Empty = Auto-generate
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleClose}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-black transition-all cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
