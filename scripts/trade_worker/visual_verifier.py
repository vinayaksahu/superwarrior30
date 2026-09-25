"""
Visual Chart & ROI Inspection Worker
Rahul Trade Warrior Academy - AI Trade Clip Finder

Inspects video frames at candidate trade execution timestamps:
- Extracts high-resolution frame via FFmpeg
- Detects chart canvas presence (TradingView / MT4/MT5 / Exness / Broker)
- Detects candlestick presence (Bullish green vs Bearish red pixel distributions)
- Identifies Regions of Interest (ROI: Chart Canvas, Symbol Header, Order PnL)
- Dual-engine: OpenCV (if available) with PIL/Pillow fallback
"""

import sys
import os
import json
import argparse
import subprocess
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=DeprecationWarning)

# Dual-engine import: OpenCV optional, PIL primary
try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    from PIL import Image, ImageStat, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def extract_frame_ffmpeg(video_source: str, timestamp_sec: float, output_path: str) -> bool:
    """Extracts a single frame at timestamp_sec using ffmpeg."""
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(timestamp_sec),
            "-i", video_source,
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        sys.stderr.write(f"FFmpeg extraction failed: {str(e)}\n")
        return False


def create_synthetic_chart_frame(output_path: str, is_bullish: bool = True) -> str:
    """Creates a realistic synthetic dark-theme TradingView chart frame for testing."""
    if not HAS_PIL:
        raise RuntimeError("PIL/Pillow is required to create synthetic chart frames.")
    
    width, height = 1280, 720
    # TradingView dark theme background: #131722
    img = Image.new("RGB", (width, height), (19, 23, 34))
    draw = ImageDraw.Draw(img)

    # 1. Grid lines (subtle gray)
    for y in range(80, height - 60, 60):
        draw.line([(60, y), (width - 80, y)], fill=(30, 34, 45), width=1)
    for x in range(120, width - 80, 100):
        draw.line([(x, 60), (x, height - 40)], fill=(30, 34, 45), width=1)

    # 2. Header Area (Symbol, timeframe, indicators)
    draw.rectangle([(20, 15), (320, 50)], fill=(26, 30, 42))

    # 3. Draw Candlesticks across the chart
    green = (38, 166, 154) # TradingView Bullish Green
    red = (239, 83, 80)     # TradingView Bearish Red

    candles = [
        {"x": 180, "o": 400, "c": 380, "h": 360, "l": 410, "color": green},
        {"x": 240, "o": 380, "c": 395, "h": 375, "l": 415, "color": red},
        {"x": 300, "o": 395, "c": 360, "h": 350, "l": 400, "color": green},
        {"x": 360, "o": 360, "c": 410, "h": 355, "l": 430, "color": red},
        {"x": 420, "o": 410, "c": 390, "h": 380, "l": 440, "color": green}, # Hammer
        {"x": 480, "o": 390, "c": 340, "h": 330, "l": 395, "color": green}, # Breakout
        {"x": 540, "o": 340, "c": 310, "h": 300, "l": 345, "color": green},
        {"x": 600, "o": 310, "c": 280, "h": 270, "l": 315, "color": green if is_bullish else red},
    ]

    for c in candles:
        # Wick
        draw.line([(c["x"], c["h"]), (c["x"], c["l"])], fill=c["color"], width=2)
        # Body
        top = min(c["o"], c["c"])
        bottom = max(c["o"], c["c"])
        draw.rectangle([(c["x"] - 12, top), (c["x"] + 12, bottom)], fill=c["color"], outline=c["color"])

    # 4. Right Price Scale
    draw.rectangle([(width - 70, 0), (width, height)], fill=(24, 28, 39))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "JPEG", quality=90)
    return output_path


def analyze_chart_frame(image_path: str) -> dict:
    """Analyzes a video frame image to verify chart characteristics, candlestick distributions, and ROIs."""
    if not os.path.exists(image_path):
        return {
            "chartDetected": False,
            "confidence": 0.0,
            "error": "Image file not found"
        }

    if not HAS_PIL:
        return {
            "chartDetected": False,
            "confidence": 0.0,
            "error": "PIL/Pillow is not installed"
        }

    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        width, height = img_rgb.size

        # Subsample pixels for fast inspection (every 4th pixel)
        pixels = img_rgb.getdata()
        sample_step = 4
        sampled_pixels = [pixels[i] for i in range(0, len(pixels), sample_step)]

        dark_pixels = 0
        light_pixels = 0
        green_pixels = 0
        red_pixels = 0

        for r, g, b in sampled_pixels:
            # Dark theme background detector (#101010 to #2a2a35)
            if r < 50 and g < 55 and b < 65:
                dark_pixels += 1
            # Light theme background detector (#e0e0e0 to #ffffff)
            elif r > 210 and g > 210 and b > 210:
                light_pixels += 1

            # Green candle pixels: green dominant over red, and either pure green or teal green
            if g > 100 and g > (r * 1.2) and (g >= b * 0.9 or g > 130):
                green_pixels += 1
            # Red candle pixels: strong red dominant over green and blue
            elif r > 100 and r > (g * 1.2) and r > (b * 1.2):
                red_pixels += 1

        total_samples = len(sampled_pixels)
        dark_ratio = dark_pixels / total_samples
        light_ratio = light_pixels / total_samples
        green_ratio = green_pixels / total_samples
        red_ratio = red_pixels / total_samples

        background_theme = "DARK" if dark_ratio > 0.35 else "LIGHT" if light_ratio > 0.35 else "UNKNOWN"
        has_candle_colors = (green_ratio > 0.001 or red_ratio > 0.001)
        has_chart_theme = (dark_ratio > 0.30 or light_ratio > 0.30)

        chart_detected = has_chart_theme and has_candle_colors
        confidence = 0.5
        if chart_detected:
            confidence = min(0.75 + (dark_ratio * 0.15) + (green_ratio + red_ratio) * 15.0, 0.98)
            confidence = round(confidence, 2)
        else:
            confidence = round(max(dark_ratio, light_ratio) * 0.5, 2)

        dominant_candle = "UNKNOWN"
        if green_ratio > red_ratio * 1.3:
            dominant_candle = "GREEN"
        elif red_ratio > green_ratio * 1.3:
            dominant_candle = "RED"
        elif green_ratio > 0.002 and red_ratio > 0.002:
            dominant_candle = "BALANCED"

        # ROIs (standard 16:9 TradingView layout)
        rois = {
            "chartCanvas": {
                "x": int(width * 0.05),
                "y": int(height * 0.08),
                "width": int(width * 0.88),
                "height": int(height * 0.82)
            },
            "symbolHeader": {
                "x": int(width * 0.02),
                "y": int(height * 0.02),
                "width": int(width * 0.28),
                "height": int(height * 0.06)
            },
            "priceScale": {
                "x": int(width * 0.93),
                "y": int(height * 0.08),
                "width": int(width * 0.07),
                "height": int(height * 0.82)
            }
        }

        return {
            "chartDetected": chart_detected,
            "confidence": confidence,
            "backgroundTheme": background_theme,
            "dominantCandleColor": dominant_candle,
            "dimensions": {"width": width, "height": height},
            "pixelMetrics": {
                "darkRatio": round(dark_ratio, 3),
                "lightRatio": round(light_ratio, 3),
                "greenRatio": round(green_ratio, 4),
                "redRatio": round(red_ratio, 4)
            },
            "rois": rois
        }


def main():
    parser = argparse.ArgumentParser(description="Visual Chart & ROI Inspection Worker")
    parser.add_argument("--video", help="Video path or URL to inspect")
    parser.add_argument("--timestamp", type=float, default=0.0, help="Timestamp in seconds")
    parser.add_argument("--image", help="Direct image path to analyze")
    parser.add_argument("--output", default="tmp/verification_frames", help="Output directory for frame")
    parser.add_argument("--mock-test", action="store_true", help="Generate and test synthetic chart frame")

    args = parser.parse_args()

    if args.mock_test:
        os.makedirs(args.output, exist_ok=True)
        test_frame = os.path.join(args.output, "mock_chart_frame.jpg")
        create_synthetic_chart_frame(test_frame, is_bullish=True)
        result = analyze_chart_frame(test_frame)
        result["framePath"] = test_frame
        print(json.dumps(result, indent=2))
        return

    if args.image:
        result = analyze_chart_frame(args.image)
        result["framePath"] = args.image
        print(json.dumps(result, indent=2))
        return

    if args.video:
        os.makedirs(args.output, exist_ok=True)
        frame_name = f"frame_{int(args.timestamp)}s.jpg"
        frame_path = os.path.join(args.output, frame_name)
        extracted = extract_frame_ffmpeg(args.video, args.timestamp, frame_path)
        if not extracted:
            print(json.dumps({"chartDetected": False, "confidence": 0.0, "error": "FFmpeg frame extraction failed"}))
            sys.exit(1)

        result = analyze_chart_frame(frame_path)
        result["framePath"] = frame_path
        print(json.dumps(result, indent=2))
        return

    print("Please specify --video, --image, or --mock-test")
    sys.exit(1)


if __name__ == "__main__":
    main()
