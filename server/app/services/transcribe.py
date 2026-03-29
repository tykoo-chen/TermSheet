"""Video/audio transcription via ffmpeg + OpenAI Whisper API."""

import asyncio
import tempfile
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import get_settings

# Whisper API accepts max 25 MB audio files
MAX_AUDIO_SIZE = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".m4a", ".mp3", ".wav", ".ogg", ".mpeg"}


async def _extract_audio(input_path: Path, output_path: Path) -> None:
    """Extract audio from video using ffmpeg → mono 16kHz mp3 (small file size)."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vn",                    # drop video
        "-ac", "1",               # mono
        "-ar", "16000",           # 16 kHz
        "-b:a", "64k",            # 64 kbps — keeps file small
        str(output_path),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode()[-500:]}")


async def transcribe_file(file_bytes: bytes, filename: str) -> dict:
    """Transcribe a video/audio file.

    Returns {"transcript": str, "duration_seconds": float}.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix}")

    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        input_file = tmp / f"input{suffix}"
        input_file.write_bytes(file_bytes)

        # If video, extract audio first; if already audio, use directly
        video_exts = {".mp4", ".mov", ".webm"}
        if suffix in video_exts:
            audio_file = tmp / "audio.mp3"
            await _extract_audio(input_file, audio_file)
        else:
            audio_file = input_file

        # Check size after extraction
        if audio_file.stat().st_size > MAX_AUDIO_SIZE:
            raise ValueError("Audio too large for transcription (max 25 MB after extraction).")

        # Call Whisper API
        with open(audio_file, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
            )

    return {
        "transcript": response.text,
        "duration_seconds": response.duration or 0,
    }
