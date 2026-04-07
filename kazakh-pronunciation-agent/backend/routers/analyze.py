"""Pronunciation analysis router — /api/analyze (Whisper + GPT-4o-mini)."""

import json
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from config import openai_client
from services.audio import transcribe_audio

router = APIRouter()


# ── GPT-4o-mini analysis ────────────────────────────────

SYSTEM_PROMPT = """You are an expert English phonetics instructor helping Russian/Kazakh-speaking students improve their pronunciation.

You will receive two texts:
- **target_text**: the correct phrase the student was supposed to say.
- **spoken_text**: what the student actually said (transcribed by Whisper).

Your job:
1. Compare them word-by-word.
2. Score the student on these metrics (0–100 each):
   - **accuracy**: how many words match exactly
   - **fluency**: natural rhythm, no extra pauses or hesitations implied
   - **completeness**: percentage of target words spoken
   - **intonation**: estimate based on question marks, exclamations, and phrasing
   - **stress**: estimate whether stress-sensitive words were likely spoken correctly
   - **overall**: weighted average of the above (accuracy 35%, completeness 20%, fluency 15%, intonation 15%, stress 15%)
3. Produce a word_analysis object classifying each target word as correct, incorrect (with spoken_as + similarity 0–100), or missing. Also list extra words.
4. Identify phonetic_issues — for each mispronounced or missing word that has a known phonetic difficulty (th sounds, w/v, r/l, vowel length, consonant clusters, schwa), provide: word, spoken_as, category, ipa_correct, common_error, issue name, and a tip in Russian.
5. Identify stress_issues — words that are commonly mis-stressed. Provide: word, correct_stress pattern, common_mistake, and a tip in Russian.
6. Write a short summary in Russian (1 sentence).

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


async def analyze_with_gpt(target_text: str, spoken_text: str) -> dict:
    """Call GPT-4o-mini to produce a structured pronunciation analysis."""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"target_text: \"{target_text}\"\nspoken_text: \"{spoken_text}\""},
            ],
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as exc:
        print(f"GPT analysis error: {exc}")
        return None


# ── endpoint ─────────────────────────────────────────────

@router.post("/api/analyze")
async def analyze_pronunciation(
    target_text: str = Form(...),
    user_text: str = Form(""),
    audio_file: UploadFile = File(None),
):
    # Step 1: Get spoken text (prefer Whisper transcription from audio)
    spoken_text = user_text.strip()

    if audio_file:
        file_bytes = await audio_file.read()
        if file_bytes:
            whisper_text = await transcribe_audio(file_bytes, audio_file.filename or "recording.webm")
            if whisper_text:
                spoken_text = whisper_text

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

    # Step 3: GPT-4o-mini analysis
    gpt_result = await analyze_with_gpt(target_text, spoken_text)

    if gpt_result:
        # Attach original texts to response
        gpt_result["target_text"] = target_text
        gpt_result["user_text"] = spoken_text
        # Ensure all required fields exist with defaults
        gpt_result.setdefault("scores", {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0, "intonation": 0, "stress": 0})
        gpt_result.setdefault("word_analysis", {"correct": [], "incorrect": [], "missing": [], "extra": []})
        gpt_result.setdefault("phonetic_issues", [])
        gpt_result.setdefault("stress_issues", [])
        gpt_result.setdefault("summary", "Анализ завершён.")
        return gpt_result

    # Fallback if GPT fails — basic comparison
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
        "summary": f"GPT недоступен. Базовый анализ: {len(correct)}/{len(target_words)} слов совпали.",
    }
