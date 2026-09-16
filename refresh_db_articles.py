import json
import uuid
import os
import sys
import time

# Windows UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from services.nlp_engine import generate_groq_ai_content, clean_noise_from_text

LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "local_db.json")

GENERIC_PATTERNS = [
    "what specific action or finding was reported regarding",
    "what outcome or concluding statement was reported",
    "what major development or issue was reported regarding",
    "what key factual detail regarding",
    "what primary action or event involving",
    "were reported in connection with",
    "what total financial figure"
]

def is_generic_quiz(quizzes):
    if not quizzes or len(quizzes) == 0:
        return True
    for q in quizzes:
        q_lower = q.get("question_text", "").lower()
        if any(pat in q_lower for pat in GENERIC_PATTERNS):
            return True
    return False

def refresh_articles():
    if not os.path.exists(LOCAL_DB_FILE):
        print("local_db.json not found.")
        return

    with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
        db = json.load(f)

    raw_articles = db.get("articles", [])
    print(f"Total articles in database: {len(raw_articles)}")

    # Deduplicate articles by normalized headline
    seen_headlines = set()
    dedup_articles = []
    for art in raw_articles:
        h = (art.get("simplified_headline") or art.get("headline", "")).strip().lower()
        if h and h not in seen_headlines:
            seen_headlines.add(h)
            dedup_articles.append(art)

    print(f"Unique articles after deduplication: {len(dedup_articles)}")

    updated_count = 0
    for idx, art in enumerate(dedup_articles):
        quizzes = art.get("quizzes", [])
        if not is_generic_quiz(quizzes):
            continue

        headline = art.get("simplified_headline") or art.get("headline", "")
        print(f"[{idx+1}/{len(dedup_articles)}] Upgrading Generic Quizzes for: {headline[:60]}...")

        orig_raw = art.get("original", {}).get("raw_text") or art.get("original_text") or art.get("simplified_text") or headline
        clean_input = clean_noise_from_text(orig_raw)
        if not clean_input or len(clean_input) < 30:
            clean_input = headline + ". " + art.get("simplified_text", "")

        groq_data = generate_groq_ai_content(clean_input, headline=headline)
        if groq_data and groq_data.get("quizzes"):
            art["simplified_text"] = groq_data["summary"]
            art["word_count"] = len(groq_data["summary"].split())
            art["genre"] = groq_data["genre"]
            
            # Format quizzes
            new_quizzes = []
            for q_data in groq_data.get("quizzes", []):
                new_quizzes.append({
                    "id": str(uuid.uuid4()),
                    "question_text": q_data["question_text"],
                    "question_type": q_data.get("question_type", "factual"),
                    "answers": [
                        {
                            "id": str(uuid.uuid4()),
                            "text": a["text"],
                            "answer_text": a["text"],
                            "is_correct": a["is_correct"]
                        } for a in q_data.get("answers", [])
                    ]
                })
            art["quizzes"] = new_quizzes
            updated_count += 1
            print(f"   -> [SUCCESS] Generated: \"{new_quizzes[0]['question_text']}\"")
        else:
            print(f"   -> [SKIPPED] Groq did not return valid quizzes.")

        # Rate limit breather
        time.sleep(1.8)

        # Merge and save safely preserving users and bookmarks
        current_db = {}
        if os.path.exists(LOCAL_DB_FILE):
            try:
                with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f_in:
                    current_db = json.load(f_in)
            except Exception:
                pass
        current_db["articles"] = dedup_articles
        if "users" not in current_db:
            current_db["users"] = db.get("users", [])
        if "bookmarks" not in current_db:
            current_db["bookmarks"] = db.get("bookmarks", [])
        if "metrics" not in current_db:
            current_db["metrics"] = db.get("metrics", [])

        with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(current_db, f, indent=2, default=str)

    print(f"\nAll done! Successfully upgraded {updated_count} articles to high-quality Groq quizzes.")

if __name__ == "__main__":
    refresh_articles()
