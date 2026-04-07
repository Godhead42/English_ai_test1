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

# ─────────────────────────────────────────────────────────────────
# Commonly mis-stressed words (for Kazakh / Russian speakers)
# ─────────────────────────────────────────────────────────────────

STRESS_WORDS = {
    "photograph":    {"correct_stress": "PHO-to-graph",   "common_mistake": "pho-TO-graph"},
    "photography":   {"correct_stress": "pho-TOG-ra-phy", "common_mistake": "PHO-to-gra-phy"},
    "photographer":  {"correct_stress": "pho-TOG-ra-pher","common_mistake": "PHO-to-gra-pher"},
    "develop":       {"correct_stress": "de-VEL-op",      "common_mistake": "DEV-el-op"},
    "development":   {"correct_stress": "de-VEL-op-ment", "common_mistake": "DEV-el-op-ment"},
    "comfortable":   {"correct_stress": "COMF-ta-ble",    "common_mistake": "com-FOR-ta-ble"},
    "interesting":   {"correct_stress": "IN-ter-est-ing", "common_mistake": "in-ter-EST-ing"},
    "temperature":   {"correct_stress": "TEM-pra-ture",   "common_mistake": "tem-per-A-ture"},
    "vegetable":     {"correct_stress": "VEJ-ta-ble",     "common_mistake": "ve-ge-TA-ble"},
    "advertisement": {"correct_stress": "ad-VER-tis-ment","common_mistake": "ad-ver-TISE-ment"},
    "hotel":         {"correct_stress": "ho-TEL",          "common_mistake": "HO-tel"},
    "police":        {"correct_stress": "po-LICE",         "common_mistake": "PO-lice"},
    "canal":         {"correct_stress": "ca-NAL",          "common_mistake": "CA-nal"},
    "machine":       {"correct_stress": "ma-CHINE",        "common_mistake": "MA-chine"},
    "event":         {"correct_stress": "e-VENT",          "common_mistake": "EV-ent"},
    "record":        {"correct_stress": "RE-cord (n) / re-CORD (v)", "common_mistake": "mixing noun/verb stress"},
    "present":       {"correct_stress": "PRE-sent (n) / pre-SENT (v)", "common_mistake": "mixing noun/verb stress"},
    "address":       {"correct_stress": "AD-dress (n) / ad-DRESS (v)", "common_mistake": "mixing noun/verb stress"},
    "increase":      {"correct_stress": "IN-crease (n) / in-CREASE (v)", "common_mistake": "mixing noun/verb stress"},
    "produce":       {"correct_stress": "PRO-duce (n) / pro-DUCE (v)", "common_mistake": "mixing noun/verb stress"},
    "necessary":     {"correct_stress": "NEC-es-sa-ry",   "common_mistake": "ne-CES-sa-ry"},
    "vocabulary":    {"correct_stress": "vo-CAB-u-la-ry", "common_mistake": "VO-cab-u-la-ry"},
    "particular":    {"correct_stress": "par-TIC-u-lar",  "common_mistake": "PAR-tic-u-lar"},
    "environment":   {"correct_stress": "en-VI-ron-ment", "common_mistake": "EN-vi-ron-ment"},
    "communicate":   {"correct_stress": "com-MU-ni-cate", "common_mistake": "COM-mu-ni-cate"},
}
