import asyncio
from services.ingestion import ingest_rss_feed
from database import SessionLocal

async def test_ingestion():
    result = await ingest_rss_feed()
    print(f"Ingestion result: {result}")

if __name__ == "__main__":
    asyncio.run(test_ingestion())
