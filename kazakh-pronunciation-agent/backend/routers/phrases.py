"""Phrases, levels, topics, and tongue twisters router."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

import os
import json
from data.phrases import TOPICS
from data.tongue_twisters import TONGUE_TWISTERS_BY_LEVEL

router = APIRouter()

GENERATED_PHRASES = {}
try:
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "phrases_generated.json")
    with open(json_path, "r", encoding="utf-8") as f:
        GENERATED_PHRASES = json.load(f)
except Exception as e:
    print(f"Warning: Could not load generated phrases: {e}")

LEVELS = [
    {"code": "A1", "name": "Beginner",            "description": "Simple everyday phrases and greetings"},
    {"code": "A2", "name": "Elementary",           "description": "Common daily expressions and routines"},
    {"code": "B1", "name": "Intermediate",         "description": "Clear speech on familiar topics"},
    {"code": "B2", "name": "Upper Intermediate",   "description": "Complex topics with fluency"},
    {"code": "C1", "name": "Advanced",             "description": "Sophisticated language and nuance"},
    {"code": "C2", "name": "Proficiency",          "description": "Near-native precision and mastery"},
]

VALID_LEVELS = {l["code"] for l in LEVELS}


@router.get("/api/levels")
def get_levels():
    return {"levels": LEVELS}


@router.get("/api/topics")
def get_topics():
    return {"topics": TOPICS}


@router.get("/api/phrases")
def get_phrases(level: str = "A1", topic: str = ""):
    level = level.upper()
    if level not in VALID_LEVELS:
        return JSONResponse(status_code=400, content={"error": f"Invalid level. Choose from: {', '.join(VALID_LEVELS)}"})

    # If topic is specified, return phrases for that topic+level
    if topic:
        topic_data = GENERATED_PHRASES.get(topic)
        if not topic_data:
            return JSONResponse(status_code=400, content={"error": f"Unknown topic: {topic}"})
        phrases = topic_data.get(level, [])
        return {"level": level, "topic": topic, "phrases": phrases}

    # If no topic, return all phrases for that level across all topics
    all_phrases = []
    for tid, levels_dict in GENERATED_PHRASES.items():
        all_phrases.extend(levels_dict.get(level, []))
    return {"level": level, "topic": "", "phrases": all_phrases}


@router.get("/api/tongue-twisters")
def get_tongue_twisters(level: str = "A1"):
    level = level.upper()
    if level not in VALID_LEVELS:
        return JSONResponse(status_code=400, content={"error": f"Invalid level."})
    return {"level": level, "tongue_twisters": TONGUE_TWISTERS_BY_LEVEL.get(level, [])}
