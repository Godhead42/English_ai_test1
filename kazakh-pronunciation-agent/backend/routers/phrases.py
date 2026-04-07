"""Phrases, levels, topics, and tongue twisters router."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from data.phrases import TOPICS, PHRASES_BY_TOPIC
from data.tongue_twisters import TONGUE_TWISTERS_BY_LEVEL

router = APIRouter()

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

    # If topic is specified, return all 50 phrases for that topic
    if topic:
        phrases = PHRASES_BY_TOPIC.get(topic)
        if phrases is None:
            return JSONResponse(status_code=400, content={"error": f"Unknown topic: {topic}"})
        return {"level": level, "topic": topic, "phrases": phrases}

    # If no topic, return all phrases across all topics
    all_phrases = []
    for tid, phrase_list in PHRASES_BY_TOPIC.items():
        all_phrases.extend(phrase_list)
    return {"level": level, "topic": "", "phrases": all_phrases}


@router.get("/api/tongue-twisters")
def get_tongue_twisters(level: str = "A1"):
    level = level.upper()
    if level not in VALID_LEVELS:
        return JSONResponse(status_code=400, content={"error": f"Invalid level."})
    return {"level": level, "tongue_twisters": TONGUE_TWISTERS_BY_LEVEL.get(level, [])}
