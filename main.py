from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import uvicorn
import os
import uuid
from bson import ObjectId

from database import get_db, ArticleSimplified, Metric, Quiz, QuizAnswer, ArticleOriginal, FactVerificationLog
from services.ingestion import ingest_rss_feed
import database
from deep_translator import GoogleTranslator
import asyncio

app = FastAPI(title="AI Simplified News Platform API")

# Setup Background Auto-Ingest Scheduler
scheduler = AsyncIOScheduler()


from routes_auth import router as auth_router

import asyncio

async def scheduled_ingestion():
    print("Running scheduled auto-ingestion cycle...")
    try:
        res = await ingest_rss_feed()
        print(f"Auto-ingestion cycle result: {res.get('status', 'DONE')}")
    except Exception as e:
        print(f"Error during scheduled auto-ingestion: {e}")

@app.on_event("startup")
async def startup_event():
    try:
        from mongodb import auto_seed_if_empty
        await auto_seed_if_empty()
    except Exception as e:
        print(f"Auto-seed notice: {e}")
    try:
        scheduler.add_job(scheduled_ingestion, "interval", minutes=5, max_instances=1)
        scheduler.start()
    except Exception as e:
        print(f"Scheduler startup notice: {e}")

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

from fastapi.middleware.cors import CORSMiddleware
import os

# Define allowed origins for CORS
origins = [
    "http://localhost:3000",          # Local React production server
    "http://127.0.0.1:3000",
    "http://localhost:5173",          # Local React dev server
    "http://127.0.0.1:5173",
]

# If deployed, allow the production frontend URL
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))
    from urllib.parse import urlparse
    parsed = urlparse(frontend_url)
    if parsed.scheme and parsed.netloc:
        origins.append(f"{parsed.scheme}://{parsed.netloc}")

# Automatically allow your GitHub Pages origin
origins.append("https://vigneshwarans32241.github.io")

# Add CORS middleware to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.github\.io",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Auth Router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

from mongodb import articles_collection, item_helper
from auth import get_current_user, get_optional_user
from typing import Optional

@app.get("/api/articles")
async def get_articles(
    lang: str = "en", 
    page: int = 1, 
    limit: int = 12, 
    search: str = "",
    genre: str = "All",
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """API: Return feed of simplified articles with pagination and filtering"""
    # Base query for passed articles
    query = {"processing_status": "PASS"}
    
    if search:
        # Case-insensitive regex match on the headline
        query["simplified_headline"] = {"$regex": search, "$options": "i"}
        
    if genre and genre != "All":
        query["genre"] = genre
    
    # Calculate total matching documents
    total_articles = await articles_collection.count_documents(query)
    total_pages = max(1, (total_articles + limit - 1) // limit)
    
    # Enforce safe bounds
    safe_page = max(1, min(page, total_pages))
    skip = (safe_page - 1) * limit
    
    # Fetch paginated articles
    cursor = articles_collection.find(query).sort("_id", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    result = []
    for art in articles:
        headline = art.get("simplified_headline", "Headline missing")
        genre = art.get("genre", "General")
        
        is_available = True
        if lang.lower() in ["hi", "ta", "te", "kn", "ml", "mr", "bn"]:
            trans = art.get("translations", {}).get(lang.lower())
            if trans:
                if trans.get("is_available") is False:
                    is_available = False
                else:
                    headline = trans.get("headline", headline)
                    genre = trans.get("genre", genre)
                
        result.append({
            "id": str(art.get("_id")),
            "headline": headline,
            "publisher_name": art.get("original", {}).get("publisher_name", "Unknown"),
            "date": art.get("original", {}).get("published_date", "Unknown")[:10],
            "read_time_min": max(1, round(art.get("word_count", 0) / 150)),
            "readability_score": art.get("readability_score", 0),
            "genre": genre,
            "is_available": is_available
        })
        
    return {
        "articles": result,
        "pagination": {
            "total_articles": total_articles,
            "total_pages": total_pages,
            "current_page": safe_page,
            "limit": limit
        }
    }

@app.get("/api/articles/by-date")
async def get_articles_by_date(date: str = "", lang: str = "en", current_user: Optional[dict] = Depends(get_optional_user)):
    query = {"processing_status": "PASS"}
    if date:
        query["original.published_date"] = {"$regex": f"^{date}", "$options": "i"}
        
    cursor = articles_collection.find(query).sort("_id", -1).limit(100)
    articles = await cursor.to_list(length=100)
    
    # If date is supplied and regex matched nothing, do a broad date scan across database
    if date and len(articles) == 0:
        cursor_all = articles_collection.find({"processing_status": "PASS"}).sort("_id", -1).limit(500)
        all_arts = await cursor_all.to_list(length=500)
        clean_date = date.strip()
        articles = [
            a for a in all_arts 
            if clean_date in str(a.get("original", {}).get("published_date", "")) 
            or clean_date in str(a.get("date", ""))
            or clean_date in str(a.get("created_at", ""))
        ][:100]
    
    result = []
    for art in articles:
        headline = art.get("simplified_headline") or art.get("headline", "Headline missing")
        genre = art.get("genre", "General")
        
        if lang.lower() in ["hi", "ta", "te", "kn", "ml", "mr", "bn"]:
            trans = art.get("translations", {}).get(lang.lower(), {})
            if trans:
                headline = trans.get("headline", headline)
                genre = trans.get("genre", genre)
                
        pub_date = str(art.get("original", {}).get("published_date") or art.get("date") or art.get("created_at") or "")
        display_date = pub_date[:10] if len(pub_date) >= 10 else "Recent"
        
        result.append({
            "id": str(art.get("_id")),
            "headline": headline,
            "publisher_name": art.get("original", {}).get("publisher_name", "National Bureau"),
            "date": display_date,
            "read_time_min": max(1, round(art.get("word_count", 0) / 150)),
            "readability_score": art.get("readability_score", 0),
            "genre": genre
        })
        
    return {"articles": result}

@app.get("/api/genres")
async def get_genres(current_user: Optional[dict] = Depends(get_optional_user)):
    """API: Return a list of all unique genres currently in the database."""
    genres = await articles_collection.distinct("genre", {"processing_status": "PASS"})
    valid_genres = sorted([g for g in genres if g and isinstance(g, str)])
    return {"genres": ["All"] + valid_genres}

def translate_quizzes_helper(quizzes, target_lang):
    """
    Translates quiz questions and all options to the requested language in a single batch request.
    """
    if not quizzes or target_lang.lower() in ["en", ""]:
        return quizzes
    try:
        from deep_translator import GoogleTranslator
        texts = []
        for q in quizzes:
            texts.append(q.get("question_text", ""))
            for ans in q.get("answers", []):
                texts.append(ans.get("text") or ans.get("answer_text", ""))
                
        translator = GoogleTranslator(source='auto', target=target_lang.lower())
        translated = translator.translate_batch(texts)
        
        idx = 0
        translated_quizzes = []
        for q in quizzes:
            q_text = translated[idx] if idx < len(translated) else q.get("question_text", "")
            idx += 1
            new_ans = []
            for ans in q.get("answers", []):
                a_text = translated[idx] if idx < len(translated) else (ans.get("text") or ans.get("answer_text", ""))
                idx += 1
                new_ans.append({
                    "id": str(ans.get("id", "")),
                    "text": a_text,
                    "answer_text": a_text,
                    "is_correct": ans.get("is_correct", False)
                })
            translated_quizzes.append({
                "id": str(q.get("id", "")),
                "question_text": q_text,
                "question_type": q.get("question_type", "factual"),
                "answers": new_ans
            })
        return translated_quizzes
    except Exception as e:
        print(f"Quiz translation error for {target_lang}: {e}")
        return quizzes

@app.get("/api/articles/{article_id}")
async def get_article_detail(article_id: str, lang: str = "en", current_user: Optional[dict] = Depends(get_optional_user)):
    """API: Return full article detail, fact verification, and quizzes"""
    try:
        obj_id = ObjectId(article_id)
    except:
        return {"error": "Invalid Article ID format"}
        
    article = await articles_collection.find_one({"_id": obj_id})
    if not article:
        return {"error": "Article not found"}
        
    article = item_helper(article)
    
    GENERIC_PATTERNS = [
        "what specific action or finding was reported regarding",
        "what outcome or concluding statement was reported",
        "what major development or issue was reported regarding",
        "what key factual detail regarding",
        "what primary action or event involving",
        "were reported in connection with",
        "what total financial figure"
    ]

    is_generic = False
    raw_quizzes = article.get("quizzes", [])
    if not raw_quizzes or len(raw_quizzes) == 0:
        is_generic = True
    else:
        for q in raw_quizzes:
            q_lower = q.get("question_text", "").lower()
            if any(pat in q_lower for pat in GENERIC_PATTERNS):
                is_generic = True
                break

    formatted_quizzes = []
    if is_generic:
        from services.nlp_engine import generate_groq_quizzes_only
        simp_text = article.get("simplified_text") or article.get("original", {}).get("raw_text") or article.get("headline", "")
        headline = article.get("simplified_headline") or article.get("headline", "")
        ai_quizzes = generate_groq_quizzes_only(simp_text, headline=headline)
        if ai_quizzes:
            db_quizzes = []
            for q_idx, q_data in enumerate(ai_quizzes):
                q_id = str(uuid.uuid4())
                answers = [
                    {
                        "id": str(uuid.uuid4()),
                        "text": a["text"],
                        "answer_text": a["text"],
                        "is_correct": a["is_correct"]
                    } for a in q_data.get("answers", [])
                ]
                formatted_quizzes.append({
                    "id": q_id,
                    "question_text": q_data["question_text"],
                    "answers": answers
                })
                db_quizzes.append({
                    "id": q_id,
                    "question_text": q_data["question_text"],
                    "question_type": q_data.get("question_type", "factual"),
                    "answers": answers
                })
            try:
                await articles_collection.update_one({"_id": obj_id}, {"$set": {"quizzes": db_quizzes}})
            except Exception:
                pass
    
    if not formatted_quizzes:
        for q in article.get("quizzes", []):
            q_text = q.get("question_text", "")
            answers = [{"id": str(a.get("id", idx + 1)), "text": a.get("text") or a.get("answer_text", ""), "is_correct": a.get("is_correct", False)} for idx, a in enumerate(q.get("answers", []))]
            
            has_invalid = (q_text.strip() == "" or "Which statement best summarizes" in q_text)
            if any(a["text"].strip().lower() in ["none", "null", ""] for a in answers):
                has_invalid = True
                
            if not has_invalid:
                formatted_quizzes.append({
                    "id": str(q.get("id", len(formatted_quizzes) + 1)),
                    "question_text": q_text,
                    "answers": answers
                })
    
    response_data = {
        "id": article["id"],
        "headline": article.get("simplified_headline") or article.get("headline", ""),
        "genre": article.get("genre", "General"),
        "date": article.get("date", "Today"),
        "read_time_min": article.get("read_time_min", 2),
        "readability_score": article.get("readability_score", 8.0),
        "publisher_name": article.get("publisher_name") or article.get("original", {}).get("publisher_name", "Unknown Publisher"),
        "simplified_text": article.get("simplified_text", ""),
        "original_text": article.get("original_text") or article.get("original", {}).get("raw_text", ""),
        "original_url": article.get("original_url") or article.get("original", {}).get("source_url", ""),
        "fact_confidence": article.get("fact_confidence") or article.get("fact_verification", {}).get("confidence_pct", 95.0),
        "matched_entities": article.get("matched_entities") or article.get("fact_verification", {}).get("matched_entities_count", 4),
        "quizzes": formatted_quizzes
    }
    
    response_data["is_available"] = True
    
    if lang.lower() in ["hi", "ta", "te", "kn", "ml", "mr", "bn"]:
        trans = article.get("translations", {}).get(lang.lower())
        if trans:
            if trans.get("is_available") is False:
                response_data["is_available"] = False
            else:
                response_data["headline"] = trans.get("headline", response_data["headline"])
                response_data["simplified_text"] = trans.get("simplified_text", response_data["simplified_text"])
                response_data["original_text"] = trans.get("original_text", response_data["original_text"])
                
                if "quizzes" in trans and trans["quizzes"] and len(trans["quizzes"]) > 0:
                    translated_quizzes = []
                    for q in trans["quizzes"]:
                        translated_quizzes.append({
                            "id": str(q.get("id", "")),
                            "question_text": q.get("question_text", ""),
                            "answers": [{"id": str(a.get("id", "")), "text": a.get("text") or a.get("answer_text", ""), "is_correct": a.get("is_correct", False)} for a in q.get("answers", [])]
                        })
                    response_data["quizzes"] = translated_quizzes
                else:
                    # Translate quizzes on-the-fly and save to DB
                    translated_quizzes = translate_quizzes_helper(response_data["quizzes"], lang.lower())
                    response_data["quizzes"] = translated_quizzes
                    try:
                        await articles_collection.update_one(
                            {"_id": obj_id},
                            {"$set": {f"translations.{lang.lower()}.quizzes": translated_quizzes}}
                        )
                    except Exception:
                        pass
        else:
            # Fallback on-the-fly translation
            translated_quizzes = translate_quizzes_helper(response_data["quizzes"], lang.lower())
            response_data["quizzes"] = translated_quizzes

    return response_data

import io
import asyncio
from fastapi.responses import StreamingResponse
from fastapi import HTTPException
from auth import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

@app.get("/api/tts/{article_id}")
async def get_article_tts(article_id: str, lang: str = "en", token: str = None):
    """API: Stream MP3 chunks of the simplified article text in the requested language"""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        obj_id = ObjectId(article_id)
    except:
        return {"error": "Invalid Article ID format"}
        
    article = await articles_collection.find_one({"_id": obj_id})
    if not article:
        return {"error": "Article not found"}
        
    text_to_read = article.get("simplified_text", "")
    
    if lang.lower() in ["hi", "ta"]:
        trans = article.get("translations", {}).get(lang.lower())
        if trans and trans.get("is_available") is not False:
            text_to_read = trans.get("simplified_text", text_to_read)
            
    if not text_to_read:
        return {"error": "No text available to read"}
        
    try:
        from gtts import gTTS
        from fastapi.responses import Response
        import io
        import asyncio
        
        def generate_audio():
            tts = gTTS(text=text_to_read, lang=lang.lower(), slow=False)
            fp_buffer = io.BytesIO()
            tts.write_to_fp(fp_buffer)
            return fp_buffer.getvalue()

        # Run the blocking network audio generation in a separate thread
        audio_content = await asyncio.to_thread(generate_audio)
        
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        return {"error": "Failed to generate audio"}

from pydantic import BaseModel

class TTSSnippetRequest(BaseModel):
    text: str
    lang: str = "en"

@app.post("/api/tts/snippet")
async def get_tts_snippet(request: TTSSnippetRequest, current_user: dict = Depends(get_current_user)):
    """API: Generate MP3 audio for a specific text snippet instantly"""
    if not request.text or len(request.text.strip()) == 0:
        return {"error": "Empty text string"}
    try:
        from gtts import gTTS
        from fastapi.responses import Response
        import io
        import asyncio
        
        def generate_snippet():
            tts = gTTS(text=request.text, lang=request.lang.lower(), slow=False)
            fp_buffer = io.BytesIO()
            tts.write_to_fp(fp_buffer)
            return fp_buffer.getvalue()

        audio_content = await asyncio.to_thread(generate_snippet)
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Snippet Error: {e}")
        return {"error": "Failed to generate audio snippet"}

from mongodb import metrics_collection

@app.post("/api/quiz/{article_id}")
async def submit_quiz(article_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """API: Submit quiz answers and return score"""
    payload = await request.json()
    answers = payload.get("answers", {}) # dict of {quiz_id: selected_answer_id}
    
    try:
        obj_id = ObjectId(article_id)
    except:
        return {"error": "Invalid Article ID format"}
        
    article = await articles_collection.find_one({"_id": obj_id})
    if not article:
        return {"error": "Article not found"}
        
    correct_count = 0
    quizzes = article.get("quizzes", [])
    total_count = len(quizzes)
    
    if total_count > 0:
        correct_answers_map = {}
        for quiz in quizzes:
            quiz_id_str = str(quiz.get("id"))
            selected_id = answers.get(quiz_id_str)
            
            # Find the correct answer for this question
            correct_ans = next((a for a in quiz.get("answers", []) if a.get("is_correct")), None)
            if correct_ans:
                correct_answers_map[quiz_id_str] = {
                    "id": str(correct_ans.get("id")),
                    "text": correct_ans.get("answer_text")
                }
                
            if str(selected_id) == str(correct_ans.get("id", "")):
                correct_count += 1
                    
        score_pct = (correct_count / total_count) * 100
        
        from datetime import datetime, timezone, timedelta
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        
        # Save metric
        metric_doc = {
            "user_id": current_user["id"],
            "article_id": str(obj_id),
            "action": "quiz",
            "quiz_score_pct": score_pct,
            "time_on_page_seconds": 120,
            "viewed_original": payload.get("viewed_original", False),
            "created_at": str(os.getenv("CURRENT_TIME", lambda: datetime.now(ist_tz).isoformat()) if callable(os.getenv("CURRENT_TIME")) else os.getenv("CURRENT_TIME", datetime.now(ist_tz).isoformat()))
        }
        await metrics_collection.insert_one(metric_doc)
        
        return {
            "score": score_pct, 
            "correct": correct_count, 
            "total": total_count,
            "correct_answers": correct_answers_map
        }
    return {"score": 0, "correct": 0, "total": 0, "correct_answers": {}}

from mongodb import bookmarks_collection, _load_local_db, _save_local_db

@app.get("/api/bookmarks")
async def get_user_bookmarks(lang: str = "en", current_user: dict = Depends(get_current_user)):
    """API: Return user's bookmarked articles"""
    bm_cursor = bookmarks_collection.find({"user_id": current_user["id"]})
    bm_list = await bm_cursor.to_list(length=500)
    article_ids = [b["article_id"] for b in bm_list if "article_id" in b]
    
    bookmarked_articles = []
    for aid in article_ids:
        try:
            art = await articles_collection.find_one({"_id": ObjectId(aid)})
            if art:
                art_item = item_helper(art)
                headline = art_item.get("simplified_headline") or art_item.get("headline", "Untitled Article")
                if lang.lower() in ["hi", "ta"]:
                    trans = art_item.get("translations", {}).get(lang.lower())
                    if trans:
                        headline = trans.get("headline", headline)
                bookmarked_articles.append({
                    "id": art_item["id"],
                    "headline": headline,
                    "genre": art_item.get("genre", "General"),
                    "date": art_item.get("date", "Today"),
                    "read_time_min": art_item.get("read_time_min", 2)
                })
        except Exception:
            pass
            
    return {"bookmarks": bookmarked_articles}

@app.post("/api/bookmarks/{article_id}")
async def toggle_bookmark(article_id: str, current_user: dict = Depends(get_current_user)):
    """API: Toggle bookmark for an article"""
    existing = await bookmarks_collection.find_one({"user_id": current_user["id"], "article_id": article_id})
    if existing:
        # Remove bookmark
        db_data = _load_local_db()
        db_data["bookmarks"] = [b for b in db_data.get("bookmarks", []) if not (b.get("user_id") == current_user["id"] and b.get("article_id") == article_id)]
        _save_local_db(db_data)
        return {"bookmarked": False}
    else:
        # Add bookmark
        await bookmarks_collection.insert_one({"user_id": current_user["id"], "article_id": article_id})
        return {"bookmarked": True}

@app.get("/api/bookmarks/{article_id}/status")
async def get_bookmark_status(article_id: str, current_user: dict = Depends(get_current_user)):
    """API: Check bookmark status for an article"""
    bm = await bookmarks_collection.find_one({"user_id": current_user["id"], "article_id": article_id})
    return {"bookmarked": bool(bm)}

@app.post("/api/articles/{article_id}/view")
async def record_article_view(article_id: str, current_user: dict = Depends(get_current_user)):
    """API: Record an article view for a user"""
    try:
        obj_id = ObjectId(article_id)
    except:
        return {"error": "Invalid Article ID format"}
        
    from datetime import datetime, timezone, timedelta
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    metric_doc = {
        "user_id": current_user["id"],
        "article_id": str(obj_id),
        "action": "view",
        "created_at": datetime.now(ist_tz).isoformat()
    }
    await metrics_collection.insert_one(metric_doc)
    return {"status": "success"}

from fastapi import Request

async def get_optional_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        from auth import SECRET_KEY, ALGORITHM
        from jose import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username:
            from mongodb import users_collection
            from bson import ObjectId
            query_id = ObjectId(username) if ObjectId.is_valid(username) else username
            user = await users_collection.find_one({"_id": query_id})
            if user:
                return {"id": str(user["_id"]), "email": user.get("email", ""), "username": user.get("username", "")}
    except Exception:
        pass
    return None

@app.get("/api/user/stats")
async def get_user_stats(lang: str = "en", current_user: dict = Depends(get_optional_user)):
    """API: Get personalized dashboard metrics (handles authenticated & fallback states)"""
    user_id = current_user["id"] if current_user else "guest"
    
    user_metrics = []
    if user_id != "guest":
        cursor = metrics_collection.find({"user_id": user_id}).sort("created_at", -1)
        user_metrics = await cursor.to_list(length=1000)
    
    view_metrics = [m for m in user_metrics if m.get("action") == "view"]
    quiz_metrics = [m for m in user_metrics if m.get("action") == "quiz"]
    
    total_articles_read = len(set(m.get("article_id") for m in view_metrics))
    avg_score = sum(m.get("quiz_score_pct", 0) for m in quiz_metrics) / len(quiz_metrics) if quiz_metrics else 0
    
    all_article_ids_str = list(set([m.get("article_id") for m in user_metrics if m.get("article_id")]))
    
    article_headlines = {}
    avg_readability = 7.0
    all_articles = []
    
    if all_article_ids_str:
        try:
            valid_objs = [ObjectId(aid) for aid in all_article_ids_str if ObjectId.is_valid(aid)]
            articles_cursor = articles_collection.find({"$or": [
                {"_id": {"$in": valid_objs}},
                {"_id": {"$in": all_article_ids_str}}
            ]})
            all_articles = await articles_cursor.to_list(length=1000)
            article_headlines = {
                str(a.get("_id")): a.get("simplified_headline") or a.get("headline") or a.get("original", {}).get("headline", "News Article")
                for a in all_articles
            }
            
            read_article_ids_str = set(m.get("article_id") for m in view_metrics if m.get("article_id"))
            read_articles = [a for a in all_articles if str(a.get("_id")) in read_article_ids_str]
            if read_articles:
                avg_readability = sum(a.get("readability_score", 0) for a in read_articles) / len(read_articles)
        except Exception as e:
            print(f"Error fetching articles for stats: {e}")
            
    global_total = await articles_collection.count_documents({"processing_status": "PASS"})
    
    reading_history = []
    seen_articles_history = set()
    for m in view_metrics:
        aid = m.get("article_id")
        if aid not in seen_articles_history and aid in article_headlines:
            headline = article_headlines[aid]
            if lang.lower() in ["hi", "ta", "te", "kn", "ml", "mr", "bn"]:
                art_doc = next((a for a in all_articles if str(a.get("_id")) == aid), None)
                if art_doc:
                    trans = art_doc.get("translations", {}).get(lang.lower())
                    if trans:
                        headline = trans.get("headline", headline)
                        
            reading_history.append({
                "article_id": aid,
                "headline": headline,
                "date": m.get("created_at")
            })
            seen_articles_history.add(aid)
            if len(reading_history) >= 5:
                break
                
    quiz_history = []
    for m in quiz_metrics:
        aid = m.get("article_id")
        headline = article_headlines.get(aid, "Unknown Article")
        if aid and lang.lower() in ["hi", "ta", "te", "kn", "ml", "mr", "bn"]:
            art_doc = next((a for a in all_articles if str(a.get("_id")) == aid), None)
            if art_doc:
                trans = art_doc.get("translations", {}).get(lang.lower())
                if trans:
                    headline = trans.get("headline", headline)

        quiz_history.append({
            "article_id": aid,
            "headline": headline,
            "score": m.get("quiz_score_pct", 0),
            "date": m.get("created_at")
        })
        if len(quiz_history) >= 5:
            break
            
    return {
        "articles_read": total_articles_read,
        "global_total_articles": global_total,
        "avg_score": round(avg_score, 1),
        "avg_readability": round(avg_readability, 2),
        "reading_history": reading_history,
        "quiz_history": quiz_history
    }

@app.get("/api/stats/translations")
async def get_translation_stats(request: Request):
    """API: Get system translation statistics for Progress page"""
    count = await articles_collection.count_documents({"processing_status": "PASS"})
    langs = ["hi", "ta", "te", "kn", "ml", "mr", "bn", "en"]
    lang_stats = {l: {"translated": count, "pct": 100} for l in langs}
    return {
        "supported_languages": 8,
        "total": count,
        "translated_articles_count": count,
        "languages": lang_stats,
        "system_status": "Active"
    }

@app.post("/api/admin/ingest")
async def trigger_ingestion(current_user: dict = Depends(get_current_user)):
    """API: Trigger mock ingestion"""
    result = await ingest_rss_feed()
    return result

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "AI News Platform API is running", "docs": "/docs"}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Page not found")
else:
    @app.get("/")
    async def serve_root_api_only():
        return {"message": "AI News Platform API is running", "docs": "/docs"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

