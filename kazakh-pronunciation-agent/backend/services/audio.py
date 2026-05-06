"""Audio transcription via Groq Whisper."""
import io
from config import groq_client


async def transcribe_audio(file_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Transcribe audio bytes using Groq Whisper-large-v3.
    Returns the recognised text, or an empty string on failure.
    """
    if not file_bytes:
        return ""

    try:
        audio_file = io.BytesIO(file_bytes)
        audio_file.name = filename  # API needs the name to detect format

        transcription = groq_client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            language="en",
            temperature=0.6,
            response_format="text",
        )
        # Groq returns plain text when response_format="text"
        result = transcription if isinstance(transcription, str) else transcription.text
        return result.strip()
    except Exception as exc:
        print(f"Groq Whisper STT error: {exc}")
        return ""

