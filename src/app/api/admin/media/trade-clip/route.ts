import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * GET /api/admin/media/trade-clip?streamId=...&filename=...
 * Streams trade clips (Master MP4, Vertical Short, Subtitles)
 * directly from persistent storage or serverless writable /tmp cache.
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

  // Candidate locations in priority order
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

  if (!targetPath) {
    return new NextResponse("Requested trade clip asset not found on server", {
      status: 404,
    });
  }

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

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      "Accept-Ranges": "bytes",
    },
  });
}
