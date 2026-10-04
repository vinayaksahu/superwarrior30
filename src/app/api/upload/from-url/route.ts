import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import crypto from "crypto";
import { getResolvedBunnyConfig, uploadToBunnyStorage } from "@/lib/bunny";

/**
 * Validates that an IP / host is not an internal or loopback address (SSRF Defense).
 */
function isSafeUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "169.254.169.254"
    ) {
      return false;
    }
    // Block common private IPv4 ranges
    if (
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves TradingView snapshot /x/ URL to direct image URL.
 */
async function resolveTradingViewImageUrl(rawUrl: string): Promise<{ imageUrl: string; title: string }> {
  const urlObj = new URL(rawUrl);
  const host = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname;

  // TradingView /x/ snapshot link (e.g., https://www.tradingview.com/x/K8k4J9lm/ or https://tradingview.com/x/K8k4J9lm/)
  const match = path.match(/\/x\/([a-zA-Z0-9_-]+)/);
  if (host.includes("tradingview.com") && match && match[1]) {
    const snapshotId = match[1];
    const firstChar = snapshotId.charAt(0).toLowerCase();
    const fallbackS3 = `https://s3.tradingview.com/snapshots/${firstChar}/${snapshotId.toLowerCase()}.png`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const htmlRes = await fetch(rawUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeoutId);

      if (htmlRes.ok) {
        const text = await htmlRes.text();
        // Look for og:image or twitter:image
        const ogMatch =
          text.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
          text.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
          text.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);

        if (ogMatch && ogMatch[1] && ogMatch[1].startsWith("http")) {
          return {
            imageUrl: ogMatch[1],
            title: `TradingView Chart (${snapshotId})`,
          };
        }
      }
    } catch {
      // Fallback to standard S3 format if scraping fails
    }

    return {
      imageUrl: fallbackS3,
      title: `TradingView Chart (${snapshotId})`,
    };
  }

  // Direct S3 tradingview image or other direct link
  if (host.includes("tradingview.com")) {
    return {
      imageUrl: rawUrl,
      title: "TradingView Chart",
    };
  }

  return {
    imageUrl: rawUrl,
    title: "Chart Screenshot (URL)",
  };
}

/**
 * POST /api/upload/from-url
 *
 * Downloads chart screenshot from URL (TradingView share link or direct image link),
 * verifies image magic bytes, and uploads directly to Bunny CDN Storage.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to upload files." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawUrl = (body.url || "").trim();
    const category = (body.category || "homework").toLowerCase().trim();

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid chart link or TradingView URL." },
        { status: 400 }
      );
    }

    if (!isSafeUrl(rawUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid URL provided. Please provide a public TradingView or chart link." },
        { status: 400 }
      );
    }

    // Check if this is a TradingView URL
    const isTradingViewHost = rawUrl.toLowerCase().includes("tradingview.com");
    const chartMatch = rawUrl.match(/\/chart\/([a-zA-Z0-9_-]+)/i);

    // If it's a TradingView interactive chart layout (e.g. https://www.tradingview.com/chart/2e8KHmxR/)
    if (isTradingViewHost && chartMatch && chartMatch[1]) {
      const chartId = chartMatch[1];
      return NextResponse.json({
        success: true,
        url: rawUrl,
        key: null,
        originalFilename: `TradingView Chart (${chartId})`,
        fileSize: 0,
        mimeType: "application/x-tradingview-chart",
        provider: "TRADINGVIEW",
        sourceUrl: rawUrl,
        message: "TradingView interactive chart link attached successfully!",
      });
    }

    // 1. Resolve tradingview snapshot / image URL
    const { imageUrl, title } = await resolveTradingViewImageUrl(rawUrl);

    // 2. Fetch the image bytes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let imageRes: Response;
    try {
      imageRes = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (isTradingViewHost) {
        return NextResponse.json({
          success: true,
          url: rawUrl,
          key: null,
          originalFilename: title || "TradingView Chart",
          fileSize: 0,
          mimeType: "application/x-tradingview-chart",
          provider: "TRADINGVIEW",
          sourceUrl: rawUrl,
          message: "TradingView chart link attached successfully!",
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to the chart URL. Please check the link and try again.",
        },
        { status: 400 }
      );
    }
    clearTimeout(timeoutId);

    if (!imageRes.ok) {
      if (isTradingViewHost) {
        return NextResponse.json({
          success: true,
          url: rawUrl,
          key: null,
          originalFilename: title || "TradingView Chart",
          fileSize: 0,
          mimeType: "application/x-tradingview-chart",
          provider: "TRADINGVIEW",
          sourceUrl: rawUrl,
          message: "TradingView chart link attached successfully!",
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: `Could not fetch image from link (HTTP ${imageRes.status}). Please make sure the link is public and active.`,
        },
        { status: 400 }
      );
    }

    const contentType = imageRes.headers.get("content-type") || "image/png";
    const bytes = await imageRes.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. File Size Validation (Max 15MB)
    if (buffer.length === 0) {
      if (isTradingViewHost) {
        return NextResponse.json({
          success: true,
          url: rawUrl,
          key: null,
          originalFilename: title || "TradingView Chart",
          fileSize: 0,
          mimeType: "application/x-tradingview-chart",
          provider: "TRADINGVIEW",
          sourceUrl: rawUrl,
          message: "TradingView chart link attached successfully!",
        });
      }
      return NextResponse.json(
        { success: false, error: "The provided link returned an empty response." },
        { status: 400 }
      );
    }
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "The chart image exceeds the maximum 15MB limit." },
        { status: 400 }
      );
    }

    // 4. Magic Bytes Validation
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp =
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";

    if (!isPng && !isJpg && !isWebp) {
      // If it's a TradingView URL that didn't resolve to a direct static image, keep it as an interactive chart link!
      if (isTradingViewHost) {
        return NextResponse.json({
          success: true,
          url: rawUrl,
          key: null,
          originalFilename: title || "TradingView Chart",
          fileSize: 0,
          mimeType: "application/x-tradingview-chart",
          provider: "TRADINGVIEW",
          sourceUrl: rawUrl,
          message: "TradingView chart link attached successfully!",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "The link does not point to a valid chart image (must be PNG, JPG, or WEBP). Make sure you copied the TradingView chart link (e.g. https://www.tradingview.com/chart/... or https://www.tradingview.com/x/...)",
        },
        { status: 400 }
      );
    }

    const ext = isPng ? "png" : isWebp ? "webp" : "jpg";
    const mime = isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";

    // 5. Upload directly to Bunny Storage
    const bunnyConfig = await getResolvedBunnyConfig();
    const isBunnyActive = Boolean(
      bunnyConfig.storageZoneName && bunnyConfig.storagePassword && bunnyConfig.cdnHostname
    );

    const uniqueId = crypto.randomUUID();
    const storagePath = `homework/${user.id}/${uniqueId}.${ext}`;

    if (isBunnyActive) {
      const result = await uploadToBunnyStorage(storagePath, buffer, mime);
      return NextResponse.json({
        success: true,
        key: storagePath,
        url: result.cdnUrl,
        cdnUrl: result.cdnUrl,
        originalFilename: title,
        fileSize: buffer.length,
        mimeType: mime,
        provider: "BUNNY",
        sourceUrl: rawUrl,
        message: "TradingView chart imported and saved to Bunny CDN!",
      });
    }

    // Fallback: Local filesystem storage under public/uploads
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "public", "uploads", category);
      await fs.mkdir(uploadsDir, { recursive: true });
      const localFilename = `${uniqueId}.${ext}`;
      const localFilePath = path.join(uploadsDir, localFilename);
      await fs.writeFile(localFilePath, buffer);
      const publicUrl = `/uploads/${category}/${localFilename}`;

      return NextResponse.json({
        success: true,
        key: `uploads/${category}/${localFilename}`,
        url: publicUrl,
        cdnUrl: publicUrl,
        originalFilename: title,
        fileSize: buffer.length,
        mimeType: mime,
        provider: "LOCAL",
        sourceUrl: rawUrl,
        message: "Chart imported successfully!",
      });
    } catch (fsErr) {
      console.warn("Local storage fallback notice:", fsErr);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Media Storage is not configured. Please complete Bunny CDN setup in Admin Settings.",
      },
      { status: 503 }
    );
  } catch (error: unknown) {
    console.error("Upload from URL error:", error);
    const msg = error instanceof Error ? error.message : "Failed to import chart from link";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
