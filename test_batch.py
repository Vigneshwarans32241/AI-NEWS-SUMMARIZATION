import asyncio
from deep_translator import GoogleTranslator

async def test():
    translator = GoogleTranslator(source='auto', target='hi')
    texts = [f"This is test string number {i}" for i in range(20)]
    try:
        res = await asyncio.to_thread(translator.translate_batch, texts)
        print(f"Success, got {len(res)} translations")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
