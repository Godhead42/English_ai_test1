"""Script to generate 3600 English phrases using GPT-4o-mini."""
import os
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
TOPICS = [
    {"id": "intro", "name": "Introducing Myself"},
    {"id": "family", "name": "My Family"},
    {"id": "traveling", "name": "Traveling"},
    {"id": "housework", "name": "Housework"},
    {"id": "shopping", "name": "Shopping"},
    {"id": "health", "name": "Health"},
    {"id": "sport", "name": "Sport"},
    {"id": "education", "name": "Education"},
    {"id": "career", "name": "Future Career"},
    {"id": "inventions", "name": "Inventions"},
    {"id": "it", "name": "Information Technologies"},
    {"id": "safety", "name": "Safety at Work"}
]

SYSTEM_PROMPT = """You are an expert English teacher. Generate exactly 50 distinct English phrases for a specific topic and CEFR level.
The phrases must range from short sentences to slightly longer ones based on the CEFR level.
Return STRICTLY a JSON object with a single key "phrases" containing a list of strings.
Example: {"phrases": ["First phrase.", "Second phrase."]}"""

async def generate_phrases_for_topic_level(topic, level, semaphore, retries=3):
    """Generate 50 phrases for a given topic and level."""
    async with semaphore:
        for attempt in range(retries):
            try:
                print(f"Generating for {topic['id']} - {level} (Attempt {attempt+1})")
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    temperature=0.7,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Generate 50 phrases for the topic '{topic['name']}' at {level} level."}
                    ]
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                phrases = data.get("phrases", [])
                
                # Check if generated roughly 50 (allow 48-52 just in case)
                if len(phrases) < 45:
                    print(f"Warning: only generated {len(phrases)} for {topic['id']} - {level}. Retrying...")
                    continue
                    
                print(f"SUCCESS: {topic['id']} - {level} ({len(phrases)} phrases)")
                return {"topic": topic["id"], "level": level, "phrases": phrases[:50]} # slice exactly 50
            except Exception as exc:
                print(f"Error for {topic['id']} - {level}: {exc}")
                await asyncio.sleep(2)
        print(f"FAILED to generate sufficient phrases for {topic['id']} - {level} after {retries} attempts.")
        return {"topic": topic["id"], "level": level, "phrases": []}


async def main():
    semaphore = asyncio.Semaphore(10) # limit concurrent requests
    tasks = []
    
    for topic in TOPICS:
        for level in LEVELS:
            tasks.append(generate_phrases_for_topic_level(topic, level, semaphore))
            
    print(f"Starting generation of {len(tasks)} combinations (target 3600 phrases)...")
    results = await asyncio.gather(*tasks)
    
    # Restructure into nested dictionary {topic: {level: ["phrase1", ...]}}
    structured_data = {}
    total_generated = 0
    
    for res in results:
        t_id = res["topic"]
        lvl = res["level"]
        phrs = res["phrases"]
        
        if t_id not in structured_data:
            structured_data[t_id] = {}
        structured_data[t_id][lvl] = phrs
        total_generated += len(phrs)
        
    output_path = os.path.join(os.path.dirname(__file__), 'data', 'phrases_generated.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(structured_data, f, ensure_ascii=False, indent=2)
        
    print(f"Generation complete! Total phrases: {total_generated}")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
