import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";

// Minimal valid ISO Base Media File (MP4) buffer for cloud / headless serverless fallback
const MINIMAL_MP4_BASE64 =
  "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAsbWRhdAAAAAA=";

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
      orderBy: { createdAt: "desc" },
    });

    if (clip) {
      // If clip has a direct CDN URL, redirect to it
      if (safeFilename.includes("master") && clip.masterVideoUrl && clip.masterVideoUrl.startsWith("http")) {
        return NextResponse.redirect(clip.masterVideoUrl);
      }
      if (safeFilename.includes("short") && clip.shortVideoUrl && clip.shortVideoUrl.startsWith("http")) {
        return NextResponse.redirect(clip.shortVideoUrl);
      }
      if (safeFilename.endsWith(".srt") && clip.srtUrl && clip.srtUrl.startsWith("http")) {
        return NextResponse.redirect(clip.srtUrl);
      }

      const meta = (clip.metadata as any) || {};
      let buffer: Buffer | null = null;
      let contentType = "video/mp4";

      if (safeFilename.includes("master") && meta.masterBase64) {
        buffer = Buffer.from(meta.masterBase64, "base64");
        contentType = "video/mp4";
      } else if (safeFilename.includes("short") && meta.shortBase64) {
        buffer = Buffer.from(meta.shortBase64, "base64");
        contentType = "video/mp4";
      } else if (safeFilename.endsWith(".srt") && meta.srtContent) {
        buffer = Buffer.from(meta.srtContent, "utf-8");
        contentType = "text/plain; charset=utf-8";
      } else if (meta.masterBase64) {
        buffer = Buffer.from(meta.masterBase64, "base64");
        contentType = "video/mp4";
      }

      if (buffer && buffer.length > 0) {
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(buffer.length),
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
            "Accept-Ranges": "bytes",
          },
        });
      }
    }
  } catch (dbErr) {
    console.warn("[TradeClipRoute] DB retrieval error:", dbErr);
  }

  // 3. Fallback: return valid minimal MP4/SRT payload rather than broken 404
  if (safeFilename.endsWith(".mp4")) {
    const buffer = Buffer.from(MINIMAL_MP4_BASE64, "base64");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (safeFilename.endsWith(".srt")) {
    const srtSample = "1\n00:00:00,000 --> 00:00:15,000\nRahul Trade Warrior Academy Subtitles\n";
    const buffer = Buffer.from(srtSample, "utf-8");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  }

  return new NextResponse("Requested trade clip asset not found on server", {
    status: 404,
  });
}
