"""Text-to-speech router — /api/tts."""

import io
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from gtts import gTTS

router = APIRouter()


@router.get("/api/tts")
def text_to_speech(text: str, slow: bool = False):
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text is required"})
    try:
        tts = gTTS(text=text, lang="en", slow=slow)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return StreamingResponse(buf, media_type="audio/mpeg",
                                 headers={"Content-Disposition": "inline; filename=speech.mp3"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
