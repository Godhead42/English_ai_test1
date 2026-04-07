"""Audio conversion & speech-to-text helpers."""
import os
import tempfile
import speech_recognition as sr
from pydub import AudioSegment


async def transcribe_audio(audio_file) -> str:
    """
    Receive an uploaded audio file (webm/mp4/etc), convert to wav via
    pydub+ffmpeg, then run Google Speech Recognition on it.

    Returns the recognised text, or an empty string on failure.
    """
    content = await audio_file.read()
    if not content:
        return ""

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    recognised = ""
    wav_path = tmp_path + ".wav"

    try:
        # Convert to wav
        audio = AudioSegment.from_file(tmp_path)
        audio.export(wav_path, format="wav")

        # Speech recognition
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            recognised = recognizer.recognize_google(audio_data)
    except sr.UnknownValueError:
        print("STT: Google could not understand audio")
    except sr.RequestError as exc:
        print(f"STT: Google request error – {exc}")
    except Exception as exc:
        print(f"STT: unexpected error – {exc}")
    finally:
        for p in (tmp_path, wav_path):
            try:
                os.remove(p)
            except OSError:
                pass
    return recognised
