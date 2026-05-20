"""Audio transcription via local faster-whisper (CPU, int8)."""
import io
import tempfile
import os
from faster_whisper import WhisperModel

# Load model once at import time — base.en is ~150 MB, runs on CPU
print("⏳ Loading faster-whisper model (base.en, CPU, int8)...")
_model = WhisperModel("base.en", device="cpu", compute_type="int8")
print("✅ faster-whisper model loaded")


async def transcribe_audio(file_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Transcribe audio bytes using local faster-whisper.
    Returns the recognised text, or an empty string on failure.
    """
    if not file_bytes:
        return ""

    try:
        # faster-whisper needs a file path, so write to a temp file
        suffix = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        segments, info = _model.transcribe(tmp_path, language="en", beam_size=3)
        text = " ".join(seg.text.strip() for seg in segments)

        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        return text.strip()
    except Exception as exc:
        print(f"faster-whisper STT error: {exc}")
        return ""
