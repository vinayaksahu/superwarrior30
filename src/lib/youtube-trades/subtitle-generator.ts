/**
 * Accurate Hindi/Hinglish Subtitle Generator (.srt)
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Generates standards-compliant SubRip (.srt) subtitle files from
 * transcript events and timestamps, relative-aligned to the trade clip window.
 */

import path from "path";
import fs from "fs";

export interface SubtitleEventInput {
  timestamp: number; // in seconds (absolute stream time)
  endTimestamp?: number | null;
  text: string;
  eventType?: string;
}

export interface GenerateSrtParams {
  events: SubtitleEventInput[];
  clipStart: number; // in seconds
  clipEnd?: number; // in seconds
  outputDir?: string;
  filename?: string;
}

export interface GenerateSrtResult {
  success: boolean;
  srtContent: string;
  filePath?: string;
  cueCount: number;
  error?: string;
}

/**
 * Formats seconds into SubRip timestamp: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = Math.floor(safeSeconds % 60);
  const ms = Math.floor((safeSeconds % 1) * 1000);

  const pad = (n: number, z: number = 2) => String(n).padStart(z, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * Formats transcript / trade events into relative .srt format.
 */
export function formatEventsToSrt(
  events: SubtitleEventInput[],
  clipStart: number,
  clipEnd?: number
): { srtContent: string; cueCount: number } {
  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Filter events within clip window
  const filtered = sorted.filter((e) => {
    if (clipEnd) {
      return e.timestamp >= clipStart && e.timestamp <= clipEnd;
    }
    return e.timestamp >= clipStart;
  });

  const lines: string[] = [];
  let cueIndex = 1;

  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i];
    const text = item.text.trim();
    if (!text) continue;

    // Relative start time
    const relStart = Math.max(0, item.timestamp - clipStart);

    // Relative end time (use endTimestamp if available, otherwise next event start, or +3.5s default)
    let relEnd: number;
    if (item.endTimestamp && item.endTimestamp > item.timestamp) {
      relEnd = Math.max(relStart + 1.0, item.endTimestamp - clipStart);
    } else if (i < filtered.length - 1) {
      const nextRel = Math.max(relStart + 1.0, filtered[i + 1].timestamp - clipStart);
      relEnd = Math.min(nextRel - 0.2, relStart + 4.0);
    } else {
      relEnd = relStart + 3.5;
    }

    if (relEnd <= relStart) {
      relEnd = relStart + 2.0;
    }

    lines.push(String(cueIndex));
    lines.push(`${formatSrtTimestamp(relStart)} --> ${formatSrtTimestamp(relEnd)}`);
    lines.push(text);
    lines.push(""); // empty separator line

    cueIndex++;
  }

  // If no events matched, provide a fallback branding cue
  if (cueIndex === 1) {
    lines.push("1");
    lines.push("00:00:00,500 --> 00:00:04,500");
    lines.push("Rahul Trade Warrior Academy - Live Trade Breakdown");
    lines.push("");
    cueIndex++;
  }

  return {
    srtContent: lines.join("\n"),
    cueCount: cueIndex - 1,
  };
}

/**
 * Generates and saves an .srt file to disk.
 */
export async function generateSrtFile(
  params: GenerateSrtParams
): Promise<GenerateSrtResult> {
  const {
    events,
    clipStart,
    clipEnd,
    outputDir = path.join(process.cwd(), "tmp", "trade_clips", "subtitles"),
    filename = "trade_subtitles.srt",
  } = params;

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const { srtContent, cueCount } = formatEventsToSrt(events, clipStart, clipEnd);
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, srtContent, "utf-8");

    return {
      success: true,
      srtContent,
      filePath,
      cueCount,
    };
  } catch (error: any) {
    console.error("[SubtitleGenerator] Error:", error);
    return {
      success: false,
      srtContent: "",
      cueCount: 0,
      error: error?.message || "Failed to generate subtitle file",
    };
  }
}
