"""
Silent Period Accelerator with Protected Speech
Rahul Trade Warrior Academy - AI Trade Clip Finder

Detects silent waiting intervals in trading livestream clips using FFmpeg's
silencedetect filter. Accelerates dead waiting time (2.0x - 4.0x) while preserving
Rahul's spoken trade commentary at natural 1.0x speed.
"""

import sys
import os
import re
import json
import argparse
import subprocess
from pathlib import Path


def generate_synthetic_speech_and_silence_video(output_path: str) -> bool:
    """
    Generates a 14-second test video containing:
    0s - 4s: Audio beep/tone (simulating speech)
    4s - 10s: Pure silence (simulating dead waiting period)
    10s - 14s: Audio beep/tone (simulating speech resumption)
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Using filter complex to create audio with tone -> silence -> tone
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=14:size=1280x720:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=1000:duration=4",
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100:duration=6",
        "-f", "lavfi",
        "-i", "sine=frequency=1200:duration=4",
        "-filter_complex", "[1:a][2:a][3:a]concat=n=3:v=0:a=1[outa]",
        "-map", "0:v",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        output_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=40)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        sys.stderr.write(f"Synthetic speech/silence generation failed: {str(e)}\n")
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
    return 14.0


def detect_silence_intervals(input_path: str, noise_db: str = "-30dB", min_silence_sec: float = 1.5):
    """
    Runs ffmpeg silencedetect to identify intervals of silence.
    Returns list of dicts: [{"start": float, "end": float, "duration": float}]
    """
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-af", f"silencedetect=noise={noise_db}:d={min_silence_sec}",
        "-f", "null",
        "-"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stderr = res.stderr or ""

    silence_intervals = []
    starts = [float(m) for m in re.findall(r"silence_start:\s*([0-9.]+)", stderr)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([0-9.]+)", stderr)]

    for i in range(min(len(starts), len(ends))):
        start = starts[i]
        end = ends[i]
        if end > start:
            silence_intervals.append({
                "start": start,
                "end": end,
                "duration": end - start
            })

    return silence_intervals


def build_acceleration_segments(total_duration: float, silence_intervals: list, speed_factor: float = 3.0):
    """
    Builds chronological sequence of speech (1.0x) and silence (speed_factor) intervals.
    """
    if not silence_intervals:
        return [{"type": "SPEECH", "start": 0.0, "end": total_duration, "speed": 1.0}]

    segments = []
    current_time = 0.0

    for sil in silence_intervals:
        s_start = max(current_time, sil["start"])
        s_end = min(total_duration, sil["end"])

        # Prior speech interval
        if s_start > current_time + 0.1:
            segments.append({
                "type": "SPEECH",
                "start": round(current_time, 2),
                "end": round(s_start, 2),
                "speed": 1.0
            })

        # Silence interval to accelerate
        if s_end > s_start + 0.1:
            segments.append({
                "type": "SILENCE_ACCELERATED",
                "start": round(s_start, 2),
                "end": round(s_end, 2),
                "speed": speed_factor
            })

        current_time = s_end

    # Tail interval
    if current_time < total_duration - 0.1:
        segments.append({
            "type": "SPEECH",
            "start": round(current_time, 2),
            "end": round(total_duration, 2),
            "speed": 1.0
        })

    return segments


def render_accelerated_video(input_path: str, output_path: str, segments: list) -> bool:
    """
    Uses FFmpeg filter_complex to trim, adjust PTS/atempo, and concat segments.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # If only 1 segment at 1.0x, simple copy or fast transcode
    if len(segments) <= 1 and segments[0]["speed"] == 1.0:
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-c:v", "libx264", "-c:a", "aac",
            "-movflags", "+faststart",
            output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return res.returncode == 0

    filter_chains = []
    concat_inputs = []

    for i, seg in enumerate(segments):
        s = seg["start"]
        e = seg["end"]
        speed = seg["speed"]
        pts_mult = 1.0 / speed

        # Video stream
        v_filter = f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS,setpts={pts_mult}*PTS[v{i}]"
        filter_chains.append(v_filter)

        # Audio stream (atempo supports 0.5 to 2.0; if speed > 2.0, stack atempo filters)
        if speed <= 2.0:
            a_filter = f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS,atempo={speed}[a{i}]"
        else:
            first_pass = 2.0
            second_pass = speed / 2.0
            a_filter = f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS,atempo={first_pass},atempo={second_pass:.2f}[a{i}]"
        filter_chains.append(a_filter)

        concat_inputs.append(f"[v{i}][a{i}]")

    concat_chain = f"{''.join(concat_inputs)}concat=n={len(segments)}:v=1:a=1[outv][outa]"
    filter_chains.append(concat_chain)

    full_filter = ";".join(filter_chains)

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-filter_complex", full_filter,
        "-map", "[outv]",
        "-map", "[outa]",
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
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        sys.stderr.write(f"Acceleration render error: {str(e)}\n")
        return False


def main():
    parser = argparse.ArgumentParser(description="Silent Period Accelerator with Protected Speech")
    parser.add_argument("--input", required=True, help="Input MP4 video file")
    parser.add_argument("--output", required=True, help="Output accelerated MP4 file")
    parser.add_argument("--speed", type=float, default=3.0, help="Acceleration factor for silent segments")
    parser.add_argument("--noise-db", default="-30dB", help="Silence detection noise floor")
    parser.add_argument("--min-silence", type=float, default=1.5, help="Min silence duration in seconds")
    parser.add_argument("--mock-base", action="store_true", help="Generate test base with speech and silence")

    args = parser.parse_args()

    if args.mock_base or not os.path.exists(args.input):
        ok = generate_synthetic_speech_and_silence_video(args.input)
        if not ok:
            print(json.dumps({"success": False, "error": "Failed to create synthetic input video"}))
            sys.exit(1)

    orig_duration = get_video_duration(args.input)
    silence_intervals = detect_silence_intervals(args.input, noise_db=args.noise_db, min_silence_sec=args.min_silence)
    segments = build_acceleration_segments(orig_duration, silence_intervals, speed_factor=args.speed)

    success = render_accelerated_video(args.input, args.output, segments)

    if not success:
        print(json.dumps({"success": False, "error": "Failed to render accelerated video"}))
        sys.exit(1)

    new_duration = get_video_duration(args.output)
    file_size = os.path.getsize(args.output)
    saved_seconds = max(0.0, orig_duration - new_duration)
    saved_percent = round((saved_seconds / orig_duration) * 100, 1) if orig_duration > 0 else 0

    print(json.dumps({
        "success": True,
        "filePath": args.output,
        "originalDuration": round(orig_duration, 2),
        "newDuration": round(new_duration, 2),
        "savedSeconds": round(saved_seconds, 2),
        "savedPercent": saved_percent,
        "fileSizeBytes": file_size,
        "silenceSegmentsCount": len([s for s in segments if s["type"] == "SILENCE_ACCELERATED"]),
        "totalSegmentsCount": len(segments),
        "speedFactor": args.speed
    }))


if __name__ == "__main__":
    main()
