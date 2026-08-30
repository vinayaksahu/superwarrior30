"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleLiveSessionStatusAction,
  deleteLiveSessionAction,
} from "@/server/actions/live-session.actions";
import {
  Radio,
  CheckCircle,
  Play,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { LiveSessionStatus } from "@/generated/prisma";

interface LiveSessionTableActionsProps {
  session: {
    id: string;
    slug: string;
    status: string;
    meetingUrl: string | null;
  };
}

export function LiveSessionTableActions({ session }: LiveSessionTableActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusToggle = (newStatus: LiveSessionStatus) => {
    startTransition(async () => {
      const res = await toggleLiveSessionStatusAction(session.id, newStatus);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to permanently delete this live session?")) {
      return;
    }

    startTransition(async () => {
      const res = await deleteLiveSessionAction(session.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const copyStudentLink = () => {
    const url = `${window.location.origin}/dashboard/live/${session.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Student live link copied to clipboard!");
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Quick Status Control */}
      {session.status === "UPCOMING" && (
        <button
          onClick={() => handleStatusToggle("LIVE")}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-red-600/10 border border-red-600/20 px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-600/20 transition-all cursor-pointer"
          title="Start Live Class Now"
        >
          <Radio className="h-3 w-3" />
          <span>Go Live</span>
        </button>
      )}

      {session.status === "LIVE" && (
        <button
          onClick={() => handleStatusToggle("COMPLETED")}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-600/20 px-2.5 py-1 text-xs font-bold text-emerald-500 hover:bg-emerald-600/20 transition-all cursor-pointer"
          title="End Live Class"
        >
          <CheckCircle className="h-3 w-3" />
          <span>End Class</span>
        </button>
      )}

      {/* Copy Link */}
      <button
        onClick={copyStudentLink}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
        title="Copy Student Join Link"
      >
        <Copy className="h-4 w-4" />
      </button>

      {/* Edit Link */}
      <Link
        href={`/admin/live-sessions/${session.id}`}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Edit Session & View Attendance"
      >
        <Edit className="h-4 w-4" />
      </Link>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
        title="Delete Session"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
