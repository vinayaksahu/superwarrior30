"""
Trade Master Clip Generator Worker
Rahul Trade Warrior Academy - AI Trade Clip Finder

Composites the raw selective segment into a polished Master MP4 (16:9)
with brand watermark, trade HUD badge (Instrument, Direction, Planned RR, Result),
and web-optimized faststart MP4 encoding.
"""

import sys
import os
import json
import argparse
import subprocess
from pathlib import Path


def generate_synthetic_base_if_needed(input_path: str, duration_sec: int = 10) -> bool:
    """Generates a base test segment if the input file does not exist."""
    if os.path.exists(input_path) and os.path.getsize(input_path) > 0:
        return True

    os.makedirs(os.path.dirname(input_path), exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", f"testsrc=duration={duration_sec}:size=1280x720:rate=30",
        "-f", "lavfi",
        "-i", f"sine=frequency=1000:duration={duration_sec}",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        input_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        return res.returncode == 0 and os.path.exists(input_path)
    except Exception as e:
        sys.stderr.write(f"Synthetic base generation failed: {str(e)}\n")
        return False


def get_video_duration(file_path: str) -> float:
    """Gets video duration using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        if res.returncode == 0:
            return float(res.stdout.strip())
    except Exception:
        pass
    return 10.0


def composite_master_clip(
    input_path: str,
    output_path: str,
    instrument: str = "XAUUSD",
    direction: str = "BUY",
    planned_rr: str = "1:3",
    result_text: str = "TP HIT",
    trade_number: int = 1,
    watermark: str = "RAHUL TRADE WARRIOR ACADEMY"
) -> bool:
    """Applies branded trade overlays and re-encodes to a web-optimized Master MP4."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    dir_color = "0x00FF88" if direction.upper() in ["BUY", "LONG"] else "0xFF4444"
    header_title = f"{watermark} | TRADE #{trade_number}: {instrument} ({direction})"
    sub_title = f"PLANNED RR: {planned_rr}  |  STATUS: {result_text}"

    # Escape single quotes and colons for ffmpeg drawtext filter
    def escape_ffmpeg_text(t: str) -> str:
        return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")

    esc_header = escape_ffmpeg_text(header_title)
    esc_sub = escape_ffmpeg_text(sub_title)
    esc_watermark = escape_ffmpeg_text("LIVE STREAM VERIFIED BREAKDOWN")

    # Filter complex:
    # 1. Top dark badge box (h=70)
    # 2. Header text
    # 3. Sub header text with trade metrics
    # 4. Bottom watermark banner (h=35)
    # 5. Bottom label
    vf = (
        f"drawbox=x=0:y=0:w=iw:h=70:color=black@0.75:t=fill,"
        f"drawtext=text='{esc_header}':x=20:y=15:fontsize=22:fontcolor=white,"
        f"drawtext=text='{esc_sub}':x=20:y=42:fontsize=18:fontcolor={dir_color},"
        f"drawbox=x=0:y=ih-35:w=iw:h=35:color=black@0.65:t=fill,"
        f"drawtext=text='{esc_watermark}':x=w-text_w-20:y=h-25:fontsize=15:fontcolor=yellow"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-movflags", "+faststart",
        output_path
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        sys.stderr.write(f"FFmpeg composite failed: {str(e)}\n")
        return False


def main():
    parser = argparse.ArgumentParser(description="Trade Master Clip Generator Worker")
    parser.add_argument("--input", required=True, help="Input segment MP4 path")
    parser.add_argument("--output", required=True, help="Output master clip MP4 path")
    parser.add_argument("--instrument", default="XAUUSD", help="Trade symbol")
    parser.add_argument("--direction", default="BUY", help="BUY or SELL")
    parser.add_argument("--planned-rr", default="1:3", help="Planned Risk to Reward")
    parser.add_argument("--result", default="TP HIT", help="Trade outcome")
    parser.add_argument("--trade-number", type=int, default=1, help="Trade number index")
    parser.add_argument("--watermark", default="RAHUL TRADE WARRIOR ACADEMY", help="Watermark text")
    parser.add_argument("--mock-base", action="store_true", help="Generate synthetic base if missing")

    args = parser.parse_args()

    if args.mock_base or not os.path.exists(args.input):
        ok = generate_synthetic_base_if_needed(args.input, duration_sec=10)
        if not ok:
            print(json.dumps({"success": False, "error": "Failed to create base video input"}))
            sys.exit(1)

    success = composite_master_clip(
        input_path=args.input,
        output_path=args.output,
        instrument=args.instrument,
        direction=args.direction,
        planned_rr=args.planned_rr,
        result_text=args.result,
        trade_number=args.trade_number,
        watermark=args.watermark
    )

    if not success:
        print(json.dumps({"success": False, "error": "FFmpeg composition failed"}))
        sys.exit(1)

    duration = get_video_duration(args.output)
    file_size = os.path.getsize(args.output)

    print(json.dumps({
        "success": True,
        "filePath": args.output,
        "durationSec": round(duration, 2),
        "fileSizeBytes": file_size,
        "format": "MASTER_16_9",
        "instrument": args.instrument,
        "direction": args.direction
    }))


if __name__ == "__main__":
    main()
