"""n8n AI chat proxy — /api/chat."""

import httpx
from fastapi import APIRouter, Body, Request
from config import N8N_WEBHOOK_URL

router = APIRouter()


@router.post("/api/chat")
async def chat_with_ai(request: Request, message: str = Body(..., embed=True)):
    session_id = request.client.host if request.client else "anonymous"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                N8N_WEBHOOK_URL,
                json={"content": message, "session_id": session_id},
                timeout=60.0,
            )
            if resp.status_code != 200:
                return {"reply": f"⚠️ AI service error (status {resp.status_code})."}
            return {"reply": resp.text}
    except httpx.TimeoutException:
        return {"reply": "⚠️ The AI is taking too long. Please try again."}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"reply": "⚠️ Could not connect to AI service."}
