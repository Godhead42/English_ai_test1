"""Audio transcription via OpenAI Whisper."""
import io
from config import openai_client


async def transcribe_audio(file_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Transcribe audio bytes using OpenAI Whisper-1.
    Returns the recognised text, or an empty string on failure.
    """
    if not file_bytes:
        return ""

    try:
        audio_file = io.BytesIO(file_bytes)
        audio_file.name = filename  # OpenAI needs the name to detect format

        transcription = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en",
        )
        return transcription.text.strip()
    except Exception as exc:
        print(f"Whisper STT error: {exc}")
        return ""
