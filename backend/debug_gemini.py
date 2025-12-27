import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.gemini import gemini_client
from app.config import get_settings

async def main():
    try:
        settings = get_settings()
        print(f"API Key loaded: {'Yes' if settings.GEMINI_API_KEY else 'No'}")
        
        # Test with a 20 question payload to simulate stress
        print("Attempting generation of 20 questions...")
        data = await gemini_client.generate_questions(
            subject="Mathematics",
            topic="Algebra",
            difficulty="medium",
            class_level=12,
            count=20
        )
        
        if data:
            print(f"Success! Generated {len(data)} questions.")
        else:
            print("Failed: Returned empty data")
            
    except Exception as e:
        print(f"CRITICAL FAILURE: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
