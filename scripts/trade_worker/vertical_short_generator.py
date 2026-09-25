"""
9:16 Vertical Short Generator (Smart Crop & Composite)
Rahul Trade Warrior Academy - AI Trade Clip Finder

Converts 16:9 trading livestream clips into high-engagement 9:16 vertical shorts
(1080x1920) optimized for YouTube Shorts, Instagram Reels, and mobile playback.
Uses blurred backdrop stacking with crystal-clear center chart and high-contrast
top/bottom trade callout banners.
"""

import sys
import os
import json
import argparse
import subprocess
from pathlib import Path


def generate_synthetic_16_9_base(output_path: str, duration_sec: int = 10) -> bool:
    """Generates a 16:9 test video if input is missing."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
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
        output_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        return res.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        sys.stderr.write(f"Synthetic generation error: {str(e)}\n")
        return False


def get_video_duration(file_path: str) -> float:
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


def composite_vertical_short(
    input_path: str,
    output_path: str,
    instrument: str = "XAUUSD",
    direction: str = "BUY",
    planned_rr: str = "1:3",
    result_text: str = "TP HIT",
    trade_number: int = 1,
    academy_name: str = "RAHUL TRADE WARRIOR"
) -> bool:
    """
    Renders 1080x1920 (9:16) short:
    1. Background: Blurred, dimmed 16:9 video scaled to fill 1080x1920.
    2. Foreground: Crisp 1080x608 chart centered at y=656.
    3. Top Banner (y=100 to y=350): Big Academy badge, Trade symbol, Direction badge.
    4. Bottom Banner (y=1400 to y=1650): Planned RR, Execution status, Results.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    dir_color = "0x00FF88" if direction.upper() in ["BUY", "LONG"] else "0xFF4444"

    def escape_ffmpeg_text(t: str) -> str:
        return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")

    esc_academy = escape_ffmpeg_text(academy_name.upper())
    esc_trade_title = escape_ffmpeg_text(f"TRADE #{trade_number}: {instrument} ({direction.upper()})")
    esc_rr = escape_ffmpeg_text(f"TARGET RISK:REWARD: {planned_rr}")
    esc_result = escape_ffmpeg_text(f"OUTCOME: {result_text.upper()}")
    esc_footer = escape_ffmpeg_text("LIVE STREAM EXECUTION")

    # Filter Complex:
    # [0:v] split into [bg_in][fg_in]
    # [bg_in] -> scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=25,eq=brightness=-0.15 [bg]
    # [fg_in] -> scale=1080:608 [fg]
    # [bg][fg] overlay=0:(H-h)/2 [stacked]
    # draw top card & text
    # draw bottom card & text
    filter_complex = (
        "[0:v]split=2[bg_in][fg_in];"
        "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=25,eq=brightness=-0.15[bg];"
        "[fg_in]scale=1080:608[fg];"
        "[bg][fg]overlay=0:(H-h)/2[base];"
        # Top card container (y=120, h=220)
        "[base]drawbox=x=60:y=120:w=960:h=220:color=black@0.85:t=fill,"
        "drawbox=x=60:y=120:w=960:h=220:color=yellow@0.8:t=4,"
        f"drawtext=text='{esc_academy}':x=(w-text_w)/2:y=150:fontsize=36:fontcolor=white,"
        f"drawtext=text='{esc_trade_title}':x=(w-text_w)/2:y=210:fontsize=48:fontcolor={dir_color},"
        f"drawtext=text='{esc_footer}':x=(w-text_w)/2:y=280:fontsize=28:fontcolor=yellow,"
        # Bottom card container (y=1400, h=200)
        "drawbox=x=60:y=1400:w=960:h=200:color=black@0.85:t=fill,"
        "drawbox=x=60:y=1400:w=960:h=200:color=white@0.6:t=3,"
        f"drawtext=text='{esc_rr}':x=(w-text_w)/2:y=1440:fontsize=38:fontcolor=white,"
        f"drawtext=text='{esc_result}':x=(w-text_w)/2:y=1510:fontsize=44:fontcolor={dir_color}[outv]"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "0:a",
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
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=150)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        sys.stderr.write(f"Vertical short composition error: {str(e)}\n")
        return False


def main():
    parser = argparse.ArgumentParser(description="9:16 Vertical Short Generator")
    parser.add_argument("--input", required=True, help="Input 16:9 master clip")
    parser.add_argument("--output", required=True, help="Output 9:16 vertical short")
    parser.add_argument("--instrument", default="XAUUSD", help="Trade symbol")
    parser.add_argument("--direction", default="BUY", help="BUY or SELL")
    parser.add_argument("--planned-rr", default="1:3", help="Planned Risk to Reward")
    parser.add_argument("--result", default="TP HIT", help="Trade outcome")
    parser.add_argument("--trade-number", type=int, default=1, help="Trade number index")
    parser.add_argument("--academy", default="RAHUL TRADE WARRIOR", help="Academy title")
    parser.add_argument("--mock-base", action="store_true", help="Generate synthetic input if missing")

    args = parser.parse_args()

    if args.mock_base or not os.path.exists(args.input):
        ok = generate_synthetic_16_9_base(args.input, duration_sec=10)
        if not ok:
            print(json.dumps({"success": False, "error": "Failed to create synthetic base"}))
            sys.exit(1)

    success = composite_vertical_short(
        input_path=args.input,
        output_path=args.output,
        instrument=args.instrument,
        direction=args.direction,
        planned_rr=args.planned_rr,
        result_text=args.result,
        trade_number=args.trade_number,
        academy_name=args.academy
    )

    if not success:
        print(json.dumps({"success": False, "error": "FFmpeg vertical compositing failed"}))
        sys.exit(1)

    duration = get_video_duration(args.output)
    file_size = os.path.getsize(args.output)

    print(json.dumps({
        "success": True,
        "filePath": args.output,
        "durationSec": round(duration, 2),
        "fileSizeBytes": file_size,
        "format": "VERTICAL_9_16",
        "resolution": "1080x1920",
        "instrument": args.instrument,
        "direction": args.direction
    }))


if __name__ == "__main__":
    main()
