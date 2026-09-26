/**
 * YouTube Transcript Extraction Engine
 * Tier 1: YouTube Captions/Subtitles (TimedText API) - Hindi, English, Hinglish
 * Tier 2: Whisper / faster-whisper local worker fallback
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { extractYouTubeVideoId } from "./youtube-metadata";

const execFileAsync = promisify(execFile);

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
 * Parses WebVTT (.vtt) format into structured timestamped transcript segments.
 */
export function parseVtt(vttContent: string): TranscriptSegment[] {
  const lines = vttContent.split(/\r?\n/);
  const segments: TranscriptSegment[] = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(timeRegex);

    if (match) {
      if (currentText.length > 0) {
        const text = currentText.join(" ").replace(/<[^>]+>/g, "").trim();
        if (text && !text.startsWith("[") && !text.includes("गला साफ़")) {
          segments.push({
            start: currentStart,
            end: currentEnd,
            duration: Math.max(0.5, Math.round((currentEnd - currentStart) * 100) / 100),
            text,
          });
        }
        currentText = [];
      }

      const h1 = parseInt(match[1]), m1 = parseInt(match[2]), s1 = parseInt(match[3]), ms1 = parseInt(match[4]);
      const h2 = parseInt(match[5]), m2 = parseInt(match[6]), s2 = parseInt(match[7]), ms2 = parseInt(match[8]);
      currentStart = h1 * 3600 + m1 * 60 + s1 + ms1 / 1000;
      currentEnd = h2 * 3600 + m2 * 60 + s2 + ms2 / 1000;
    } else if (line && !line.startsWith("WEBVTT") && !line.startsWith("Kind:") && !line.startsWith("Language:") && !line.startsWith("Region:")) {
      currentText.push(line);
    }
  }

  if (currentText.length > 0) {
    const text = currentText.join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) {
      segments.push({
        start: currentStart,
        end: currentEnd,
        duration: Math.max(0.5, Math.round((currentEnd - currentStart) * 100) / 100),
        text,
      });
    }
  }

  return segments;
}

/**
 * Downloads auto-subtitles directly using yt-dlp CLI without downloading any video.
 * Extremely fast (1-4 seconds) and reliable when direct TimedText HTTP is blocked or rate-limited.
 */
export async function extractSubtitlesViaYtDlp(videoId: string): Promise<TranscriptSegment[]> {
  const tmpDir = path.resolve(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const prefix = path.join(tmpDir, `sub_${videoId}_${Date.now()}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    await execFileAsync("python", [
      "-m",
      "yt_dlp",
      "--write-auto-subs",
      "--sub-lang",
      "hi,hi-orig,en",
      "--sub-format",
      "vtt",
      "--skip-download",
      url,
      "-o",
      prefix,
    ]);
  } catch {
    // Ignore minor exit codes (e.g. if one secondary language returned 429)
  }

  // Find generated .vtt files
  const priorityExts = [".hi.vtt", ".hi-orig.vtt", ".en.vtt"];
  let chosenFile: string | null = null;

  for (const ext of priorityExts) {
    const candidate = `${prefix}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
      chosenFile = candidate;
      break;
    }
  }

  if (!chosenFile) {
    try {
      const files = fs.readdirSync(tmpDir);
      const match = files.find((f) => f.startsWith(path.basename(prefix)) && f.endsWith(".vtt"));
      if (match) chosenFile = path.join(tmpDir, match);
    } catch {}
  }

  if (!chosenFile) return [];

  try {
    const content = fs.readFileSync(chosenFile, "utf-8");
    const segments = parseVtt(content);

    // Clean up temporary files
    try {
      const basePrefix = path.basename(prefix);
      const files = fs.readdirSync(tmpDir);
      for (const f of files) {
        if (f.startsWith(basePrefix)) {
          fs.unlinkSync(path.join(tmpDir, f));
        }
      }
    } catch {}

    return segments;
  } catch (err) {
    console.warn(`Error parsing yt-dlp subtitle file for ${videoId}:`, err);
    return [];
  }
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

    let captionTracks: any[] = [];

    if (res.ok) {
      const html = await res.text();

      // 2. Extract captionTracks metadata from ytInitialPlayerResponse
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/);

      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          captionTracks =
            playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        } catch {
          // ignore
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
    }

    let segments: TranscriptSegment[] = [];
    let selectedLang = "hi";

    if (captionTracks && captionTracks.length > 0) {
      // 3. Select best caption track (matching preferred languages: Hindi first, then English)
      let selectedTrack: any = null;

      for (const lang of preferredLangs) {
        selectedTrack = captionTracks.find((t: any) =>
          t.languageCode?.toLowerCase().startsWith(lang.toLowerCase())
        );
        if (selectedTrack) break;
      }

      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }

      const baseUrl = selectedTrack.baseUrl;
      selectedLang = selectedTrack.languageCode || "hi";

      // 4. Fetch timedtext content (XML format first, JSON3 fallback)
      try {
        const timedTextRes = await fetch(baseUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
        });

        if (timedTextRes.ok) {
          const timedTextXml = await timedTextRes.text();
          if (timedTextXml && timedTextXml.trim().length > 0) {
            segments = parseTimedTextXml(timedTextXml);

            // If XML parsing returned 0, try requesting JSON3
            if (segments.length === 0 && !baseUrl.includes("&fmt=json3")) {
              try {
                const jsonRes = await fetch(`${baseUrl}&fmt=json3`);
                if (jsonRes.ok) {
                  const rawJson = await jsonRes.text();
                  if (rawJson && rawJson.trim().length > 0) {
                    segments = parseTimedTextJson3(JSON.parse(rawJson));
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // Direct fetch failed
      }
    }

    // 5. High-reliability fallback: If direct timedtext HTTP returned 0 segments, use yt-dlp auto-subs
    if (segments.length === 0) {
      try {
        const ytdlpSegments = await extractSubtitlesViaYtDlp(videoId);
        if (ytdlpSegments && ytdlpSegments.length > 0) {
          segments = ytdlpSegments;
          selectedLang = "hi";
        }
      } catch (ytdlpErr) {
        console.warn(`yt-dlp auto-sub extraction failed for ${videoId}:`, ytdlpErr);
      }
    }

    if (segments.length === 0) {
      return null;
    }

    const fullText = segments.map((s) => s.text).join(" ");
    const totalDuration = segments[segments.length - 1].end;

    return {
      videoId,
      language: selectedLang,
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
