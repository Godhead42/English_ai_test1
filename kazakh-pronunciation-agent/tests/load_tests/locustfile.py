"""
Locust load test for the audio transcription endpoint.

Usage:
    locust -f tests/load_tests/locustfile.py --host https://api.groq.com

Environment variables:
    API_KEY  — Bearer token for the transcription API (e.g. your GROQ_API_KEY).

The test audio file (test_audio.webm) is read into memory once at
module level so disk I/O never becomes a bottleneck during the test.
"""

import os
from locust import HttpUser, task, between, events

# ── Read audio fixture once at import time ──────────────────────────
AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_PATH = os.path.join(AUDIO_DIR, "test_audio.webm")

_audio_bytes: bytes | None = None


@events.init.add_listener
def _load_audio_fixture(environment, **kwargs):
    """Load the test audio file into memory before spawning users."""
    global _audio_bytes
    if not os.path.exists(AUDIO_PATH):
        raise FileNotFoundError(
            f"Test audio not found at {AUDIO_PATH}. "
            "Generate it with: ffmpeg -f lavfi -i sine=frequency=440:duration=1 "
            "-c:a libopus test_audio.webm"
        )
    with open(AUDIO_PATH, "rb") as f:
        _audio_bytes = f.read()
    print(f"✅ Loaded test audio: {len(_audio_bytes):,} bytes")


# ── Locust user ─────────────────────────────────────────────────────
class AudioTranscriptionUser(HttpUser):
    """Simulates a client sending audio for transcription."""

    wait_time = between(1, 5)

    def on_start(self):
        """Set auth header from environment."""
        api_key = os.getenv("API_KEY", "")
        if not api_key:
            print("⚠️  API_KEY env var is empty — requests will likely fail with 401")
        self.headers = {"Authorization": f"Bearer {api_key}"}

    @task
    def transcribe_audio(self):
        """POST audio to the transcription endpoint."""
        self.client.post(
            "/openai/v1/audio/transcriptions",
            headers=self.headers,
            files={"file": ("test_audio.webm", _audio_bytes, "audio/webm")},
            data={"model": "whisper-large-v3"},
            name="/v1/audio/transcriptions",
        )
