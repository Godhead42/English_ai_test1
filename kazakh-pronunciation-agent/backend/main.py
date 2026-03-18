from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
import time
import httpx

app = FastAPI(title="Kazakh Pronunciation Agent API")

# Configure CORS for local development with Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}

@app.post("/api/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Endpoint that expects audio payload from the React frontend.
    Future flow:
    1. Receive WebM / WAV audio blob.
    2. Convert if necessary (ffmpeg/librosa).
    3. Send to Azure Speech Pronunciation Assessment API.
    4. Interpret JSON response through language-specific heuristics for Kazakh speakers.
    5. Return structured analysis.
    """
    print(f"Received audio file: {file.filename}, Type: {file.content_type}")
    
    # Read file content just as proof of concept (don't print all of course)
    content = await file.read()
    print(f"Audio size: {len(content)} bytes")
    
    # Simulate processing time
    time.sleep(2)
    
    # Placeholder mocked response mimicking Azure Speech
    return {
        "score": 78,
        "accuracy": 82,
        "fluency": 75,
        "pronunciation": 77,
        "details": [
            {
                "word": "think",
                "original": "/θɪŋk/",
                "user": "/fɪŋk/",
                "issue": "T-gliding or F substitution",
                "tip": "Place your tongue between your teeth, do not bite your bottom lip."
            },
            {
                "word": "that",
                "original": "/ðæt/",
                "user": "/zæt/",
                "issue": "Z substitution for voiced TH",
                "tip": "Place your tongue between teeth and voice it, not behind the teeth."
            }
        ]
    }

N8N_WEBHOOK_URL = "https://n8n.kstu.kz/webhook-test/english-ai-agent"

@app.post("/chat")
async def chat_with_ai(message: str = Body(..., embed=True)):
    async with httpx.AsyncClient() as client:
        print("Sending to n8n:", message)
        # 1. Пересылаем сообщение студента в n8n
        response = await client.post(
            N8N_WEBHOOK_URL, 
            json={"content": message},
            timeout=60.0 # Даем ИИ время подумать
        )
        
        text = response.text
        
        print("Raw response:", text)
        
        # 3. Отдаем фронтенду
        return {"reply": text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

