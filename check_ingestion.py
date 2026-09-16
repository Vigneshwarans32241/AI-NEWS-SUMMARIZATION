import asyncio
from mongodb import articles_collection

async def main():
    print("Checking database for ingested articles...")
    count = await articles_collection.count_documents({})
    print(f"Total articles in DB: {count}")
    
    print("\nLatest 5 articles:")
    latest = await articles_collection.find().sort("created_at", -1).limit(5).to_list(length=5)
    for art in latest:
        original = art.get('original', {})
        print(f"- Headline: {art.get('simplified_headline', 'Unknown')}")
        print(f"  Source: {original.get('publisher_name', 'Unknown')}")
        print(f"  Created at: {art.get('created_at', 'Unknown')}")
        print(f"  Status: {art.get('processing_status', 'Unknown')}")

if __name__ == "__main__":
    asyncio.run(main())
