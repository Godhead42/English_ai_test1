import os
from openai import OpenAI

N8N_WEBHOOK_URL = os.environ.get(
    "N8N_WEBHOOK_URL",
    "https://n8n.kstu.kz/webhook/english-ai-agent",
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# LLM client (GPT-4o-mini) — OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# STT client (Whisper) — Groq
groq_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)
