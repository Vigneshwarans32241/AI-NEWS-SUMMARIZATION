import asyncio
from deep_translator import GoogleTranslator

async def test():
    translator = GoogleTranslator(source='auto', target='hi')
    try:
        res = await asyncio.to_thread(translator.translate_batch, ["Hello World", "Technology"])
        for r in res:
            print(f"Success: {r}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
