"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Video,
  Mic,
  Share2,
  ExternalLink,
  ShieldCheck,
  Radio,
  ArrowLeft,
  Users,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface EmbeddedLiveRoomProps {
  session: {
    id: string;
    title: string;
    description: string | null;
    roomName: string | null;
    provider: string;
    meetingUrl: string | null;
    meetingId: string | null;
    passcode: string | null;
    status: string;
    course?: { title: string; slug: string } | null;
  };
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI?: any;
  }
}

export function EmbeddedLiveRoom({ session, currentUser }: EmbeddedLiveRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roomName = session.roomName || `superwarrior30-${session.id}`;
  const isExternalMeeting = session.provider === "ZOOM" || session.provider === "GOOGLE_MEET";

  useEffect(() => {
    // If it's an embedded room, load Jitsi Meet WebRTC SDK
    if (session.provider === "EMBEDDED_ROOM" || !session.meetingUrl) {
      const scriptId = "jitsi-external-api-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const initJitsi = () => {
        if (!window.JitsiMeetExternalAPI || !containerRef.current) {
          setError("Video engine could not be initialized.");
          setLoading(false);
          return;
        }

        // Clean up previous instance
        if (apiRef.current) {
          apiRef.current.dispose();
        }

        const domain = "meet.jit.si";
        const options = {
          roomName: `sw30-${roomName}`,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          userInfo: {
            displayName: currentUser.name || "Student",
            email: currentUser.email,
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            branding: {
              showWatermark: false,
            },
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "profile",
              "chat",
              "recording",
              "livestreaming",
              "etherpad",
              "sharedvideo",
              "settings",
              "raisehand",
              "videoquality",
              "filmstrip",
              "tileview",
              "stats",
              "shortcuts",
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        };

        try {
          const api = new window.JitsiMeetExternalAPI(domain, options);
          apiRef.current = api;

          api.addEventListener("videoConferenceJoined", () => {
            setLoading(false);
          });

          // Fallback timeout in case event doesn't fire
          setTimeout(() => setLoading(false), 3000);
        } catch (err) {
          setError("Failed to connect to the live video room.");
          setLoading(false);
        }
      };

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => initJitsi();
        script.onerror = () => {
          setError("Failed to load secure video library. Please check your internet connection.");
          setLoading(false);
        };
        document.body.appendChild(script);
      } else if (window.JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        script.addEventListener("load", initJitsi);
      }

      return () => {
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      };
    } else {
      setLoading(false);
    }
  }, [roomName, session.provider, session.meetingUrl, currentUser]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[550px] w-full rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/live"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Live Hub</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-black uppercase text-red-500 tracking-wider">
              {session.status === "LIVE" ? "Live Interactive Class" : "Live Room"}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground truncate max-w-md hidden sm:inline-block">
            {session.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
            >
              <span>Open in {session.provider === "ZOOM" ? "Zoom App" : session.provider === "GOOGLE_MEET" ? "Google Meet" : "App"}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Room Body */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-0">
        {session.provider === "EMBEDDED_ROOM" || !session.meetingUrl ? (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white gap-3 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
                <p className="text-sm font-bold tracking-wide">Connecting to Secure Live Classroom...</p>
                <p className="text-xs text-zinc-400">Initializing 2-way WebRTC video & audio pipeline</p>
              </div>
            )}

            {error ? (
              <div className="p-8 text-center max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Radio className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{error}</h3>
                <p className="text-xs text-zinc-400 mb-6">
                  You can reload or join using the direct link if available.
                </p>
                {session.meetingUrl && (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                  >
                    <span>Launch External Meeting</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ) : (
              <div ref={containerRef} className="w-full h-full" />
            )}
          </>
        ) : (
          /* External Meeting Launcher (Zoom / Google Meet) */
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-primary/20 border border-amber-500/30 text-amber-400 shadow-xl">
              <Video className="h-10 w-10" />
            </div>

            <span className="mb-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
              {session.provider === "ZOOM" ? "Zoom Meeting" : "Google Meet Session"}
            </span>

            <h2 className="text-2xl font-black text-white mb-2">{session.title}</h2>
            {session.description && (
              <p className="text-xs text-zinc-300 mb-6 max-w-md line-clamp-3">{session.description}</p>
            )}

            {/* Meeting Credentials Box */}
            <div className="mb-6 w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 text-left space-y-2">
              {session.meetingId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Meeting ID:</span>
                  <span className="font-mono font-bold text-white select-all">{session.meetingId}</span>
                </div>
              )}
              {session.passcode && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Passcode:</span>
                  <span className="font-mono font-bold text-amber-400 select-all">{session.passcode}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
                <span className="text-zinc-400 font-medium">Host:</span>
                <span className="text-zinc-200 font-semibold">Rahul Trade Warrior</span>
              </div>
            </div>

            <a
              href={session.meetingUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-extrabold text-black shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition-all"
            >
              <span>Join {session.provider === "ZOOM" ? "Zoom Class Now" : "Google Meet Now"}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
