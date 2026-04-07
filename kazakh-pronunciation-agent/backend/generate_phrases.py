"""
Generate 3600 phrases (50 per topic × 12 topics × 6 levels)
using OpenAI GPT-4o-mini, then write them to data/phrases.py.

Run: python generate_phrases.py
Requires OPENAI_API_KEY in .env
"""
import os, json, sys, asyncio
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

TOPICS = [
    ("introducing_myself", "Introducing Myself"),
    ("my_family", "My Family"),
    ("traveling", "Traveling"),
    ("housework", "Housework"),
    ("shopping", "Shopping"),
    ("health", "Health"),
    ("sport", "Sport"),
    ("education", "Education"),
    ("future_career", "Future Career"),
    ("inventions", "Inventions"),
    ("info_tech", "Information Technologies"),
    ("safety_at_work", "Safety at Work"),
]

ICONS = {
    "introducing_myself": "👋", "my_family": "👨‍👩‍👧‍👦", "traveling": "✈️",
    "housework": "🏠", "shopping": "🛒", "health": "🏥",
    "sport": "⚽", "education": "🎓", "future_career": "💼",
    "inventions": "💡", "info_tech": "💻", "safety_at_work": "🦺",
}

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

LEVEL_DESCRIPTIONS = {
    "A1": "Very simple, short sentences (3-8 words). Basic vocabulary only. Example: 'I like my dog.'",
    "A2": "Simple sentences (6-14 words). Common daily expressions. Example: 'I usually go shopping on Saturday morning.'",
    "B1": "Clear, moderate sentences (10-20 words). Express opinions. Example: 'I believe that regular exercise is very important for good health.'",
    "B2": "Complex sentences (15-25 words). Nuanced language. Example: 'The proliferation of online platforms has fundamentally transformed how consumers make purchasing decisions.'",
    "C1": "Sophisticated sentences (18-30 words). Academic register. Example: 'The sociological dimensions of domestic labour have attracted considerable scholarly attention in recent decades.'",
    "C2": "Masterful sentences (20-35 words). Near-native precision, academic/philosophical. Example: 'The epistemological underpinnings of evidence-based medicine warrant careful philosophical scrutiny in light of emerging paradigms.'",
}

sem = asyncio.Semaphore(15)  # Max 15 concurrent requests to avoid rate limits

async def generate_phrases_for_topic_level(topic_id: str, topic_name: str, level: str, existing: list[str] = []) -> list[str]:
    """Generate 50 unique phrases for a given topic and CEFR level."""
    prompt = f"""Generate exactly 50 unique English sentences/phrases about the topic "{topic_name}" at CEFR level {level}.

Level {level} guidelines: {LEVEL_DESCRIPTIONS[level]}

Requirements:
- Exactly 50 phrases, each on a new line
- Each phrase must be a complete, grammatically correct English sentence
- Phrases should be diverse — cover different aspects of the topic
- Use vocabulary and grammar appropriate for {level} level
- Include useful pronunciation patterns (th, w/v, r/l, consonant clusters, etc.) where natural
- No numbering, no bullet points, no quotes — just the sentences, one per line
- Do NOT repeat any of these existing phrases: {json.dumps(existing[:10]) if existing else 'none'}

Return ONLY the 50 sentences, one per line, nothing else."""

    async with sem:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.9,
                max_tokens=4000,
                messages=[
                    {"role": "system", "content": "You are an expert English language teacher creating practice phrases for pronunciation training. Output only the requested sentences, nothing else."},
                    {"role": "user", "content": prompt},
                ],
            )
            text = response.choices[0].message.content.strip()
            lines = [l.strip().strip('"').strip("'").lstrip("0123456789.-) ") for l in text.split("\n") if l.strip()]
            lines = [l for l in lines if len(l) > 5 and l[0].isupper()]
            return lines[:50]
        except Exception as e:
            print(f"\\nERROR generating {topic_name}/{level}: {e}")
            return []

async def worker(tid, tname, level, all_data):
    print(f"Starting {tid}/{level}...")
    phrases = await generate_phrases_for_topic_level(tid, tname, level)
    count = len(phrases)
    if count < 50:
        print(f"{tid}/{level}: Got {count}, retrying for more...")
        extra = await generate_phrases_for_topic_level(tid, tname, level, phrases)
        phrases.extend(extra)
        phrases = list(dict.fromkeys(phrases))[:50]
        count = len(phrases)
    all_data[tid][level] = phrases
    print(f"✓ {tid}/{level} done ({count} phrases)")

async def main():
    output_path = Path(__file__).parent / "data" / "phrases.py"
    all_data = {tid: {} for tid, _ in TOPICS}
    
    tasks = []
    for tid, tname in TOPICS:
        for level in LEVELS:
            tasks.append(worker(tid, tname, level, all_data))
            
    print(f"Starting generation of {len(tasks)} batches concurrently...")
    await asyncio.gather(*tasks)

    print(f"\\nWriting to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write('# ─────────────────────────────────────────────────────────────────\\n')
        f.write('# Topics & Phrases — 12 topics × 6 CEFR levels × 50 phrases = 3600\\n')
        f.write('# Generated by generate_phrases.py\\n')
        f.write('# ─────────────────────────────────────────────────────────────────\\n\\n')

        # TOPICS list
        f.write('TOPICS = [\\n')
        for tid, tname in TOPICS:
            icon = ICONS[tid]
            f.write(f'    {{"id": "{tid}", "name": "{tname}", "icon": "{icon}"}},\\n')
        f.write(']\\n\\n')

        # PHRASES_BY_TOPIC
        f.write('PHRASES_BY_TOPIC: dict[str, dict[str, list[str]]] = {\\n')
        for i, (tid, tname) in enumerate(TOPICS):
            f.write(f'    # ── {i+1}. {tname} {"─" * (40 - len(tname))}\\n')
            f.write(f'    "{tid}": {{\n')
            for level in LEVELS:
                phrases = all_data[tid].get(level, [])
                f.write(f'        "{level}": [\\n')
                for phrase in phrases:
                    escaped = phrase.replace('\\\\', '\\\\\\\\').replace('"', '\\\\"')
                    f.write(f'            "{escaped}",\\n')
                f.write(f'        ],\\n')
            f.write(f'    }},\\n')
        f.write('}\\n')

    total_phrases = sum(len(p) for td in all_data.values() for p in td.values())
    print(f"\\n✅ Done! Generated {total_phrases} phrases and saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
