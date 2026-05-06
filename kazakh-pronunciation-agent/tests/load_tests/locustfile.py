"""
Locust load test for OUR backend's /api/analyze endpoint.

Targets the local FastAPI server, NOT the external Groq API directly.
The backend handles Groq/OpenAI calls internally.

Usage:
    locust -f tests/load_tests/locustfile.py --host http://localhost:8000

The test audio file (test_audio.webm) is read into memory once at
module level so disk I/O never becomes a bottleneck during the test.
"""

import os
from locust import HttpUser, task, between, events

# ── Read audio fixture once at import time ──────────────────────────
AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_PATH = os.path.join(AUDIO_DIR, "test_audio.webm")

_audio_bytes: bytes | None = None

# Test phrases of varying difficulty
TEST_PHRASES = [
    "The thirty-three thieves",
    "She sells seashells by the seashore",
    "How much wood would a woodchuck chuck",
    "Peter Piper picked a peck of pickled peppers",
    "The weather is beautiful today",
    "I would like to practice my pronunciation",
]


@events.init.add_listener
def _load_audio_fixture(environment, **kwargs):
    """Load the test audio file into memory before spawning users."""
    global _audio_bytes
    if not os.path.exists(AUDIO_PATH):
        raise FileNotFoundError(
            f"Test audio not found at {AUDIO_PATH}.\n"
            "Generate it with:\n"
            "  ffmpeg -f lavfi -i sine=frequency=440:duration=1 "
            "-c:a libopus test_audio.webm"
        )
    with open(AUDIO_PATH, "rb") as f:
        _audio_bytes = f.read()
    print(f"✅ Loaded test audio: {len(_audio_bytes):,} bytes")


# ── Locust user ─────────────────────────────────────────────────────
class PronunciationUser(HttpUser):
    """Simulates a student using the pronunciation trainer."""

    wait_time = between(1, 5)
    _phrase_index = 0

    @task(3)
    def analyze_with_audio(self):
        """POST /api/analyze with audio file + target text (main flow)."""
        phrase = TEST_PHRASES[self._phrase_index % len(TEST_PHRASES)]
        self._phrase_index += 1

        self.client.post(
            "/api/analyze",
            data={
                "target_text": phrase,
                "user_text": phrase,  # simulate browser STT fallback
            },
            files={
                "audio_file": ("test_audio.webm", _audio_bytes, "audio/webm"),
            },
            name="/api/analyze [with audio]",
        )

    @task(1)
    def analyze_text_only(self):
        """POST /api/analyze without audio (browser STT only)."""
        phrase = TEST_PHRASES[self._phrase_index % len(TEST_PHRASES)]
        self._phrase_index += 1

        self.client.post(
            "/api/analyze",
            data={
                "target_text": phrase,
                "user_text": phrase,
            },
            name="/api/analyze [text only]",
        )
