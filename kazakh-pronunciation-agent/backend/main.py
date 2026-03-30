from fastapi import FastAPI, UploadFile, File, Body, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from pydantic import BaseModel, EmailStr
from typing import Optional
import time
import httpx
import json
import difflib
import re
import io
from gtts import gTTS

from database import engine, get_db, Base
from models import User, PronunciationResult
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_optional_user,
)

app = FastAPI(title="English Pronunciation Agent API")


# ── Create tables on startup ─────────────────────
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created / verified")


# ── Pydantic schemas ─────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SaveResultRequest(BaseModel):
    phrase: str
    level: str
    overall_score: float
    accuracy: float = 0
    fluency: float = 0
    completeness: float = 0
    issue_count: int = 0

# Configure CORS for local development with Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://audlev.kstu.kz", "https://audlev.kstu.kz"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────
# CEFR Phrase Bank — everyday phrases (no tongue twisters)
# ─────────────────────────────────────────────────────────────────
PHRASES_BY_LEVEL = {
    "A1": [
        "Hello, my name is Anna.",
        "I live in a big city.",
        "The weather is nice today.",
        "I like to eat fruit and vegetables.",
        "Can you help me please?",
        "Where is the bus stop?",
        "I have two brothers and one sister.",
        "This is my friend Tom.",
        "I go to school every day.",
        "Thank you very much.",
    ],
    "A2": [
        "I like to drink a glass of water every morning.",
        "She does not eat meat, and neither do I.",
        "They usually take the bus, but often they walk.",
        "Where is the nearest garage?",
        "He bought a new mobile phone last week.",
        "Could you pass the tomato sauce, please?",
        "I need to buy some medicine and vitamins."
    ],
    "B1": [
        "Let's check the schedule for the next train.",
        "You can take either the train or the bus to get there.",
        "The advertisement on television was very persuasive.",
        "Which route are we taking to the beach today?",
        "We need to protect our personal privacy on the internet.",
        "Technology has changed the way we communicate with each other.",
        "I am planning to visit several European countries this summer.",
        "He suggested that we should try the new Italian restaurant.",
        "Regular exercise is essential for maintaining good health.",
        "I am looking forward to seeing you at the weekend."
    ],
    "B2": [
        "Despite the economic challenges, many businesses have managed to adapt and thrive.",
        "The research indicates that climate change is accelerating at an unprecedented rate.",
        "It is widely acknowledged that critical thinking skills are essential in the modern workplace.",
        "The government has implemented several measures to address the housing crisis.",
        "While there are advantages to working from home, it can also lead to isolation.",
        "The documentary shed light on the complexities of the healthcare system.",
        "Artificial intelligence is transforming industries across the globe.",
        "The ability to communicate effectively is crucial in any professional environment.",
        "Many experts argue that renewable energy sources are the key to a sustainable future.",
        "The cultural diversity of this neighbourhood makes it a vibrant place to live.",
    ],
    "C1": [
        "The implications of the new legislation are far-reaching and will undoubtedly reshape the industry.",
        "Notwithstanding the considerable opposition, the proposal was eventually approved by the committee.",
        "The correlation between socioeconomic status and educational attainment has been extensively documented.",
        "It could be argued that the proliferation of social media has fundamentally altered public discourse.",
        "The phenomenon of globalisation has brought about both unprecedented opportunities and significant challenges.",
        "In light of recent developments, it is imperative that we reassess our strategic priorities.",
        "The nuanced interplay between cultural identity and personal expression is a fascinating area of study.",
        "Whilst the methodology employed in this research is robust, certain limitations should be acknowledged.",
        "The philosophical underpinnings of this theory warrant further investigation and scholarly debate.",
        "Contemporary literature increasingly reflects the fragmented nature of postmodern identity.",
    ],
    "C2": [
        "The epistemological ramifications of this paradigm shift cannot be overstated, particularly as they pertain to interdisciplinary research methodologies.",
        "One might contend that the inexorable march of technological progress has engendered a paradoxical regression in interpersonal communication skills.",
        "The juxtaposition of these diametrically opposed philosophical frameworks serves to illuminate the inherent complexities of ethical reasoning.",
        "Notwithstanding the ostensibly compelling evidence to the contrary, the hypothesis remains fundamentally untenable upon closer scrutiny.",
        "The symbiotic relationship between linguistic diversity and cognitive flexibility has been corroborated by an overwhelming body of empirical research.",
        "It is incumbent upon policymakers to grapple with the multifaceted implications of demographic shifts on the sustainability of public welfare systems.",
        "The rhetorical strategies employed in this treatise betray a sophisticated understanding of persuasive discourse and audience engagement.",
        "An exhaustive analysis of the sociolinguistic landscape reveals the extent to which power dynamics are embedded within language itself.",
        "The dialectical tension between individual autonomy and collective responsibility constitutes one of the most enduring challenges in political philosophy.",
        "Predicated upon the assumption of rational agency, neoclassical economic theory has come under increasing scrutiny from behavioural economists.",
    ],
}

# ─────────────────────────────────────────────────────────────────
# Common pronunciation issues for English learners (by phoneme)
# ─────────────────────────────────────────────────────────────────
PHONETIC_ISSUES = {
    "th": {
        "words": ["the", "this", "that", "these", "those", "there", "their", "they",
                  "think", "thing", "thought", "through", "three", "throw", "than",
                  "then", "them", "though", "therefore", "theory", "theatre", "therapist",
                  "thesis", "thoroughly", "thrive", "threat", "threshold", "thirteenth",
                  "theme", "thermal", "thick", "thin", "third", "thirty", "thirteen",
                  "thousand", "thunder", "thus", "thumb", "thanksgiving",
                  "health", "wealth", "growth", "both", "with", "without", "within",
                  "beneath", "underneath", "width", "strengthen", "month", "earth",
                  "worth", "birth", "truth", "youth", "south", "north", "mouth",
                  "faith", "death", "path", "math", "bath", "cloth",
                  "weather", "whether", "feather", "gather", "rather", "father",
                  "mother", "brother", "another", "other", "together", "either",
                  "neither", "breathe", "smooth", "soothe", "bathe", "lathe",
                  "although", "notwithstanding", "methodology", "philosophical",
                  "nonetheless", "nevertheless", "furthermore", "hypothetical",
                  "sympathetic", "enthusiastic", "philanthropic", "therapeutic"],
        "ipa_correct": "/θ/ or /ð/",
        "common_error": "/s/, /z/, /t/, /d/, or /f/",
        "issue": "TH sound substitution",
        "tip": "Place the tip of your tongue gently between your upper and lower front teeth. Blow air for voiceless /θ/ (think), or vibrate vocal cords for voiced /ð/ (the)."
    },
    "w_v": {
        "words": ["we", "was", "were", "will", "would", "want", "work", "world", "water",
                  "away", "always", "between", "however", "while", "well", "way", "week",
                  "welcome", "whether", "wide", "wife", "window", "winter", "wish",
                  "woman", "women", "wood", "word", "worry", "worse", "worst",
                  "wonderful", "widespread", "overwhelming", "overwhelm"],
        "ipa_correct": "/w/",
        "common_error": "/v/",
        "issue": "W/V confusion",
        "tip": "For /w/, round your lips as if you're going to say 'oo'. For /v/, place your upper teeth on your lower lip."
    },
    "r_l": {
        "words": ["really", "read", "right", "already", "particularly", "regularly",
                  "relationship", "relatively", "reliance", "reliable", "religious",
                  "remarkable", "reluctant", "relentless", "relevant", "relief",
                  "correlation", "proliferation", "accelerating", "literature",
                  "cultural", "liberal", "mineral", "general", "several", "natural",
                  "plural", "rural", "oral", "moral", "federal"],
        "ipa_correct": "/r/ and /l/",
        "common_error": "mixing /r/ and /l/",
        "issue": "R/L confusion",
        "tip": "For /r/, curl your tongue back without touching the roof of your mouth. For /l/, place your tongue tip on the ridge behind your upper front teeth."
    },
    "short_long_vowels": {
        "words": ["live", "leave", "ship", "sheep", "sit", "seat", "slip", "sleep",
                  "fill", "feel", "bit", "beat", "hit", "heat", "fit", "feet",
                  "rich", "reach", "still", "steal", "bin", "been", "sin", "seen",
                  "lip", "leap", "pill", "peel", "mill", "meal", "dip", "deep",
                  "bid", "bead", "did", "deed", "grid", "greed", "hid", "heed",
                  "lid", "lead", "pick", "peak", "sick", "seek", "tick", "teak",
                  "wick", "week", "quiz", "squeeze"],
        "ipa_correct": "/ɪ/ vs /iː/",
        "common_error": "merging short /ɪ/ and long /iː/",
        "issue": "Short/long vowel confusion",
        "tip": "Short /ɪ/ is relaxed and quick (like in 'sit'). Long /iː/ is tense and stretched (like in 'seat'). Pay attention to mouth tension and duration."
    },
    "consonant_clusters": {
        "words": ["strengths", "months", "sixths", "twelfths", "prompts", "attempts",
                  "scripts", "sculpts", "glimpse", "exempt", "contempt",
                  "next", "text", "context", "pretext", "complex", "perplex",
                  "asked", "risked", "masked", "tasks", "desks", "disks",
                  "worlds", "builds", "fields", "holds", "folds", "colds",
                  "hands", "bands", "lands", "stands", "brands", "sands",
                  "products", "aspects", "impacts", "facts", "acts", "effects"],
        "ipa_correct": "full cluster pronunciation",
        "common_error": "dropping or simplifying consonant clusters",
        "issue": "Simplified consonant cluster",
        "tip": "Practice saying each consonant in sequence. Slow down at first: say 'stren-g-th-s' then gradually speed up until it's smooth."
    },
    "schwa": {
        "words": ["about", "above", "again", "ago", "along", "among", "around",
                  "away", "banana", "camera", "chocolate", "comfortable",
                  "different", "family", "favourite", "general", "history",
                  "important", "interesting", "natural", "necessary", "original",
                  "particular", "personal", "photograph", "possible", "probably",
                  "problem", "several", "temperature", "together", "vegetable",
                  "wonderful"],
        "ipa_correct": "/ə/ (schwa)",
        "common_error": "over-pronouncing unstressed syllables",
        "issue": "Missing schwa reduction",
        "tip": "The schwa /ə/ is the most common vowel in English. It's short, neutral, and relaxed. Don't stress every syllable equally."
    },
}

DIALECT_WORDS = {
    "schedule": {"british": "/ˈʃɛdjuːl/ (shed-yool)", "american": "/ˈskɛdʒuːl/ (sked-jool)"},
    "either": {"british": "/ˈaɪðə/ (eye-thuh)", "american": "/ˈiːðər/ (ee-thur)"},
    "neither": {"british": "/ˈnaɪðə/ (ny-thuh)", "american": "/ˈniːðər/ (nee-thur)"},
    "tomato": {"british": "/təˈmɑːtəʊ/ (tuh-mah-toe)", "american": "/təˈmeɪtoʊ/ (tuh-may-toe)"},
    "vase": {"british": "/vɑːz/ (vahz)", "american": "/veɪs/ (vays)"},
    "garage": {"british": "/ˈɡærɪdʒ/ (gar-idj)", "american": "/ɡəˈrɑːʒ/ (guh-rahzh)"},
    "advertisement": {"british": "/ədˈvɜːtɪsmənt/ (ad-ver-tis-ment)", "american": "/ˌædvərˈtaɪzmənt/ (ad-ver-tyze-ment)"},
    "mobile": {"british": "/ˈməʊbaɪl/ (moh-byle)", "american": "/ˈmoʊbəl/ (moh-bul)"},
    "route": {"british": "/ruːt/ (root)", "american": "/raʊt/ or /ruːt/ (rowt/root)"},
    "privacy": {"british": "/ˈprɪvəsi/ (priv-uh-see)", "american": "/ˈpraɪvəsi/ (pry-vuh-see)"},
    "vitamin": {"british": "/ˈvɪtəmɪn/ (vit-uh-min)", "american": "/ˈvaɪtəmɪn/ (vy-tuh-min)"},
    "often": {"british": "/ˈɒf(ə)n/ (off-en)", "american": "/ˈɔːf(ə)n/ (awf-en)"},
    "water": {"british": "/ˈwɔːtə/ (waw-tuh)", "american": "/ˈwɑːtər/ (wah-der)"},
    "can't": {"british": "/kɑːnt/ (kahnt)", "american": "/kænt/ (kant)"},
}


def normalize_text(text: str) -> str:
    """Lowercase, remove punctuation, collapse spaces."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def levenshtein_ratio(s1: str, s2: str) -> float:
    """Calculate similarity ratio using SequenceMatcher (0.0 to 1.0)."""
    return difflib.SequenceMatcher(None, s1, s2).ratio()


def word_level_analysis(target_words: list[str], user_words: list[str]) -> dict:
    """
    Perform word-by-word analysis comparing user speech to target text.
    Returns correct_words, incorrect_words, missing_words, extra_words, and phonetic_issues.
    """

    # Use SequenceMatcher to align words
    matcher = difflib.SequenceMatcher(None, target_words, user_words)

    correct_words = []
    incorrect_words = []
    missing_words = []
    extra_words = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for k in range(i1, i2):
                correct_words.append({
                    "word": target_words[k],
                    "status": "correct"
                })
        elif tag == 'replace':
            for k in range(i1, i2):
                target_word = target_words[k]
                # Find best matching user word
                user_word = user_words[j1 + (k - i1)] if (j1 + (k - i1)) < j2 else None
                if user_word:
                    word_sim = levenshtein_ratio(target_word, user_word)
                    if word_sim >= 0.7:
                        # Close but not exact — partial match
                        incorrect_words.append({
                            "word": target_word,
                            "spoken_as": user_word,
                            "similarity": round(word_sim * 100),
                            "status": "mispronounced"
                        })
                    else:
                        incorrect_words.append({
                            "word": target_word,
                            "spoken_as": user_word,
                            "similarity": round(word_sim * 100),
                            "status": "wrong"
                        })
                else:
                    missing_words.append({
                        "word": target_word,
                        "status": "missing"
                    })
            # Any extra user words in this block
            extra_user_count = (j2 - j1) - (i2 - i1)
            if extra_user_count > 0:
                for k in range(j2 - extra_user_count, j2):
                    extra_words.append({
                        "word": user_words[k],
                        "status": "extra"
                    })
        elif tag == 'insert':
            for k in range(j1, j2):
                extra_words.append({
                    "word": user_words[k],
                    "status": "extra"
                })
        elif tag == 'delete':
            for k in range(i1, i2):
                missing_words.append({
                    "word": target_words[k],
                    "status": "missing"
                })

    return {
        "correct": correct_words,
        "incorrect": incorrect_words,
        "missing": missing_words,
        "extra": extra_words,
    }


def detect_phonetic_issues(incorrect_words: list[dict], missing_words: list[dict]) -> list[dict]:
    """
    Cross-reference incorrect/missing words with known phonetic issues and dialect differences.
    """
    issues = []
    flagged = set()

    all_problem_words = []
    for w in incorrect_words:
        all_problem_words.append(w["word"])
    for w in missing_words:
        all_problem_words.append(w["word"])

    for word in all_problem_words:
        # Check standard phonetic issues
        for category_key, info in PHONETIC_ISSUES.items():
            if word in info["words"] and word not in flagged:
                spoken_as = None
                for iw in incorrect_words:
                    if iw["word"] == word:
                        spoken_as = iw.get("spoken_as", None)
                        break

                issues.append({
                    "word": word,
                    "spoken_as": spoken_as,
                    "category": category_key,
                    "ipa_correct": info["ipa_correct"],
                    "common_error": info["common_error"],
                    "issue": info["issue"],
                    "tip": info["tip"],
                })
                flagged.add(word)

        # Check for American vs British dialect differences
        if word in DIALECT_WORDS:
            spoken_as = None
            for iw in incorrect_words:
                if iw["word"] == word:
                    spoken_as = iw.get("spoken_as", None)
                    break

            dialect_info = DIALECT_WORDS[word]
            issues.append({
                "word": word,
                "spoken_as": spoken_as,
                "category": "dialect_difference",
                "ipa_correct": f"UK: {dialect_info['british']} | US: {dialect_info['american']}",
                "common_error": "Speech recognition may mishear due to US/UK differences.",
                "issue": "American vs British Pronunciation",
                "tip": f"By Cambridge standards, the preferred British pronunciation is {dialect_info['british']}. The American pronunciation is {dialect_info['american']}. Both are acceptable, but STT might have misrecognized it based on accent!"
            })
            flagged.add(word + "_dialect")

    return issues


def calculate_scores(target_text: str, user_text: str, word_analysis: dict) -> dict:
    """
    Calculate accuracy, fluency, and overall scores based on word analysis.
    """
    target_words = normalize_text(target_text).split()
    user_words = normalize_text(user_text).split()

    total_target = len(target_words)
    if total_target == 0:
        return {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0}

    # Accuracy: text similarity at character level
    char_similarity = levenshtein_ratio(normalize_text(target_text), normalize_text(user_text))

    # Completeness: % of target words correctly spoken
    correct_count = len(word_analysis["correct"])
    completeness = correct_count / total_target

    # Word-level accuracy: (correct + partial) / total
    partial_count = sum(1 for w in word_analysis["incorrect"] if w.get("similarity", 0) >= 70)
    word_accuracy = (correct_count + (partial_count * 0.5)) / total_target

    # Fluency: penalize extra words and big length differences
    length_ratio = min(len(user_words), total_target) / max(len(user_words), total_target) if max(len(user_words), total_target) > 0 else 0
    extra_penalty = len(word_analysis["extra"]) / max(total_target, 1)
    fluency = max(0, length_ratio - extra_penalty * 0.3)

    # Overall: weighted combination
    overall = (char_similarity * 0.3 + word_accuracy * 0.4 + completeness * 0.2 + fluency * 0.1)

    return {
        "overall": round(overall * 100),
        "accuracy": round(word_accuracy * 100),
        "fluency": round(fluency * 100),
        "completeness": round(completeness * 100),
    }


# ─────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}


@app.get("/api/phrases")
def get_phrases(level: str = "A1"):
    """Return phrases for a given CEFR level."""
    level = level.upper()
    if level not in PHRASES_BY_LEVEL:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid level. Choose from: {', '.join(PHRASES_BY_LEVEL.keys())}"}
        )
    return {"level": level, "phrases": PHRASES_BY_LEVEL[level]}


@app.get("/api/levels")
def get_levels():
    """Return available CEFR levels with descriptions."""
    return {
        "levels": [
            {"code": "A1", "name": "Beginner", "description": "Simple everyday phrases and greetings"},
            {"code": "A2", "name": "Elementary", "description": "Common daily expressions and routines"},
            {"code": "B1", "name": "Intermediate", "description": "Clear speech on familiar topics"},
            {"code": "B2", "name": "Upper Intermediate", "description": "Complex topics with fluency"},
            {"code": "C1", "name": "Advanced", "description": "Sophisticated language and nuance"},
            {"code": "C2", "name": "Proficiency", "description": "Near-native precision and mastery"},
        ]
    }


@app.post("/api/analyze")
async def analyze_pronunciation(
    target_text: str = Form(...),
    user_text: str = Form(""),
):
    """
    Analyze pronunciation by comparing target text with what the user actually said.
    
    - target_text: the phrase the user was supposed to read
    - user_text: what the speech recognition captured from the user
    
    Returns detailed word-by-word analysis, scores, and phonetic tips.
    """

    # Handle empty user text
    if not user_text.strip():
        return {
            "scores": {"overall": 0, "accuracy": 0, "fluency": 0, "completeness": 0},
            "word_analysis": {
                "correct": [],
                "incorrect": [],
                "missing": [{"word": w, "status": "missing"} for w in normalize_text(target_text).split()],
                "extra": [],
            },
            "phonetic_issues": [],
            "target_text": target_text,
            "user_text": "",
            "summary": "No speech was detected. Please try again and speak more clearly into the microphone.",
        }

    # Normalize both texts
    target_normalized = normalize_text(target_text)
    user_normalized = normalize_text(user_text)

    target_words = target_normalized.split()
    user_words = user_normalized.split()

    # Perform word-level analysis
    analysis = word_level_analysis(target_words, user_words)

    # Detect phonetic issues
    phonetic_issues = detect_phonetic_issues(analysis["incorrect"], analysis["missing"])

    # Calculate scores
    scores = calculate_scores(target_text, user_text, analysis)

    # Generate summary
    correct_count = len(analysis["correct"])
    total_count = len(target_words)
    issue_count = len(analysis["incorrect"]) + len(analysis["missing"])

    if scores["overall"] >= 90:
        summary = f"Excellent pronunciation! You correctly spoke {correct_count}/{total_count} words."
    elif scores["overall"] >= 70:
        summary = f"Good effort! {correct_count}/{total_count} words were correct. Focus on the highlighted words below."
    elif scores["overall"] >= 50:
        summary = f"Keep practicing! {correct_count}/{total_count} words matched. Review the detailed feedback below."
    else:
        summary = f"It seems like the spoken text was quite different from the target. {correct_count}/{total_count} words matched. Please try reading the phrase again carefully."

    return {
        "scores": scores,
        "word_analysis": analysis,
        "phonetic_issues": phonetic_issues,
        "target_text": target_text,
        "user_text": user_text,
        "summary": summary,
    }


@app.get("/api/tts")
def text_to_speech(text: str, slow: bool = False):
    """
    Convert text to speech using Google TTS.
    Returns an MP3 audio stream.
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text is required"})
    
    try:
        tts = gTTS(text=text, lang='en', slow=slow)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


N8N_WEBHOOK_URL = "https://n8n.kstu.kz/webhook/english-ai-agent"

@app.post("/chat")
async def chat_with_ai(request: Request, message: str = Body(..., embed=True)):
    # Используем IP клиента как уникальный session_id для Simple Memory
    session_id = request.client.host if request.client else "anonymous"
    try:
        async with httpx.AsyncClient() as client:
            print(f"Sending to n8n: {message} (session: {session_id})")
            response = await client.post(
                N8N_WEBHOOK_URL, 
                json={"content": message, "session_id": session_id},
                timeout=60.0
            )
            
            print(f"n8n status: {response.status_code}")
            print(f"n8n response: {response.text}")
            
            if response.status_code != 200:
                return {"reply": f"⚠️ AI service error (status {response.status_code}). Make sure the n8n workflow is published."}
            
            return {"reply": response.text}
    except httpx.TimeoutException:
        return {"reply": "⚠️ The AI is taking too long to respond. Please try again."}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"reply": "⚠️ Could not connect to AI service. Please try again later."}

# ─────────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        return JSONResponse(status_code=400, content={"detail": "Email already registered"})
    
    user = User(
        email=req.email,
        name=req.name,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level}}


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        return JSONResponse(status_code=401, content={"detail": "Invalid email or password"})
    
    token = create_token(user.id)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "level": user.level}}


@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "level": user.level}


# ─────────────────────────────────────────────────────────────────
# Progress Endpoints
# ─────────────────────────────────────────────────────────────────

@app.post("/api/progress")
def save_progress(req: SaveResultRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = PronunciationResult(
        user_id=user.id,
        phrase=req.phrase,
        level=req.level,
        overall_score=req.overall_score,
        accuracy=req.accuracy,
        fluency=req.fluency,
        completeness=req.completeness,
        issue_count=req.issue_count,
    )
    db.add(result)
    db.commit()
    return {"status": "saved"}


@app.get("/api/progress")
def get_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = (
        db.query(PronunciationResult)
        .filter(PronunciationResult.user_id == user.id)
        .order_by(PronunciationResult.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "results": [
            {
                "id": r.id,
                "phrase": r.phrase,
                "level": r.level,
                "overall_score": r.overall_score,
                "accuracy": r.accuracy,
                "fluency": r.fluency,
                "completeness": r.completeness,
                "issue_count": r.issue_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in results
        ]
    }


@app.get("/api/progress/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(PronunciationResult).filter(PronunciationResult.user_id == user.id)
    
    total = query.count()
    if total == 0:
        return {"total_sessions": 0, "avg_overall": 0, "avg_accuracy": 0, "avg_fluency": 0, "avg_completeness": 0, "best_score": 0, "improvement": 0}
    
    stats = db.query(
        sa_func.avg(PronunciationResult.overall_score),
        sa_func.avg(PronunciationResult.accuracy),
        sa_func.avg(PronunciationResult.fluency),
        sa_func.avg(PronunciationResult.completeness),
        sa_func.max(PronunciationResult.overall_score),
    ).filter(PronunciationResult.user_id == user.id).first()
    
    # Calculate improvement: difference between avg of last 5 and first 5 sessions
    first_5 = query.order_by(PronunciationResult.created_at.asc()).limit(5).all()
    last_5 = query.order_by(PronunciationResult.created_at.desc()).limit(5).all()
    
    avg_first = sum(r.overall_score for r in first_5) / len(first_5) if first_5 else 0
    avg_last = sum(r.overall_score for r in last_5) / len(last_5) if last_5 else 0
    improvement = round(avg_last - avg_first, 1)
    
    return {
        "total_sessions": total,
        "avg_overall": round(stats[0] or 0, 1),
        "avg_accuracy": round(stats[1] or 0, 1),
        "avg_fluency": round(stats[2] or 0, 1),
        "avg_completeness": round(stats[3] or 0, 1),
        "best_score": round(stats[4] or 0, 1),
        "improvement": improvement,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
