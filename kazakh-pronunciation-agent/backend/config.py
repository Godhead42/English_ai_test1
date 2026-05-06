import os
from openai import OpenAI

N8N_WEBHOOK_URL = os.environ.get(
    "N8N_WEBHOOK_URL",
    "https://n8n.kstu.kz/webhook/english-ai-agent",
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

