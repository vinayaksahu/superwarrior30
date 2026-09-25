/**
 * YouTube Transcript Extraction Engine
 * Tier 1: YouTube Captions/Subtitles (TimedText API) - Hindi, English, Hinglish
 * Tier 2: Whisper / faster-whisper local worker fallback
 */

import { extractYouTubeVideoId } from "./youtube-metadata";

export interface TranscriptSegment {
  start: number; // in seconds
  end: number;   // in seconds
  duration: number; // in seconds
  text: string;
}

export interface ExtractedTranscript {
  videoId: string;
  language: string;
  source: "YOUTUBE_CAPTIONS" | "WHISPER_FALLBACK" | "SAMPLE_REPRESENTATION";
  fullText: string;
  segments: TranscriptSegment[];
  totalDuration: number;
}

/**
 * Decodes standard XML/HTML entities common in YouTube timedtext feeds.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats seconds into HH:MM:SS
 */
export function formatTimeCode(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Parses YouTube TimedText XML format:
 * <transcript>
 *   <text start="12.4" dur="2.1">hello world</text>
 * </transcript>
 */
export function parseTimedTextXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1] || "0");
    const duration = parseFloat(match[2] || "0");
    const rawText = match[3] || "";
    const cleanText = decodeHtmlEntities(rawText);

    if (cleanText) {
      segments.push({
        start: Math.round(start * 100) / 100,
        end: Math.round((start + duration) * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        text: cleanText,
      });
    }
  }

  return segments;
}

/**
 * Parses YouTube TimedText JSON3 format:
 * { "events": [ { "tStartMs": 12400, "dDurationMs": 2100, "segs": [ { "utf8": "hello" } ] } ] }
 */
export function parseTimedTextJson3(json: any): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  if (!json || !Array.isArray(json.events)) return segments;

  for (const ev of json.events) {
    if (!ev.segs || !Array.isArray(ev.segs)) continue;

    const start = (ev.tStartMs || 0) / 1000;
    const duration = (ev.dDurationMs || 0) / 1000;
    const rawText = ev.segs.map((s: any) => s.utf8 || "").join("");
    const cleanText = decodeHtmlEntities(rawText);

    if (cleanText && cleanText !== "\n") {
      segments.push({
        start: Math.round(start * 100) / 100,
        end: Math.round((start + duration) * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        text: cleanText,
      });
    }
  }

  return segments;
}

/**
 * Tier 1: Extracts YouTube captions directly from the YouTube TimedText API.
 * Supports Hindi, English, and Hinglish auto-generated or manual tracks.
 */
export async function extractYouTubeCaptions(
  videoIdOrUrl: string,
  preferredLangs = ["hi", "en", "en-IN"]
): Promise<ExtractedTranscript | null> {
  const videoId = extractYouTubeVideoId(videoIdOrUrl);
  if (!videoId) {
    throw new Error(`Invalid video ID: ${videoIdOrUrl}`);
  }

  try {
    // 1. Fetch the video watch page with multi-language header
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`Failed to load YouTube watch page: ${res.status}`);
      return null;
    }

    const html = await res.text();

    // 2. Extract captionTracks metadata from ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/);
    let captionTracks: any[] = [];

    if (playerResponseMatch && playerResponseMatch[1]) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        captionTracks =
          playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      } catch (err) {
        console.warn("Failed to parse ytInitialPlayerResponse JSON:", err);
      }
    }

    // Fallback regex scan for captionTracks if JSON parsing failed
    if (captionTracks.length === 0) {
      const fallbackMatch = html.match(/"captionTracks":\s*(\[.+?\])/);
      if (fallbackMatch && fallbackMatch[1]) {
        try {
          captionTracks = JSON.parse(fallbackMatch[1]);
        } catch {
          // ignore
        }
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      console.warn(`No YouTube caption tracks found for video ${videoId}`);
      return null;
    }

    // 3. Select best caption track (matching preferred languages: Hindi first, then English)
    let selectedTrack: any = null;

    for (const lang of preferredLangs) {
      selectedTrack = captionTracks.find((t: any) =>
        t.languageCode?.toLowerCase().startsWith(lang.toLowerCase())
      );
      if (selectedTrack) break;
    }

    // If none matched preferred, use first available track
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    const baseUrl = selectedTrack.baseUrl;
    const lang = selectedTrack.languageCode || "en";

    // 4. Fetch timedtext content (XML format first, JSON3 fallback)
    const timedTextRes = await fetch(baseUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
    });

    if (!timedTextRes.ok) {
      console.warn(`TimedText fetch failed with status ${timedTextRes.status}`);
      return null;
    }

    const timedTextXml = await timedTextRes.text();
    let segments = parseTimedTextXml(timedTextXml);

    // If XML parsing returned 0, try requesting JSON3
    if (segments.length === 0 && !baseUrl.includes("&fmt=json3")) {
      const jsonRes = await fetch(`${baseUrl}&fmt=json3`);
      if (jsonRes.ok) {
        const json = await jsonRes.json();
        segments = parseTimedTextJson3(json);
      }
    }

    if (segments.length === 0) {
      return null;
    }

    const fullText = segments.map((s) => s.text).join(" ");
    const totalDuration = segments[segments.length - 1].end;

    return {
      videoId,
      language: lang,
      source: "YOUTUBE_CAPTIONS",
      fullText,
      segments,
      totalDuration,
    };
  } catch (err: any) {
    console.error(`Error in extractYouTubeCaptions for ${videoId}:`, err);
    return null;
  }
}

/**
 * Builds formatted timestamped transcript string for AI analysis or user inspection:
 * [00:13:32] Asian session low liquidity swept aggressively
 */
export function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${formatTimeCode(s.start)}] ${s.text}`)
    .join("\n");
}
