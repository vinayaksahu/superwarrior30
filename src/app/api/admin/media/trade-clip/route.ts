import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";


/**
 * GET /api/admin/media/trade-clip?streamId=...&filename=...
 * Streams trade clips (Master MP4, Vertical Short, Subtitles)
 * directly from persistent storage, database base64 payload, or serverless cache.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get("streamId");
  const filename = searchParams.get("filename");

  if (!streamId || !filename) {
    return new NextResponse("Missing required query parameters: streamId, filename", {
      status: 400,
    });
  }

  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const safeStreamId = path.basename(streamId);

  // 1. Check local disk candidate locations (if running on same instance / VPS)
  const candidates = [
    path.join(process.cwd(), "public", "uploads", "trade_clips", safeStreamId, safeFilename),
    path.join(os.tmpdir(), "trade_clips", "public", safeStreamId, safeFilename),
    path.join(os.tmpdir(), "trade_clips", "masters", safeFilename),
    path.join(os.tmpdir(), "trade_clips", "shorts", safeFilename),
    path.join(os.tmpdir(), "trade_clips", "subtitles", safeFilename),
    path.join(os.tmpdir(), "trade_clips", "segments", safeFilename),
  ];

  let targetPath: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      targetPath = candidate;
      break;
    }
  }

  if (targetPath) {
    const stat = fs.statSync(targetPath);
    const ext = path.extname(targetPath).toLowerCase();

    const contentType =
      ext === ".srt"
        ? "text/plain; charset=utf-8"
        : ext === ".json"
        ? "application/json"
        : ext === ".mp4"
        ? "video/mp4"
        : "application/octet-stream";

    const fileBuffer = fs.readFileSync(targetPath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        "Accept-Ranges": "bytes",
      },
    });
  }

  // 2. Cross-Instance Serverless Fallback: Retrieve from shared database (PostgreSQL)
  try {
    const clip = await prisma.tradeClip.findFirst({
      where: {
        trade: { streamId: safeStreamId },
      },
      include: {
        trade: {
          select: {
            clipStart: true,
            stream: {
              select: {
                youtubeVideoId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (clip) {
      // If clip has a direct CDN URL, redirect directly to Bunny CDN
      if (safeFilename.includes("master") && clip.masterVideoUrl && clip.masterVideoUrl.startsWith("http")) {
        return NextResponse.redirect(clip.masterVideoUrl);
      }
      if (safeFilename.includes("short") && clip.shortVideoUrl && clip.shortVideoUrl.startsWith("http")) {
        return NextResponse.redirect(clip.shortVideoUrl);
      }
      if (safeFilename.endsWith(".srt") && clip.srtUrl && clip.srtUrl.startsWith("http")) {
        return NextResponse.redirect(clip.srtUrl);
      }
    }
  } catch (dbErr) {
    console.warn("[TradeClipRoute] DB retrieval error:", dbErr);
  }

  // 3. If file not found, return 404 with diagnostic details instead of corrupt 52-byte file
  return new NextResponse(
    JSON.stringify({
      error: "Video clip asset not found or still rendering on Bunny Storage.",
      streamId: safeStreamId,
      filename: safeFilename,
      tip: "You can preview and watch the high-definition clip directly via the YouTube livestream player at the exact trade timestamp.",
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
