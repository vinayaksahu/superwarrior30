/**
 * Dry-Run Trade Analysis Engine
 * Simulates the entire Trade Analysis and Story Reconstruction pipeline
 * without writing or mutating any production database records.
 */

import { fetchYouTubeMetadata, extractYouTubeVideoId } from "./youtube-metadata";
import {
  extractYouTubeCaptions,
  TranscriptSegment,
  formatTimeCode,
} from "./transcript-extractor";
import {
  extractTradeEventsFromSegments,
  ClassifiedEvent,
} from "./terminology";
import {
  reconstructTradeCandidates,
  ReconstructedTradeCandidate,
} from "./state-machine";

export interface DryRunDiagnosticReport {
  streamMetadata: {
    videoId: string;
    title: string;
    channel: string;
    duration: number;
  };
  transcriptStats: {
    source: string;
    segmentsCount: number;
    language: string;
    totalDuration: number;
  };
  eventStats: {
    totalEvents: number;
    byCategory: Record<string, number>;
  };
  allCandidates: ReconstructedTradeCandidate[];
  actualTrades: ReconstructedTradeCandidate[];
  hypotheticalSetups: ReconstructedTradeCandidate[];
  averageCompleteness: number;
  recommendedClips: {
    tradeNumber: number;
    instrument: string;
    direction: string;
    clipStart: number;
    clipEnd: number;
    clipWindowFormatted: string;
    durationSec: number;
    isActual: boolean;
  }[];
  diagnostics: string[];
}

export interface RunDryRunOptions {
  urlOrVideoId?: string;
  segments?: TranscriptSegment[];
  mockMetadata?: {
    title?: string;
    channel?: string;
    duration?: number;
  };
}

/**
 * Runs a complete dry-run analysis on a YouTube stream or raw transcript segments.
 */
export async function runDryRunTradeAnalysis(
  options: RunDryRunOptions
): Promise<DryRunDiagnosticReport> {
  const diagnostics: string[] = [];

  // 1. Resolve Metadata
  let videoId = "unknown";
  let title = options.mockMetadata?.title || "Live Stream";
  let channel = options.mockMetadata?.channel || "Rahul Trade Warrior Academy";
  let duration = options.mockMetadata?.duration || 0;

  if (options.urlOrVideoId) {
    const extractedId = extractYouTubeVideoId(options.urlOrVideoId);
    if (extractedId) videoId = extractedId;

    try {
      const meta = await fetchYouTubeMetadata(options.urlOrVideoId);
      if (meta) {
        title = meta.title || title;
        channel = meta.channel || channel;
        duration = meta.duration > 0 ? meta.duration : duration;
        diagnostics.push(`Metadata resolved: "${title}" by ${channel} (${duration}s)`);
      }
    } catch {
      diagnostics.push("Could not fetch remote YouTube metadata; using defaults.");
    }
  }

  // 2. Resolve Transcript Segments
  let segments: TranscriptSegment[] = options.segments || [];
  let transcriptSource = segments.length > 0 ? "PROVIDED_SEGMENTS" : "NONE";
  let transcriptLanguage = "hi";
  let transcriptDuration = duration;

  if (segments.length === 0 && options.urlOrVideoId) {
    try {
      diagnostics.push("Attempting to extract YouTube captions via TimedText API...");
      const extracted = await extractYouTubeCaptions(options.urlOrVideoId);
      if (extracted && extracted.segments.length > 0) {
        segments = extracted.segments;
        transcriptSource = extracted.source;
        transcriptLanguage = extracted.language;
        transcriptDuration = extracted.totalDuration;
        diagnostics.push(
          `Extracted ${segments.length} caption segments in ${transcriptLanguage} (${transcriptSource})`
        );
      } else {
        diagnostics.push("No official YouTube captions found for this stream.");
      }
    } catch (err: any) {
      diagnostics.push(`Caption extraction error: ${err.message}`);
    }
  }

  // 3. Terminology & Event Extraction (Phase 5)
  const classifiedEvents: ClassifiedEvent[] = extractTradeEventsFromSegments(segments);
  const byCategory: Record<string, number> = {};
  for (const ev of classifiedEvents) {
    byCategory[ev.category] = (byCategory[ev.category] || 0) + 1;
  }
  diagnostics.push(
    `Classified ${classifiedEvents.length} trade events across ${Object.keys(byCategory).length} categories.`
  );

  // 4. State Machine Reconstruction (Phase 6)
  const allCandidates = reconstructTradeCandidates(classifiedEvents, false);
  const actualTrades = allCandidates.filter((c) => c.isActualTrade);
  const hypotheticalSetups = allCandidates.filter((c) => !c.isActualTrade);

  diagnostics.push(
    `Reconstructed ${allCandidates.length} total trade candidate(s): ${actualTrades.length} actual executed trade(s) and ${hypotheticalSetups.length} hypothetical setup(s).`
  );

  // 5. Compute Completeness & Clip Recommendations
  let totalCompleteness = 0;
  const recommendedClips: DryRunDiagnosticReport["recommendedClips"] = [];

  for (const c of allCandidates) {
    totalCompleteness += c.completenessScore;
    const durSec = Math.max(0, c.clipEnd - c.clipStart);

    recommendedClips.push({
      tradeNumber: c.tradeNumber,
      instrument: c.instrument,
      direction: c.direction,
      clipStart: c.clipStart,
      clipEnd: c.clipEnd,
      clipWindowFormatted: `${formatTimeCode(c.clipStart)} → ${formatTimeCode(c.clipEnd)}`,
      durationSec: durSec,
      isActual: c.isActualTrade,
    });

    if (c.isActualTrade) {
      diagnostics.push(
        `Trade #${c.tradeNumber} [${c.instrument} ${c.direction}]: ${c.result} | Completeness: ${Math.round(c.completenessScore * 100)}% | Clip: ${formatTimeCode(c.clipStart)} - ${formatTimeCode(c.clipEnd)} (${durSec}s)`
      );
    } else {
      diagnostics.push(
        `Trade #${c.tradeNumber} [${c.instrument} ${c.direction}]: Unexecuted setup (No entry statement detected) | Completeness: ${Math.round(c.completenessScore * 100)}%`
      );
    }
  }

  const averageCompleteness =
    allCandidates.length > 0
      ? Math.round((totalCompleteness / allCandidates.length) * 100) / 100
      : 0;

  return {
    streamMetadata: {
      videoId,
      title,
      channel,
      duration,
    },
    transcriptStats: {
      source: transcriptSource,
      segmentsCount: segments.length,
      language: transcriptLanguage,
      totalDuration: transcriptDuration,
    },
    eventStats: {
      totalEvents: classifiedEvents.length,
      byCategory,
    },
    allCandidates,
    actualTrades,
    hypotheticalSetups,
    averageCompleteness,
    recommendedClips,
    diagnostics,
  };
}
