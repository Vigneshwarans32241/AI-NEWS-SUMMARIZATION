import asyncio
from mongodb import articles_collection

async def main():
    with open('result_clean.txt', 'w', encoding='utf-8') as f:
        count = await articles_collection.count_documents({})
        f.write(f"Total articles in DB: {count}\n\n")
        f.write("Latest 5 articles:\n")
        latest = await articles_collection.find().sort("created_at", -1).limit(5).to_list(length=5)
        for art in latest:
            original = art.get('original', {})
            f.write(f"- Headline: {art.get('simplified_headline', 'Unknown')}\n")
            f.write(f"  Source: {original.get('publisher_name', 'Unknown')}\n")
            f.write(f"  Created at: {art.get('created_at', 'Unknown')}\n")
            f.write(f"  Status: {art.get('processing_status', 'Unknown')}\n\n")

if __name__ == "__main__":
    asyncio.run(main())
