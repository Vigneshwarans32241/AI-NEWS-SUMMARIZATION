import asyncio
from mongodb import articles_collection

async def check_stats():
    total = await articles_collection.count_documents({})
    passed = await articles_collection.count_documents({"processing_status": "PASS"})
    failed = await articles_collection.count_documents({"processing_status": "FAIL"})
    
    print(f"Total Documents: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    # Check distinct statuses
    statuses = await articles_collection.distinct("processing_status")
    print(f"Distinct Statuses: {statuses}")
    
    # List a few failed reasons if any
    if failed > 0:
        print("\nRecent Failures:")
        cursor = articles_collection.find({"processing_status": "FAIL"}).sort("created_at", -1).limit(5)
        async for doc in cursor:
            print(f"- {doc.get('simplified_headline', 'No Headline')} | Reason: {doc.get('simplified_text', 'No Text')[:50]}...")

if __name__ == "__main__":
    asyncio.run(check_stats())
