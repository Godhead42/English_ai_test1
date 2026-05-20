import os

N8N_WEBHOOK_URL = os.environ.get(
    "N8N_WEBHOOK_URL",
    "https://n8n.kstu.kz/webhook/english-ai-agent",
)

# Ollama LLM endpoint (Docker host gateway)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://172.18.0.1:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "phi3")
