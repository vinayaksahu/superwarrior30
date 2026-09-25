"""
YouTube Trade Clip Finder — Whisper / faster-whisper Audio Transcription Worker
Module: scripts/trade_worker/transcript_extractor.py

Features:
- Transcribes Hindi / English / Hinglish audio from YouTube livestreams.
- Extracts timestamps (start, end, duration, text) for each spoken phrase.
- CPU fallback by default (no GPU required).
- Outputs structured JSON format compatible with Next.js LMS engine.
"""

import sys
import os
import json
import argparse
import subprocess
from pathlib import Path

def check_dependencies():
    """Checks presence of faster-whisper or openai-whisper."""
    whisper_type = None
    try:
        import faster_whisper
        whisper_type = "faster_whisper"
    except ImportError:
        try:
            import whisper
            whisper_type = "openai_whisper"
        except ImportError:
            whisper_type = None
    return whisper_type

def download_audio_with_ytdlp(url: str, output_path: str) -> bool:
    """Downloads lightweight 16kHz mono audio using yt-dlp."""
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-x", "--audio-format", "wav",
        "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
        "-o", output_path,
        url
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        print(f"[Error] yt-dlp download failed: {e}", file=sys.stderr)
        return False

def transcribe_audio_faster_whisper(audio_path: str, model_size="base", device="cpu"):
    """Transcribes audio using faster-whisper on CPU or CUDA."""
    from faster_whisper import WhisperModel

    compute_type = "float32" if device == "cpu" else "float16"
    print(f"[Info] Loading faster-whisper model '{model_size}' on device '{device}' ({compute_type})...")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    segments_generator, info = model.transcribe(
        audio_path,
        beam_size=5,
        language="hi", # Hindi / Hinglish priority
        task="transcribe"
    )

    results = []
    for s in segments_generator:
        results.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "duration": round(s.end - s.start, 2),
            "text": s.text.strip()
        })

    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "segments": results
    }

def main():
    parser = argparse.ArgumentParser(description="Whisper Audio Transcript Extractor")
    parser.add_argument("--url", type=str, help="YouTube video or livestream URL")
    parser.add_argument("--audio", type=str, help="Path to local audio file")
    parser.add_argument("--model", type=str, default="base", help="Whisper model size (tiny, base, small, medium)")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or cuda)")
    parser.add_argument("--output", type=str, help="Output JSON path")

    args = parser.parse_args()

    whisper_type = check_dependencies()
    if not whisper_type:
        print(json.dumps({
            "status": "MISSING_DEPENDENCIES",
            "message": "faster-whisper is not installed. To enable local audio transcription run: pip install faster-whisper yt-dlp",
            "segments": []
        }))
        return

    audio_file = args.audio
    temp_download = False

    if not audio_file and args.url:
        temp_audio = f"temp_stream_{os.getpid()}.wav"
        print(f"[Info] Extracting audio from {args.url}...")
        if download_audio_with_ytdlp(args.url, temp_audio):
            audio_file = temp_audio
            temp_download = True
        else:
            print(json.dumps({
                "status": "ERROR",
                "message": "Failed to extract audio from URL with yt-dlp",
                "segments": []
            }))
            return

    if not audio_file or not os.path.exists(audio_file):
        print(f"[Error] Audio file not found: {audio_file}", file=sys.stderr)
        return

    try:
        transcript = transcribe_audio_faster_whisper(audio_file, model_size=args.model, device=args.device)
        output_data = {
            "status": "SUCCESS",
            "source": "WHISPER_FALLBACK",
            **transcript
        }

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            print(f"[Success] Transcript saved to {args.output}")
        else:
            print(json.dumps(output_data, ensure_ascii=False))

    finally:
        if temp_download and os.path.exists(audio_file):
            try:
                os.remove(audio_file)
            except:
                pass

if __name__ == "__main__":
    main()
