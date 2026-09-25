/**
 * 9:16 Vertical Short Generator
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Invokes the Python worker to composite a 16:9 master trade clip
 * into a viral 9:16 vertical short (1080x1920) with blurred backdrop stacking
 * and high-contrast callout cards.
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface GenerateVerticalShortParams {
  inputPath: string;
  outputPath?: string;
  tradeId: string;
  streamId: string;
  instrument?: string;
  direction?: string;
  plannedRR?: string;
  resultText?: string;
  tradeNumber?: number;
  academyName?: string;
  mockBase?: boolean;
}

export interface GenerateVerticalShortResult {
  success: boolean;
  filePath?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  format?: string;
  resolution?: string;
  error?: string;
}

/**
 * Composites a 9:16 vertical short from an existing trade video.
 */
export async function generateVerticalShort(
  params: GenerateVerticalShortParams
): Promise<GenerateVerticalShortResult> {
  const {
    inputPath,
    outputPath,
    tradeId,
    streamId,
    instrument = "XAUUSD",
    direction = "BUY",
    plannedRR = "1:3",
    resultText = "TP HIT",
    tradeNumber = 1,
    academyName = "RAHUL TRADE WARRIOR",
    mockBase = false,
  } = params;

  try {
    const outputDir = path.join(process.cwd(), "tmp", "trade_clips", "shorts");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `short_${streamId}_${tradeId}.mp4`;
    const targetOutput = outputPath || path.join(outputDir, filename);

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "trade_worker",
      "vertical_short_generator.py"
    );

    const args = [
      scriptPath,
      "--input",
      inputPath,
      "--output",
      targetOutput,
      "--instrument",
      instrument,
      "--direction",
      direction,
      "--planned-rr",
      plannedRR,
      "--result",
      resultText,
      "--trade-number",
      String(tradeNumber),
      "--academy",
      academyName,
    ];

    if (mockBase) {
      args.push("--mock-base");
    }

    const { stdout, stderr } = await execFileAsync("python", args, {
      timeout: 180000,
    });

    if (stderr && stderr.trim().length > 0) {
      console.warn("[VerticalShortGenerator] Worker stderr:", stderr);
    }

    const cleanOutput = stdout.trim();
    const lastLine = cleanOutput.split("\n").filter(Boolean).pop() || "{}";
    const parsed = JSON.parse(lastLine);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error || "Vertical short generation failed",
      };
    }

    return {
      success: true,
      filePath: parsed.filePath,
      durationSec: parsed.durationSec,
      fileSizeBytes: parsed.fileSizeBytes,
      format: parsed.format,
      resolution: parsed.resolution,
    };
  } catch (error: any) {
    console.error("[VerticalShortGenerator] Execution error:", error);
    return {
      success: false,
      error: error?.message || "Execution of vertical short worker failed",
    };
  }
}
