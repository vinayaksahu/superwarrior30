/**
 * Selective Video Segment Downloader
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Invokes the Python segment downloader worker to selectively download
 * only the 5-10 minute trade window using yt-dlp's `--download-sections`
 * or generates synthetic fallback segments for testing and offline environments.
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SegmentDownloadParams {
  streamUrl: string;
  streamId: string;
  candidateId: string;
  clipStart: number; // in seconds
  clipEnd: number; // in seconds
  outputDir?: string;
  forceMock?: boolean;
}

export interface SegmentDownloadResult {
  success: boolean;
  filePath?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  method?: "YT_DLP_SECTIONS" | "SYNTHETIC_MOCK" | "SYNTHETIC_FALLBACK";
  error?: string;
}

/**
 * Downloads only the selected trade segment from the YouTube stream.
 */
export async function downloadTradeSegment(
  params: SegmentDownloadParams
): Promise<SegmentDownloadResult> {
  const {
    streamUrl,
    streamId,
    candidateId,
    clipStart,
    clipEnd,
    outputDir = path.join(process.cwd(), "tmp", "trade_clips", "segments"),
    forceMock = false,
  } = params;

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `trade_${streamId}_${candidateId}.mp4`;
    const outputPath = path.join(outputDir, filename);

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "trade_worker",
      "segment_downloader.py"
    );

    const args = [
      scriptPath,
      "--start",
      String(clipStart),
      "--end",
      String(clipEnd),
      "--output",
      outputPath,
    ];

    if (forceMock) {
      args.push("--mock-generate");
    } else {
      args.push("--url", streamUrl);
    }

    let stdoutText = "";
    try {
      const res = await execFileAsync("python", args, {
        timeout: 60000,
      });
      stdoutText = res.stdout;
      if (res.stderr && res.stderr.trim().length > 0) {
        console.warn("[SegmentDownloader] Worker stderr:", res.stderr);
      }
    } catch (execErr: any) {
      if (execErr.stdout) {
        stdoutText = execErr.stdout;
      } else {
        throw execErr;
      }
    }

    // Parse worker JSON output
    const cleanOutput = stdoutText.trim();
    const lastLine = cleanOutput.split("\n").filter(Boolean).pop() || "{}";
    const parsed = JSON.parse(lastLine);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error || "Unknown segment download error",
      };
    }

    return {
      success: true,
      filePath: parsed.filePath,
      durationSec: parsed.durationSec,
      fileSizeBytes: parsed.fileSizeBytes,
      method: parsed.method,
    };
  } catch (error: any) {
    console.error("[SegmentDownloader] Execution error:", error);
    return {
      success: false,
      error: error?.message || "Execution of segment downloader worker failed",
    };
  }
}
