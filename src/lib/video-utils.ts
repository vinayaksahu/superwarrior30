/**
 * Video Utilities for LMS Lessons
 * Supports YouTube URLs, YouTube Shorts, Live replays, iframe embeds, Vimeo, and custom external links.
 */

export interface ParsedVideoInfo {
  isValid: boolean;
  embedUrl: string;
  provider: "YOUTUBE" | "EXTERNAL";
  videoId?: string;
  originalInput: string;
  errorMessage?: string;
}

/**
 * Extracts iframe src if an iframe tag was provided
 */
export function extractIframeSrc(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.startsWith("<iframe") || trimmed.includes("<iframe")) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extracts YouTube Video ID from any standard or embedded YouTube URL
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  let clean = input.trim();

  // If iframe string was pasted, extract src first
  const iframeSrc = extractIframeSrc(clean);
  if (iframeSrc) {
    clean = iframeSrc;
  }

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts start time parameter if present (e.g. t=120 or start=120)
 */
export function extractStartTime(url: string): number | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const t = parsed.searchParams.get("t") || parsed.searchParams.get("start");
    if (t) {
      const match = t.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  } catch {}
  return null;
}

/**
 * Parses any external video URL or embed code into a validated embeddable link
 */
export function parseExternalVideo(input: string): ParsedVideoInfo {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      embedUrl: "",
      provider: "EXTERNAL",
      originalInput: input || "",
      errorMessage: "URL cannot be empty.",
    };
  }

  const raw = input.trim();
  const iframeSrc = extractIframeSrc(raw);
  const targetUrl = iframeSrc || raw;

  // 1. YouTube check
  const ytId = extractYouTubeId(targetUrl);
  if (ytId) {
    const startTime = extractStartTime(targetUrl);
    let embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&fs=0`;
    if (startTime && startTime > 0) {
      embedUrl += `&start=${startTime}`;
    }
    return {
      isValid: true,
      embedUrl,
      provider: "YOUTUBE",
      videoId: ytId,
      originalInput: raw,
    };
  }

  // 2. Vimeo check
  const vimeoMatch = targetUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isValid: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      provider: "EXTERNAL",
      videoId: vimeoMatch[1],
      originalInput: raw,
    };
  }

  // 3. Generic HTTPS URL
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    return {
      isValid: true,
      embedUrl: targetUrl,
      provider: "EXTERNAL",
      originalInput: raw,
    };
  }

  return {
    isValid: false,
    embedUrl: "",
    provider: "EXTERNAL",
    originalInput: raw,
    errorMessage: "Please enter a valid YouTube link, embed code, or HTTP/HTTPS video URL.",
  };
}

/**
 * Checks if a stored video key or media provider represents an external/YouTube URL
 */
export function isExternalVideoUrl(urlOrKey?: string | null, provider?: string | null): boolean {
  if (!urlOrKey && !provider) return false;
  if (provider === "YOUTUBE" || provider === "EXTERNAL") return true;
  if (!urlOrKey) return false;

  const trimmed = urlOrKey.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.includes("youtube.com") ||
    trimmed.includes("youtu.be") ||
    trimmed.includes("<iframe")
  );
}
