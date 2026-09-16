import asyncio
from mongodb import articles_collection
import json
from bson import json_util

async def test_db():
    doc = await articles_collection.find_one({}, sort=[("_id", -1)])
    if doc:
        print(f"Latest Headline: {doc.get('simplified_headline')}")
        trans = doc.get("translations")
        if trans:
            print("Translations Object exists:")
            for lang, data in trans.items():
                print(f"  {lang.upper()}: Headline='{data.get('headline', 'N/A')}', Genre='{data.get('genre', 'N/A')}', Quizzes={len(data.get('quizzes', []))}")
                
                if data.get('quizzes'):
                    print(f"       Q1: {data['quizzes'][0].get('question_text')}")
        else:
            print("No translations found :(")
    else:
        print("No articles found.")

if __name__ == "__main__":
    asyncio.run(test_db())
