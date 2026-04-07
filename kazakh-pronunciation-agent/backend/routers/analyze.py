"""Pronunciation analysis router — /api/analyze."""

import re
import difflib
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from data.phonetics import PHONETIC_ISSUES, DIALECT_WORDS, STRESS_WORDS
from services.audio import transcribe_audio

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def levenshtein_ratio(s1: str, s2: str) -> float:
    return difflib.SequenceMatcher(None, s1, s2).ratio()


def word_level_analysis(target_words: list[str], user_words: list[str]) -> dict:
    matcher = difflib.SequenceMatcher(None, target_words, user_words)
    correct, incorrect, missing, extra = [], [], [], []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for k in range(i1, i2):
                correct.append({"word": target_words[k], "status": "correct"})
        elif tag == "replace":
            for k in range(i1, i2):
                tw = target_words[k]
                uw = user_words[j1 + (k - i1)] if (j1 + (k - i1)) < j2 else None
                if uw:
                    sim = levenshtein_ratio(tw, uw)
                    incorrect.append({
                        "word": tw,
                        "spoken_as": uw,
                        "similarity": round(sim * 100),
                        "status": "mispronounced" if sim >= 0.7 else "wrong",
                    })
                else:
                    missing.append({"word": tw, "status": "missing"})
            extra_n = (j2 - j1) - (i2 - i1)
            if extra_n > 0:
                for k in range(j2 - extra_n, j2):
                    extra.append({"word": user_words[k], "status": "extra"})
        elif tag == "insert":
            for k in range(j1, j2):
                extra.append({"word": user_words[k], "status": "extra"})
        elif tag == "delete":
            for k in range(i1, i2):
                missing.append({"word": target_words[k], "status": "missing"})

    return {"correct": correct, "incorrect": incorrect, "missing": missing, "extra": extra}


def detect_phonetic_issues(incorrect_words, missing_words):
    issues, flagged = [], set()
    all_words = [w["word"] for w in incorrect_words] + [w["word"] for w in missing_words]

    for word in all_words:
        for cat_key, info in PHONETIC_ISSUES.items():
            if word in info["words"] and word not in flagged:
                spoken = next((iw.get("spoken_as") for iw in incorrect_words if iw["word"] == word), None)
                issues.append({
                    "word": word, "spoken_as": spoken, "category": cat_key,
                    "ipa_correct": info["ipa_correct"], "common_error": info["common_error"],
                    "issue": info["issue"], "tip": info["tip"],
                })
                flagged.add(word)

        if word in DIALECT_WORDS:
            di = DIALECT_WORDS[word]
            spoken = next((iw.get("spoken_as") for iw in incorrect_words if iw["word"] == word), None)
            issues.append({
                "word": word, "spoken_as": spoken, "category": "dialect_difference",
                "ipa_correct": f"UK: {di['british']} | US: {di['american']}",
                "common_error": "Accent-based recognition mismatch.",
                "issue": "American vs British Pronunciation",
                "tip": f"British: {di['british']}, American: {di['american']}. Both acceptable!",
            })
            flagged.add(word + "_dialect")

    return issues


def detect_stress_issues(target_text: str, user_text: str):
    """Flag words that are commonly mis-stressed by Kazakh/Russian speakers."""
    issues = []
    target_words = normalize_text(target_text).split()
    for word in target_words:
        if word in STRESS_WORDS:
            info = STRESS_WORDS[word]
            issues.append({
                "word": word,
                "correct_stress": info["correct_stress"],
                "common_mistake": info["common_mistake"],
                "tip": f"Stress pattern: {info['correct_stress']}. Common mistake: {info['common_mistake']}.",
            })
    return issues


def calculate_intonation(target_text: str, user_text: str) -> int:
    """Heuristic intonation score based on punctuation & length matching."""
    target_t = target_text.strip()
    user_t = user_text.strip()
    score = 80  # base

    # Question intonation
    if target_t.endswith("?") and not user_t.endswith("?"):
        score -= 15
    # Exclamation emphasis
    if target_t.endswith("!") and not user_t.endswith("!"):
        score -= 10

    # Length ratio as proxy for pausing/rhythm
    tl, ul = len(target_t.split()), len(user_t.split())
    if tl > 0:
        ratio = min(tl, ul) / max(tl, ul)
        score = int(score * max(ratio, 0.5))

    return max(0, min(100, score))


def calculate_scores(target_text, user_text, word_analysis):
    target_words = normalize_text(target_text).split()
    user_words = normalize_text(user_text).split()
    total = len(target_words)
    if total == 0:
        return {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0, "intonation": 0, "stress": 0}

    char_sim = levenshtein_ratio(normalize_text(target_text), normalize_text(user_text))
    correct_n = len(word_analysis["correct"])
    completeness = correct_n / total
    partial = sum(1 for w in word_analysis["incorrect"] if w.get("similarity", 0) >= 70)
    word_acc = (correct_n + partial * 0.5) / total
    length_ratio = min(len(user_words), total) / max(len(user_words), total) if max(len(user_words), total) > 0 else 0
    extra_penalty = len(word_analysis["extra"]) / max(total, 1)
    fluency = max(0, length_ratio - extra_penalty * 0.3)

    intonation = calculate_intonation(target_text, user_text)

    # Stress score: proportion of stress-sensitive words spoken correctly
    stress_words_in_target = [w for w in normalize_text(target_text).split() if w in STRESS_WORDS]
    if stress_words_in_target:
        correct_stress = sum(1 for w in stress_words_in_target if w in [c["word"] for c in word_analysis["correct"]])
        stress_score = round(correct_stress / len(stress_words_in_target) * 100)
    else:
        stress_score = 100  # no stress-sensitive words → full marks

    overall = char_sim * 0.25 + word_acc * 0.35 + completeness * 0.2 + fluency * 0.1 + (intonation / 100) * 0.05 + (stress_score / 100) * 0.05

    return {
        "overall": round(overall * 100),
        "accuracy": round(word_acc * 100),
        "fluency": round(fluency * 100),
        "completeness": round(completeness * 100),
        "intonation": intonation,
        "stress": stress_score,
    }


# ── endpoint ─────────────────────────────────────────────────────

@router.post("/api/analyze")
async def analyze_pronunciation(
    target_text: str = Form(...),
    user_text: str = Form(""),
    audio_file: UploadFile = File(None),
):
    recognised = user_text.strip()

    if audio_file:
        backend_text = await transcribe_audio(audio_file)
        if backend_text:
            recognised = backend_text

    if not recognised:
        tw = normalize_text(target_text).split()
        return {
            "scores": {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0, "intonation": 0, "stress": 0},
            "word_analysis": {"correct": [], "incorrect": [], "missing": [{"word": w, "status": "missing"} for w in tw], "extra": []},
            "phonetic_issues": [],
            "stress_issues": [],
            "target_text": target_text,
            "user_text": "",
            "summary": "No speech detected. Check your microphone and try again.",
        }

    tw = normalize_text(target_text).split()
    uw = normalize_text(recognised).split()
    wa = word_level_analysis(tw, uw)
    pi = detect_phonetic_issues(wa["incorrect"], wa["missing"])
    si = detect_stress_issues(target_text, recognised)
    scores = calculate_scores(target_text, recognised, wa)

    matched = len(wa["correct"])
    total = len(tw)
    summary = f"{'Excellent!' if scores['overall'] >= 80 else 'Keep practicing!'} {matched}/{total} words matched."

    return {
        "scores": scores,
        "word_analysis": wa,
        "phonetic_issues": pi,
        "stress_issues": si,
        "target_text": target_text,
        "user_text": recognised,
        "summary": summary,
    }
