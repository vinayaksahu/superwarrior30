/**
 * Trade Master Clip Generator
 * Rahul Trade Warrior Academy - AI Trade Clip Finder
 *
 * Invokes the Python worker to composite the raw downloaded trade segment
 * with official Academy branding, Trade HUD metrics, and faststart MP4 encoding.
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface GenerateMasterClipParams {
  inputPath: string;
  outputPath?: string;
  tradeId: string;
  streamId: string;
  instrument?: string;
  direction?: string;
  plannedRR?: string;
  resultText?: string;
  tradeNumber?: number;
  watermark?: string;
  mockBase?: boolean;
}

export interface GenerateMasterClipResult {
  success: boolean;
  filePath?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  format?: string;
  error?: string;
}

/**
 * Generates the branded Master MP4 clip for a verified trade candidate.
 */
export async function generateMasterClip(
  params: GenerateMasterClipParams
): Promise<GenerateMasterClipResult> {
  const {
    inputPath,
    tradeId,
    streamId,
    instrument = "XAUUSD",
    direction = "BUY",
    plannedRR = "1:3",
    resultText = "TP HIT",
    tradeNumber = 1,
    watermark = "RAHUL TRADE WARRIOR ACADEMY",
    mockBase = false,
  } = params;

  try {
    const outputDir = path.join(process.cwd(), "tmp", "trade_clips", "masters");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `master_${streamId}_${tradeId}.mp4`;
    const outputPath = params.outputPath || path.join(outputDir, filename);

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "trade_worker",
      "clip_generator.py"
    );

    const args = [
      scriptPath,
      "--input",
      inputPath,
      "--output",
      outputPath,
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
      "--watermark",
      watermark,
    ];

    if (mockBase) {
      args.push("--mock-base");
    }

    const { stdout, stderr } = await execFileAsync("python", args, {
      timeout: 120000,
    });

    if (stderr && stderr.trim().length > 0) {
      console.warn("[ClipGenerator] Worker stderr:", stderr);
    }

    const cleanOutput = stdout.trim();
    const lastLine = cleanOutput.split("\n").filter(Boolean).pop() || "{}";
    const parsed = JSON.parse(lastLine);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error || "Master clip generation failed",
      };
    }

    return {
      success: true,
      filePath: parsed.filePath,
      durationSec: parsed.durationSec,
      fileSizeBytes: parsed.fileSizeBytes,
      format: parsed.format,
    };
  } catch (error: any) {
    console.error("[ClipGenerator] Execution error:", error);
    return {
      success: false,
      error: error?.message || "Execution of master clip generator worker failed",
    };
  }
}
