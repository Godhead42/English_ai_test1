"""Pronunciation analysis router — /api/analyze (faster-whisper + Ollama phi3)."""

import json
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form

import httpx
from config import OLLAMA_URL, OLLAMA_MODEL
from services.audio import transcribe_audio

router = APIRouter()


# ── Ollama LLM analysis ────────────────────────────────

SYSTEM_PROMPT = """You are an extremely strict, unforgiving phonetics professor evaluating an ESL student from Russia/Kazakhstan.

You will receive two texts:
- **target_text**: the correct phrase the student was supposed to say.
- **spoken_text**: what the student actually said (transcribed by Whisper).

CRITICAL EVALUATION RULES — YOU MUST FOLLOW ALL OF THESE:
1. If the transcribed text perfectly matches the target text, DO NOT automatically give 100%. Whisper often auto-corrects mispronunciations. Look for subtle clues like added punctuation (commas, ellipses, periods that weren't in the target), filler words (um, uh, hmm), repeated words, or slight word-order changes that indicate unnatural speech.
2. Deduct points strictly for ANY slight deviation: inserted filler words, missed word endings (-ed, -s, -ing), articles (a/the) swapped or dropped, plural/singular mismatches.
3. Getting 100% should be EXCEPTIONALLY RARE and require absolute native-level perfection. Even a perfect word match should cap at 90-95% because text comparison cannot verify actual phonetic quality, intonation curves, or stress placement.
4. For accuracy scoring: if texts match exactly, give at most 90-95%. Only give 100% if you are certain there is zero possibility of Whisper auto-correction (extremely short, simple phrases only).
5. For fluency: assume non-native speakers have some hesitation. Default to 70-85% unless the phrase is very simple.
6. For intonation and stress: these CANNOT be verified from text alone. Default to 60-80% and note this limitation.

Your job:
1. Compare them word-by-word.
2. Score the student on these metrics (0–100 each):
   - **accuracy**: how many words match exactly (MAX 95% if texts are identical — Whisper may have auto-corrected)
   - **fluency**: natural rhythm, no extra pauses or hesitations implied (be strict, default 70-85%)
   - **completeness**: percentage of target words spoken
   - **intonation**: estimate based on question marks, exclamations, and phrasing (be conservative, 60-80%)
   - **stress**: estimate whether stress-sensitive words were likely spoken correctly (be conservative, 60-80%)
   - **overall**: weighted average of the above (accuracy 35%, completeness 20%, fluency 15%, intonation 15%, stress 15%)
3. Produce a word_analysis object classifying each target word as correct, incorrect (with spoken_as + similarity 0–100), or missing. Also list extra words.
4. Identify phonetic_issues — for each mispronounced or missing word that has a known phonetic difficulty (th sounds, w/v, r/l, vowel length, consonant clusters, schwa), provide: word, spoken_as, category, ipa_correct, common_error, issue name, and a tip in Russian.
5. Identify stress_issues — words that are commonly mis-stressed. Provide: word, correct_stress pattern, common_mistake, and a tip in Russian.
6. Write a short summary in Russian (1 sentence). Be honest and critical, not encouraging.

Return STRICTLY a JSON object (no markdown, no code fences) matching this exact structure:
{
  "scores": {"overall": int, "accuracy": int, "fluency": int, "completeness": int, "intonation": int, "stress": int},
  "word_analysis": {
    "correct": [{"word": str, "status": "correct"}],
    "incorrect": [{"word": str, "spoken_as": str, "similarity": int, "status": "mispronounced"}],
    "missing": [{"word": str, "status": "missing"}],
    "extra": [{"word": str, "status": "extra"}]
  },
  "phonetic_issues": [
    {"word": str, "spoken_as": str|null, "category": str, "ipa_correct": str, "common_error": str, "issue": str, "tip": str}
  ],
  "stress_issues": [
    {"word": str, "correct_stress": str, "common_mistake": str, "tip": str}
  ],
  "summary": str
}

If the arrays are empty, return empty arrays []. Always return valid JSON."""


async def analyze_with_ollama(target_text: str, spoken_text: str) -> dict:
    """Call local Ollama (phi3) to produce a structured pronunciation analysis."""
    prompt = f"""{SYSTEM_PROMPT}

target_text: "{target_text}"
spoken_text: "{spoken_text}"
"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # Ollama returns {"response": "...", ...}
            raw_text = data.get("response", "")
            return json.loads(raw_text)
    except Exception as exc:
        print(f"Ollama analysis error: {exc}")
        return None


# ── endpoint ─────────────────────────────────────────────

@router.post("/api/analyze")
async def analyze_pronunciation(
    target_text: str = Form(""),
    user_text: str = Form(""),
    audio_file: Optional[UploadFile] = File(None),
):
    # If frontend sent empty target_text, use user_text as fallback
    if not target_text.strip():
        target_text = user_text.strip() or "empty"

    # Step 1: Get spoken text (prefer local faster-whisper transcription from audio)
    spoken_text = user_text.strip()

    if audio_file:
        try:
            file_bytes = await audio_file.read()
            # Protect against empty/corrupt audio blobs (< 100 bytes)
            if len(file_bytes) > 100:
                whisper_text = await transcribe_audio(file_bytes, audio_file.filename or "recording.webm")
                if whisper_text:
                    spoken_text = whisper_text
        except Exception as e:
            print(f"faster-whisper fallback triggered due to error: {e}")
            # spoken_text remains equal to user_text from browser STT

    # Step 2: Handle no speech
    if not spoken_text:
        target_words = target_text.lower().split()
        return {
            "scores": {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0, "intonation": 0, "stress": 0},
            "word_analysis": {
                "correct": [],
                "incorrect": [],
                "missing": [{"word": w, "status": "missing"} for w in target_words],
                "extra": [],
            },
            "phonetic_issues": [],
            "stress_issues": [],
            "target_text": target_text,
            "user_text": "",
            "summary": "Речь не распознана. Проверьте микрофон и попробуйте снова.",
        }

    # Step 3: Ollama phi3 analysis
    llm_result = await analyze_with_ollama(target_text, spoken_text)

    if llm_result:
        # Attach original texts to response
        llm_result["target_text"] = target_text
        llm_result["user_text"] = spoken_text
        # Ensure all required fields exist and are not None
        if not llm_result.get("scores"):
            llm_result["scores"] = {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0, "intonation": 0, "stress": 0}
        if not llm_result.get("word_analysis"):
            llm_result["word_analysis"] = {"correct": [], "incorrect": [], "missing": [], "extra": []}
        if not llm_result.get("phonetic_issues"):
            llm_result["phonetic_issues"] = []
        if not llm_result.get("stress_issues"):
            llm_result["stress_issues"] = []
        if not llm_result.get("summary"):
            llm_result["summary"] = "Анализ завершён."
        return llm_result

    # Fallback if Ollama fails — basic word comparison
    target_words = target_text.lower().split()
    spoken_words = spoken_text.lower().split()
    correct = [w for w in target_words if w in spoken_words]
    missing = [w for w in target_words if w not in spoken_words]
    extra = [w for w in spoken_words if w not in target_words]
    score = round(len(correct) / max(len(target_words), 1) * 100)

    return {
        "scores": {"overall": score, "accuracy": score, "fluency": max(0, score - 10), "completeness": score, "intonation": 0, "stress": 0},
        "word_analysis": {
            "correct": [{"word": w, "status": "correct"} for w in correct],
            "incorrect": [],
            "missing": [{"word": w, "status": "missing"} for w in missing],
            "extra": [{"word": w, "status": "extra"} for w in extra],
        },
        "phonetic_issues": [],
        "stress_issues": [],
        "target_text": target_text,
        "user_text": spoken_text,
        "summary": f"Ollama недоступен. Базовый анализ: {len(correct)}/{len(target_words)} слов совпали.",
    }
